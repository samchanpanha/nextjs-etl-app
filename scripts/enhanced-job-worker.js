/**
 * Enhanced Banking-Grade Job Worker
 * Integrates circuit breakers, transaction integrity, and robust error handling
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

// Import the enhanced transaction manager (we'll use a simple implementation here)
class EnhancedJobWorker {
  constructor() {
    this.executionId = process.env.EXECUTION_ID
    this.jobId = process.env.JOB_ID
    this.totalRecords = parseInt(process.env.TOTAL_RECORDS || '100000', 10)
    this.batchSize = parseInt(process.env.BATCH_SIZE || '5000', 10)
    this.concurrency = Math.max(1, parseInt(process.env.CONCURRENCY || '8', 10))
    this.progressUpdateMs = parseInt(process.env.PROGRESS_UPDATE_MS || '2000', 10)
    this.failureRate = parseFloat(process.env.FAILURE_RATE || '0.001')
    this.failureThresholdPercent = parseFloat(process.env.FAILURE_THRESHOLD_PERCENT || '10')
    this.maxRetries = parseInt(process.env.MAX_RETRIES || '3', 10)
    
    // Performance tracking
    this.metrics = {
      startTime: Date.now(),
      memoryUsage: [],
      processedRecords: 0,
      failedRecords: 0,
      circuitBreakerFailures: 0,
      transactionIntegrity: []
    }
  }

  async main() {
    try {
      console.info(`Enhanced Banking-Grade Worker started for job ${this.jobId} execution ${this.executionId}`)
      console.info(`Configuration: totalRecords=${this.totalRecords}, batchSize=${this.batchSize}, concurrency=${this.concurrency}`)

      // Initialize circuit breakers for different services
      await this.initializeCircuitBreakers()

      // Load job and execution records
      const [job, execution] = await Promise.all([
        prisma.eTLJob.findUnique({ where: { id: this.jobId } }),
        prisma.jobExecution.findUnique({ where: { id: this.executionId } })
      ])

      if (!job || !execution) {
        throw new Error('Job or execution record not found')
      }

      // Create banking transaction manager instance
      const bankingManager = new BankingTransactionManager()

      // Create audit entry for job start
      await bankingManager.createAuditEntry(
        job.id,
        'ENHANCED_JOB_STARTED',
        {
          executionId: this.executionId,
          totalRecords: this.totalRecords,
          batchSize: this.batchSize,
          concurrency: this.concurrency,
          failureRate: this.failureRate
        },
        this.executionId
      )

      // Update execution start time
      await prisma.jobExecution.update({
        where: { id: this.executionId },
        data: { processingStartTime: new Date() }
      })

      // Start memory monitoring
      this.startMemoryMonitoring()

      // Execute the job with circuit breaker protection
      const result = await this.executeJobWithCircuitBreaker(job, execution, bankingManager)

      // Finalize execution
      await this.finalizeExecution(result, bankingManager)

      console.info(`Enhanced Worker finished: execution=${this.executionId} status=${result.status}`)
      process.exit(0)

    } catch (err) {
      console.error('Enhanced Worker top-level error:', err)
      await this.handleFatalError(err)
      process.exit(1)
    } finally {
      await prisma.$disconnect()
    }
  }

  async initializeCircuitBreakers() {
    // Simulate circuit breaker initialization for database, external APIs, etc.
    this.circuitBreakers = {
      database: { state: 'CLOSED', failures: 0 },
      external_api: { state: 'CLOSED', failures: 0 },
      memory_management: { state: 'CLOSED', failures: 0 }
    }
  }

  async executeJobWithCircuitBreaker(job, execution, bankingManager) {
    let processedRecords = 0
    let successRecords = 0
    let failedRecords = 0
    let transactionCount = 0

    const batchStarts = []
    for (let i = 0; i < this.totalRecords; i += this.batchSize) {
      batchStarts.push(i)
    }

    const runNext = async () => {
      while (batchStarts.length > 0) {
        const start = batchStarts.shift()
        const size = Math.min(this.batchSize, this.totalRecords - start)
        
        try {
          await this.processBatchWithCircuitBreaker(start, size, job, execution, bankingManager)
          processedRecords += size
          successRecords += size
          transactionCount++
        } catch (error) {
          failedRecords += size
          
          // Add to dead letter queue on circuit breaker failures
          if (error.message.includes('Circuit breaker is OPEN')) {
            this.metrics.circuitBreakerFailures++
            await bankingManager.addToDeadLetterQueue(
              job.id,
              'SYSTEM_ERROR',
              error.message,
              { batchStart: start, batchSize: size },
              this.executionId
            )
          }
        }
      }
    }

    // Execute with concurrency control
    const promises = []
    for (let i = 0; i < this.concurrency; i++) {
      promises.push(runNext())
    }

    // Progress monitoring
    const progressInterval = setInterval(async () => {
      const progress = Math.round((processedRecords / this.totalRecords) * 100)
      await this.updateProgress(execution.id, processedRecords, successRecords, failedRecords)
      
      console.info(`Progress: ${progress}% (${processedRecords}/${this.totalRecords} records)`)
      
      // Record performance metrics
      await bankingManager.recordPerformanceMetric(
        job.id,
        execution.id,
        'THROUGHPUT',
        'records_per_second',
        this.calculateThroughput(),
        'records/sec',
        { processedRecords, progress }
      )
    }, this.progressUpdateMs)

    // Wait for all batches to complete
    await Promise.all(promises)
    clearInterval(progressInterval)

    return {
      status: failedRecords > (this.totalRecords * this.failureThresholdPercent / 100) ? 'FAILED' : 'COMPLETED',
      processedRecords,
      successRecords,
      failedRecords,
      transactionCount
    }
  }

  async processBatchWithCircuitBreaker(batchStart, batchSize, job, execution, bankingManager) {
    // Simulate batch processing with potential circuit breaker failures
    const processingTime = Math.min(5000, Math.max(50, Math.round((batchSize / 1000) * 100)))
    
    // Check circuit breaker for database operations
    if (this.circuitBreakers.database.failures > 5) {
      throw new Error('Circuit breaker is OPEN for database operations')
    }

    // Process the batch
    await this.sleep(processingTime)

    // Simulate record validation and failure
    let localFailures = 0
    for (let i = 0; i < batchSize; i++) {
      if (Math.random() < this.failureRate) localFailures++
    }

    // Create transaction integrity record
    const transactionId = await bankingManager.createTransactionRecord(
      job.id,
      execution.id,
      Array.from({ length: batchSize }, (_, i) => ({
        id: `record_${batchStart + i}`,
        data: `data_${batchStart + i}`,
        amount: Math.random() * 1000
      })),
      batchSize * Math.random() * 100, // Random total amount
      'USD'
    )

    // Validate transaction
    const isValid = await bankingManager.validateTransaction(transactionId)
    
    if (!isValid) {
      this.circuitBreakers.database.failures++
      throw new Error('Transaction validation failed')
    }

    // Record memory usage
    this.recordMemoryUsage()

    // Log progress periodically
    if (batchStart % (this.batchSize * 10) === 0) {
      await bankingManager.createAuditEntry(
        job.id,
        'BATCH_PROCESSED',
        {
          batchStart,
          batchSize,
          localFailures,
          transactionId,
          processingTime,
          memoryUsage: this.getMemoryUsage()
        },
        execution.id,
        transactionId
      )
    }

    return { success: true, failures: localFailures }
  }

  async updateProgress(executionId, processed, success, failed) {
    try {
      await prisma.jobExecution.update({
        where: { id: executionId },
        data: {
          recordsProcessed: processed,
          recordsSuccess: success,
          recordsFailed: failed,
          throughputRecordsPerSec: this.calculateThroughput(),
          memoryPeakMb: this.getPeakMemoryUsage()
        }
      })
    } catch (err) {
      console.error('Failed to update progress:', err)
    }
  }

  async finalizeExecution(result, bankingManager) {
    const duration = Date.now() - this.metrics.startTime
    const failurePercent = (result.failedRecords / Math.max(1, result.processedRecords)) * 100
    
    // Update execution record
    await prisma.jobExecution.update({
      where: { id: this.executionId },
      data: {
        status: result.status,
        completedAt: new Date(),
        processingEndTime: new Date(),
        recordsProcessed: result.processedRecords,
        recordsSuccess: result.successRecords,
        recordsFailed: result.failedRecords,
        errorMessage: result.status === 'FAILED' ? `High failure rate: ${failurePercent.toFixed(2)}%` : null,
        financialAmount: result.successRecords * Math.random() * 100, // Simulated financial amount
        currency: 'USD',
        memoryPeakMb: this.getPeakMemoryUsage(),
        throughputRecordsPerSec: this.calculateThroughput()
      }
    })

    // Update job status
    await prisma.eTLJob.update({
      where: { id: this.jobId },
      data: {
        status: result.status,
        ...(true ? { nextRun: new Date(Date.now() + 60 * 60 * 1000) } : {}) // 1 hour from now
      }
    })

    // Final audit entry
    await bankingManager.createAuditEntry(
      this.jobId,
      result.status === 'COMPLETED' ? 'ENHANCED_JOB_COMPLETED' : 'ENHANCED_JOB_FAILED',
      {
        executionId: this.executionId,
        totalRecords: result.processedRecords,
        successRecords: result.successRecords,
        failedRecords: result.failedRecords,
        failureRate: failurePercent,
        duration,
        throughput: this.calculateThroughput(),
        circuitBreakerFailures: this.metrics.circuitBreakerFailures,
        peakMemoryUsage: this.getPeakMemoryUsage()
      },
      this.executionId
    )

    // Process dead letter queue
    await this.processDeadLetterQueue(bankingManager)

    console.info(`Final Results: ${result.status} - ${result.processedRecords} processed, ${result.failedRecords} failed`)
  }

  async handleFatalError(err) {
    try {
      // Update execution with error
      await prisma.jobExecution.update({
        where: { id: this.executionId },
        data: {
          status: 'FAILED',
          completedAt: new Date(),
          errorMessage: err.message
        }
      })

      // Create audit entry for fatal error
      const bankingManager = new BankingTransactionManager()
      await bankingManager.createAuditEntry(
        this.jobId,
        'ENHANCED_JOB_FATAL_ERROR',
        {
          executionId: this.executionId,
          error: err.message,
          stack: err.stack,
          metrics: this.metrics
        }
      )
    } catch (updateErr) {
      console.error('Failed to update execution after fatal error:', updateErr)
    }
  }

  startMemoryMonitoring() {
    this.memoryInterval = setInterval(() => {
      this.recordMemoryUsage()
    }, 5000) // Every 5 seconds
  }

  recordMemoryUsage() {
    const usage = process.memoryUsage()
    this.metrics.memoryUsage.push({
      timestamp: Date.now(),
      heapUsed: usage.heapUsed,
      heapTotal: usage.heapTotal,
      external: usage.external
    })
  }

  getMemoryUsage() {
    const usage = process.memoryUsage()
    return {
      heapUsed: Math.round(usage.heapUsed / 1024 / 1024 * 100) / 100,
      heapTotal: Math.round(usage.heapTotal / 1024 / 1024 * 100) / 100,
      external: Math.round(usage.external / 1024 / 1024 * 100) / 100
    }
  }

  getPeakMemoryUsage() {
    if (this.metrics.memoryUsage.length === 0) return 0
    return Math.max(...this.metrics.memoryUsage.map(m => m.heapUsed)) / 1024 / 1024
  }

  calculateThroughput() {
    const duration = (Date.now() - this.metrics.startTime) / 1000
    return Math.round((this.metrics.processedRecords / duration) * 100) / 100
  }

  async processDeadLetterQueue(bankingManager) {
    try {
      const dlqItems = await bankingManager.getDeadLetterQueueItems(10)
      
      for (const item of dlqItems) {
        // Simulate retry processing
        const success = Math.random() > 0.3 // 70% success rate for retries
        
        await bankingManager.markDeadLetterQueueItemProcessed(item.id, success)
        
        if (success) {
          console.info(`DLQ item ${item.id} successfully reprocessed`)
        } else {
          console.warn(`DLQ item ${item.id} failed after retry`)
        }
      }
    } catch (err) {
      console.error('Failed to process dead letter queue:', err)
    }
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

// Simple Banking Transaction Manager for the worker
class BankingTransactionManager {
  async createAuditEntry(jobId, eventType, eventData, executionId) {
    try {
      await prisma.syncLog.create({
        data: {
          sourceId: 'enhanced-worker',
          jobId,
          level: 'INFO',
          message: `${eventType}: ${JSON.stringify(eventData).substring(0, 200)}`,
          details: JSON.stringify({ executionId, eventData })
        }
      })
    } catch (err) {
      console.error('Failed to create audit entry:', err)
    }
  }

  async createTransactionRecord(jobId, executionId, records, totalAmount, currency) {
    const transactionId = `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    try {
      await prisma.transactionIntegrity.create({
        data: {
          id: `ti_${Date.now()}`,
          transactionId,
          jobId,
          executionId,
          totalRecords: records.length,
          checksumBatch: `hash_${transactionId}`,
          validationStatus: 'PENDING'
        }
      })
    } catch (err) {
      console.error('Failed to create transaction record:', err)
    }
    
    return transactionId
  }

  async validateTransaction(transactionId) {
    // Simulate validation
    await new Promise(resolve => setTimeout(resolve, 10))
    return Math.random() > 0.05 // 95% success rate
  }

  async addToDeadLetterQueue(jobId, failureType, failureReason, payloadData, executionId) {
    try {
      await prisma.deadLetterQueue.create({
        data: {
          id: `dlq_${Date.now()}`,
          jobId,
          executionId,
          failureType,
          failureReason,
          payloadData: JSON.stringify(payloadData),
          maxRetries: 3,
          status: 'PENDING'
        }
      })
    } catch (err) {
      console.error('Failed to add to DLQ:', err)
    }
  }

  async getDeadLetterQueueItems(limit) {
    try {
      return await prisma.deadLetterQueue.findMany({
        where: { status: 'PENDING' },
        take: limit
      })
    } catch (err) {
      console.error('Failed to get DLQ items:', err)
      return []
    }
  }

  async markDeadLetterQueueItemProcessed(dlqId, success) {
    try {
      await prisma.deadLetterQueue.update({
        where: { id: dlqId },
        data: {
          status: success ? 'COMPLETED' : 'FAILED',
          processedAt: new Date()
        }
      })
    } catch (err) {
      console.error('Failed to mark DLQ item processed:', err)
    }
  }

  async recordPerformanceMetric(jobId, executionId, metricType, metricName, metricValue, unit, tags) {
    try {
      await prisma.performanceMetrics.create({
        data: {
          id: `pm_${Date.now()}`,
          jobId,
          executionId,
          metricType,
          metricName,
          metricValue,
          unit,
          tags: tags ? JSON.stringify(tags) : null
        }
      })
    } catch (err) {
      console.error('Failed to record performance metric:', err)
    }
  }
}

// Main execution
if (require.main === module) {
  const worker = new EnhancedJobWorker()
  worker.main().catch(err => {
    console.error('Worker failed:', err)
    process.exit(1)
  })
}

module.exports = EnhancedJobWorker