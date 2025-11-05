import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const job = await db.eTLJob.findUnique({
      where: { id: params.id },
      include: {
        source: true,
        target: true
      }
    })

    if (!job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      )
    }

    if (!job.isActive) {
      return NextResponse.json(
        { error: 'Job is not active' },
        { status: 400 }
      )
    }

    // Create job execution record
    const execution = await db.jobExecution.create({
      data: {
        jobId: params.id,
        status: 'RUNNING',
        startedAt: new Date()
      }
    })

    // Update job status and last run time
    await db.eTLJob.update({
      where: { id: params.id },
      data: {
        status: 'RUNNING',
        lastRun: new Date()
      }
    })

    // Start async job execution (in production, this would be a background job)
    executeJobAsync(execution.id, job)

    return NextResponse.json({ 
      message: 'Job started successfully',
      executionId: execution.id 
    })
  } catch (error) {
    console.error('Error starting job:', error)
    return NextResponse.json(
      { error: 'Failed to start job' },
      { status: 500 }
    )
  }
}

async function executeJobAsync(executionId: string, job: any) {
  try {
    // Simulate job execution with progress updates
    const totalRecords = Math.floor(Math.random() * 10000) + 1000
    const batchSize = 100
    let processedRecords = 0
    let successRecords = 0
    let failedRecords = 0

    // Create initial log entry
    await db.syncLog.create({
      data: {
        sourceId: job.sourceId,
        jobId: job.id,
        level: 'INFO',
        message: `Starting job execution: ${job.name}`,
        details: JSON.stringify({ executionId, totalRecords })
      }
    })

    // Simulate processing batches
    for (let i = 0; i < totalRecords; i += batchSize) {
      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 100))

      const batchRecords = Math.min(batchSize, totalRecords - i)
      processedRecords += batchRecords
      
      // Simulate some failures
      const batchFailures = Math.floor(Math.random() * 5)
      successRecords += (batchRecords - batchFailures)
      failedRecords += batchFailures

      // Update execution progress
      const progress = Math.round((processedRecords / totalRecords) * 100)
      
      await db.jobExecution.update({
        where: { id: executionId },
        data: {
          recordsProcessed: processedRecords,
          recordsSuccess: successRecords,
          recordsFailed: failedRecords
        }
      })

      // Log progress
      if (i % (batchSize * 10) === 0) {
        await db.syncLog.create({
          data: {
            sourceId: job.sourceId,
            jobId: job.id,
            level: 'INFO',
            message: `Processed ${processedRecords}/${totalRecords} records (${progress}%)`,
            details: JSON.stringify({ 
              executionId, 
              processedRecords, 
              successRecords, 
              failedRecords,
              progress 
            })
          }
        })
      }
    }

    // Complete execution
    const finalStatus = failedRecords > totalRecords * 0.1 ? 'FAILED' : 'COMPLETED'
    
    await db.jobExecution.update({
      where: { id: executionId },
      data: {
        status: finalStatus,
        completedAt: new Date(),
        recordsProcessed: processedRecords,
        recordsSuccess: successRecords,
        recordsFailed: failedRecords,
        errorMessage: finalStatus === 'FAILED' ? 'High failure rate detected' : null
      }
    })

    await db.eTLJob.update({
      where: { id: job.id },
      data: {
        status: finalStatus,
        // Calculate next run time if job is scheduled
        ...(job.schedule && {
          nextRun: new Date(Date.now() + 60 * 60 * 1000) // 1 hour from now
        })
      }
    })

    // Log completion
    await db.syncLog.create({
      data: {
        sourceId: job.sourceId,
        jobId: job.id,
        level: finalStatus === 'FAILED' ? 'ERROR' : 'INFO',
        message: `Job ${finalStatus.toLowerCase()}: ${job.name}`,
        details: JSON.stringify({ 
          executionId, 
          totalRecords: processedRecords,
          successRecords,
          failedRecords,
          duration: Date.now() - new Date().getTime()
        })
      }
    })

  } catch (error) {
    console.error('Job execution failed:', error)
    
    // Update execution with error
    await db.jobExecution.update({
      where: { id: executionId },
      data: {
        status: 'FAILED',
        completedAt: new Date(),
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      }
    })

    await db.eTLJob.update({
      where: { id: job.id },
      data: { status: 'FAILED' }
    })

    // Log error
    await db.syncLog.create({
      data: {
        sourceId: job.sourceId,
        jobId: job.id,
        level: 'ERROR',
        message: `Job execution failed: ${job.name}`,
        details: JSON.stringify({ 
          executionId, 
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    })
  }
}