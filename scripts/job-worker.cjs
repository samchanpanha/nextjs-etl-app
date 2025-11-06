#!/usr/bin/env node
/*
  Background job worker (CommonJS) for ETL job execution.
  - Reads EXECUTION_ID and JOB_ID from env
  - Processes records in batches with configurable concurrency
  - Consolidates DB updates to reduce write pressure
  - Marks execution as COMPLETED or FAILED and logs details

  Env/configurable params:
    EXECUTION_ID - required
    JOB_ID - required
    BATCH_SIZE - default 1000
    CONCURRENCY - default 4
    PROGRESS_UPDATE_MS - default 2000
    FAILURE_RATE - simulated failure rate per record (0-1), default 0.001
    FAILURE_THRESHOLD_PERCENT - percent of failures to mark job FAILED (default 10)
    MAX_RETRIES - retry count for transient batch errors (default 3)
*/

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

const ms = (n) => new Promise((r) => setTimeout(r, n))

async function main() {
  const executionId = process.env.EXECUTION_ID || process.argv[2]
  const jobId = process.env.JOB_ID || process.argv[3]

  if (!executionId || !jobId) {
    console.error('EXECUTION_ID and JOB_ID are required')
    process.exit(2)
  }

  const BATCH_SIZE = parseInt(process.env.BATCH_SIZE || '1000', 10)
  const CONCURRENCY = Math.max(1, parseInt(process.env.CONCURRENCY || '4', 10))
  const PROGRESS_UPDATE_MS = parseInt(process.env.PROGRESS_UPDATE_MS || '2000', 10)
  const FAILURE_RATE = parseFloat(process.env.FAILURE_RATE || '0.001')
  const FAILURE_THRESHOLD_PERCENT = parseFloat(process.env.FAILURE_THRESHOLD_PERCENT || '10')
  const MAX_RETRIES = parseInt(process.env.MAX_RETRIES || '3', 10)

  try {
    const job = await prisma.eTLJob.findUnique({ where: { id: jobId } })
    const execution = await prisma.jobExecution.findUnique({ where: { id: executionId } })

    if (!job || !execution) {
      console.error('Job or execution record not found', { jobId, executionId })
      process.exit(3)
    }

    // Determine total records. Prefer env override for reproducible testing.
    let totalRecords = parseInt(process.env.TOTAL_RECORDS || '0', 10)
    if (!totalRecords || totalRecords <= 0) {
      // Fallback heuristic: if job.query exists, try to estimate (placeholder)
      totalRecords = Math.floor(Math.random() * 100000) + 5000
    }

    console.info(`Worker started for job ${jobId} execution ${executionId}. totalRecords=${totalRecords} batchSize=${BATCH_SIZE} concurrency=${CONCURRENCY}`)

    let processedRecords = 0
    let successRecords = 0
    let failedRecords = 0

    let lastFlush = Date.now()

    // Helper to flush progress to DB periodically or when called
    const flushProgress = async () => {
      try {
        await prisma.jobExecution.update({
          where: { id: executionId },
          data: {
            recordsProcessed: processedRecords,
            recordsSuccess: successRecords,
            recordsFailed: failedRecords
          }
        })
      } catch (err) {
        console.error('Failed to flush progress', err)
      }
    }

    // Simple pool to process a single batch
    const processBatch = async (batchStart, batchSize, attempt = 0) => {
      try {
        // Simulate per-batch processing time tuned to batch size
        const simulatedTime = Math.min(5000, Math.max(50, Math.round((batchSize / 1000) * 200)))
        await ms(simulatedTime)

        // Simulate per-record failures using FAILURE_RATE
        let localFailures = 0
        for (let i = 0; i < batchSize; i++) {
          if (Math.random() < FAILURE_RATE) localFailures++
        }

        const successes = batchSize - localFailures
        processedRecords += batchSize
        successRecords += successes
        failedRecords += localFailures

        // Emit occasional log entries in DB for audit
        if (batchStart % (BATCH_SIZE * 10) === 0) {
          await prisma.syncLog.create({
            data: {
              sourceId: job.sourceId,
              jobId: job.id,
              level: 'INFO',
              message: `Processed ${processedRecords}/${totalRecords} records`,
              details: JSON.stringify({ executionId, processedRecords, successRecords, failedRecords })
            }
          })
        }

        return true
      } catch (err) {
        if (attempt < MAX_RETRIES) {
          const backoff = 100 * Math.pow(2, attempt)
          console.warn(`Batch failed, retrying attempt=${attempt + 1} backoff=${backoff}`, err)
          await ms(backoff)
          return processBatch(batchStart, batchSize, attempt + 1)
        }
        console.error('Batch processing failed after retries', err)
        return false
      }
    }

    // Worker loop using limited concurrency
    const batchStarts = []
    for (let i = 0; i < totalRecords; i += BATCH_SIZE) batchStarts.push(i)

    let running = 0
    let idx = 0
    let stopRequested = false

    const runNext = async () => {
      if (stopRequested) return
      if (idx >= batchStarts.length) return
      const start = batchStarts[idx++] // post-increment
      running++
      const size = Math.min(BATCH_SIZE, totalRecords - start)
      try {
        const ok = await processBatch(start, size)
        if (!ok) {
          // mark as failed and request stop
          stopRequested = true
        }
      } finally {
        running--
      }
    }

    // Kick off initial pool
    const promises = []
    for (let i = 0; i < CONCURRENCY; i++) {
      promises.push((async () => {
        while (!stopRequested && idx < batchStarts.length) {
          await runNext()
        }
      })())
    }

    // Progress flusher interval
    const flusher = setInterval(async () => {
      await flushProgress()
    }, PROGRESS_UPDATE_MS)

    // Wait for all to complete
    await Promise.all(promises)

    clearInterval(flusher)

    // Final flush
    await flushProgress()

    // Determine final status
    const failurePercent = (failedRecords / Math.max(1, processedRecords)) * 100
    const finalStatus = failurePercent > FAILURE_THRESHOLD_PERCENT ? 'FAILED' : 'COMPLETED'

    await prisma.jobExecution.update({
      where: { id: executionId },
      data: {
        status: finalStatus,
        completedAt: new Date(),
        recordsProcessed: processedRecords,
        recordsSuccess: successRecords,
        recordsFailed: failedRecords,
        errorMessage: finalStatus === 'FAILED' ? `High failure rate: ${failurePercent.toFixed(2)}%` : null
      }
    })

    await prisma.eTLJob.update({
      where: { id: job.id },
      data: {
        status: finalStatus,
        ...(job.schedule ? { nextRun: new Date(Date.now() + 60 * 60 * 1000) } : {})
      }
    })

    // Audit log
    await prisma.syncLog.create({
      data: {
        sourceId: job.sourceId,
        jobId: job.id,
        level: finalStatus === 'FAILED' ? 'ERROR' : 'INFO',
        message: `Job ${finalStatus.toLowerCase()}: ${job.name}`,
        details: JSON.stringify({ executionId, totalRecords: processedRecords, successRecords, failedRecords, durationMs: Date.now() - execution.startedAt.getTime() })
      }
    })

    console.info(`Worker finished: execution=${executionId} status=${finalStatus} processed=${processedRecords} failed=${failedRecords}`)
    process.exit(0)
  } catch (err) {
    console.error('Worker top-level error', err)
    try {
      await prisma.jobExecution.update({ where: { id: executionId }, data: { status: 'FAILED', completedAt: new Date(), errorMessage: String(err) } })
    } catch (e) {
      console.error('Failed to update execution after fatal error', e)
    }
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
