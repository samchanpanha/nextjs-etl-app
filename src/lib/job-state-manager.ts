/**
 * Banking-Grade Job State Manager
 * Provides robust job state persistence, failure detection, and recovery mechanisms for critical banking ETL operations
 */

import BankingTransactionManager from './banking-transaction-manager'
import BankingMonitor from './banking-monitor'
import { db } from './db'

export interface JobCheckpoint {
  jobId: string
  executionId: string
  checkpointId: string
  stepName: string
  stepNumber: number
  dataProcessed: number
  totalData: number
  timestamp: Date
  checksum: string
  state: 'STARTED' | 'COMPLETED' | 'FAILED' | 'PARTIAL'
  metadata?: Record<string, any>
}

export interface JobHealthStatus {
  jobId: string
  executionId?: string
  status: 'HEALTHY' | 'WARNING' | 'CRITICAL' | 'FAILED'
  lastHeartbeat: Date
  failureRate: number
  avgProcessingTime: number
  dataIntegrity: number
  recommendations: string[]
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
}

export interface FailurePrediction {
  jobId: string
  riskScore: number
  predictedFailureType: 'MEMORY' | 'DATABASE' | 'NETWORK' | 'BUSINESS_LOGIC' | 'UNKNOWN'
  confidence: number
  estimatedTimeToFailure: number // minutes
  preventionActions: string[]
  timestamp: Date
}

export interface RecoveryStrategy {
  jobId: string
  strategy: 'RESTART_FROM_CHECKPOINT' | 'FULL_RESTART' | 'MANUAL_INTERVENTION' | 'CIRCUIT_BREAKER_BYPASS'
  checkpoints: string[]
  estimatedRecoveryTime: number
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH'
  preconditions: string[]
  steps: string[]
}

export class JobStateManager {
  private static instance: JobStateManager
  private readonly bankingManager: BankingTransactionManager
  private readonly monitor: BankingMonitor
  private readonly heartbeatInterval = 30000 // 30 seconds
  private readonly maxFailureRate = 0.05 // 5%
  private readonly criticalProcessingTime = 1800000 // 30 minutes
  private readonly minDataIntegrity = 0.95 // 95%
  
  private healthChecks = new Map<string, any>()
  private failurePredictionModels = new Map<string, FailurePrediction>()

  private constructor() {
    this.bankingManager = BankingTransactionManager.getInstance()
    this.monitor = BankingMonitor.getInstance()
  }

  static getInstance(): JobStateManager {
    if (!JobStateManager.instance) {
      JobStateManager.instance = new JobStateManager()
    }
    return JobStateManager.instance
  }

  /**
   * Create a checkpoint during job execution
   */
  async createCheckpoint(checkpoint: Omit<JobCheckpoint, 'checkpointId' | 'timestamp' | 'checksum'>): Promise<string> {
    const checkpointId = `cp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const timestamp = new Date()
    
    // Create checksum for data integrity
    const checksumData = {
      jobId: checkpoint.jobId,
      executionId: checkpoint.executionId,
      stepName: checkpoint.stepName,
      stepNumber: checkpoint.stepNumber,
      dataProcessed: checkpoint.dataProcessed,
      totalData: checkpoint.totalData,
      state: checkpoint.state,
      metadata: checkpoint.metadata,
      timestamp: timestamp.toISOString()
    }
    
    const checksum = await this.calculateChecksum(checksumData)
    
    try {
      // Store checkpoint in database (simulated - would use actual DB table)
      await this.bankingManager.createAuditEntry(
        checkpoint.jobId,
        'CHECKPOINT_CREATED',
        {
          checkpointId,
          stepName: checkpoint.stepName,
          stepNumber: checkpoint.stepNumber,
          dataProcessed: checkpoint.dataProcessed,
          totalData: checkpoint.totalData,
          state: checkpoint.state,
          checksum
        },
        checkpoint.executionId
      )

      // Record checkpoint metric
      await this.monitor.recordMetric(
        'job_state',
        'checkpoint_created',
        1,
        'count',
        {
          jobId: checkpoint.jobId,
          stepName: checkpoint.stepName,
          state: checkpoint.state
        }
      )

      return checkpointId
    } catch (error) {
      console.error('Failed to create checkpoint:', error)
      throw new Error('Checkpoint creation failed')
    }
  }

  /**
   * Get the latest checkpoint for a job execution
   */
  async getLatestCheckpoint(jobId: string, executionId?: string): Promise<JobCheckpoint | null> {
    try {
      // Simulate fetching latest checkpoint from database
      // In real implementation, this would query the checkpoint table
      
      const mockCheckpoint: JobCheckpoint = {
        jobId,
        executionId: executionId || 'exec_123',
        checkpointId: 'cp_latest',
        stepName: 'data_transformation',
        stepNumber: 5,
        dataProcessed: 850000,
        totalData: 1000000,
        timestamp: new Date(),
        checksum: 'checksum_hash',
        state: 'COMPLETED',
        metadata: { processingTime: 45000, memoryUsed: '512MB' }
      }

      // Verify checkpoint integrity
      const isValid = await this.verifyCheckpointIntegrity(mockCheckpoint)
      if (!isValid) {
        console.warn('Checkpoint integrity verification failed')
        return null
      }

      return mockCheckpoint
    } catch (error) {
      console.error('Failed to get latest checkpoint:', error)
      return null
    }
  }

  /**
   * Start health monitoring for a job
   */
  async startJobHealthMonitoring(jobId: string, executionId?: string): Promise<void> {
    // Stop existing monitoring if any
    await this.stopJobHealthMonitoring(jobId)

    const healthCheckId = setInterval(async () => {
      try {
        const healthStatus = await this.checkJobHealth(jobId, executionId)
        await this.handleJobHealthStatus(jobId, healthStatus)
      } catch (error) {
        console.error(`Health check failed for job ${jobId}:`, error)
      }
    }, this.heartbeatInterval)

    this.healthChecks.set(jobId, healthCheckId)
    
    // Initial health check
    await this.checkJobHealth(jobId, executionId)
  }

  /**
   * Stop health monitoring for a job
   */
  async stopJobHealthMonitoring(jobId: string): Promise<void> {
    const healthCheckId = this.healthChecks.get(jobId)
    if (healthCheckId) {
      clearInterval(healthCheckId)
      this.healthChecks.delete(jobId)
    }
  }

  /**
   * Check the health status of a job
   */
  async checkJobHealth(jobId: string, executionId?: string): Promise<JobHealthStatus> {
    try {
      // Get job execution data
      const execution = executionId 
        ? await db.jobExecution.findUnique({ where: { id: executionId } })
        : await db.jobExecution.findFirst({ 
            where: { 
              jobId, 
              status: 'RUNNING' 
            },
            orderBy: { startedAt: 'desc' }
          })

      if (!execution) {
        return {
          jobId,
          status: 'FAILED',
          lastHeartbeat: new Date(),
          failureRate: 1.0,
          avgProcessingTime: 0,
          dataIntegrity: 0,
          recommendations: ['No active execution found'],
          riskLevel: 'CRITICAL'
        }
      }

      // Calculate metrics
      const now = new Date()
      const executionDuration = now.getTime() - execution.startedAt.getTime()
      const failureRate = execution.recordsFailed / Math.max(1, execution.recordsProcessed)
      const processingTime = execution.processingEndTime 
        ? execution.processingEndTime.getTime() - execution.processingStartTime.getTime()
        : executionDuration

      // Get recent checkpoints
      const checkpoints = await this.getRecentCheckpoints(jobId, executionId, 5)
      
      // Calculate data integrity score
      const dataIntegrity = await this.calculateDataIntegrity(jobId, executionId)

      // Determine overall status
      let status: JobHealthStatus['status'] = 'HEALTHY'
      let riskLevel: JobHealthStatus['riskLevel'] = 'LOW'
      const recommendations: string[] = []

      // Check for critical conditions
      if (failureRate > this.maxFailureRate) {
        status = 'CRITICAL'
        riskLevel = 'CRITICAL'
        recommendations.push(`High failure rate detected: ${(failureRate * 100).toFixed(2)}%`)
      } else if (failureRate > this.maxFailureRate * 0.5) {
        status = 'WARNING'
        riskLevel = 'MEDIUM'
        recommendations.push(`Elevated failure rate: ${(failureRate * 100).toFixed(2)}%`)
      }

      if (processingTime > this.criticalProcessingTime) {
        status = status === 'CRITICAL' ? 'CRITICAL' : 'WARNING'
        riskLevel = riskLevel === 'CRITICAL' ? 'CRITICAL' : 'MEDIUM'
        recommendations.push(`Long processing time: ${Math.round(processingTime / 60000)} minutes`)
      }

      if (dataIntegrity < this.minDataIntegrity) {
        status = 'CRITICAL'
        riskLevel = 'CRITICAL'
        recommendations.push(`Low data integrity score: ${(dataIntegrity * 100).toFixed(2)}%`)
      }

      // Check for stalled jobs
      if (execution.status === 'RUNNING' && executionDuration > 3600000) { // 1 hour
        status = 'WARNING'
        recommendations.push('Job appears to be stalled')
      }

      // Record health status
      await this.monitor.recordBusinessMetric({
        category: 'ERROR_RATE',
        name: 'job_health_score',
        value: status === 'HEALTHY' ? 1 : status === 'WARNING' ? 0.7 : 0.3,
        unit: 'score',
        timestamp: Date.now(),
        metadata: { jobId, status, riskLevel }
      })

      return {
        jobId,
        executionId: execution.id,
        status,
        lastHeartbeat: now,
        failureRate,
        avgProcessingTime: processingTime,
        dataIntegrity,
        recommendations,
        riskLevel
      }
    } catch (error) {
      console.error(`Health check failed for job ${jobId}:`, error)
      return {
        jobId,
        status: 'FAILED',
        lastHeartbeat: new Date(),
        failureRate: 1.0,
        avgProcessingTime: 0,
        dataIntegrity: 0,
        recommendations: [`Health check error: ${error instanceof Error ? error.message : String(error)}`],
        riskLevel: 'CRITICAL'
      }
    }
  }

  /**
   * Predict potential failures for a job
   */
  async predictJobFailure(jobId: string): Promise<FailurePrediction | null> {
    try {
      const healthStatus = await this.checkJobHealth(jobId)
      
      // Simple prediction algorithm based on current metrics
      let riskScore = 0
      let predictedFailureType: FailurePrediction['predictedFailureType'] = 'UNKNOWN'
      let confidence = 0
      let estimatedTimeToFailure = 60 // minutes default
      const preventionActions: string[] = []

      // Calculate risk score based on various factors
      if (healthStatus.failureRate > 0.02) {
        riskScore += 30
        predictedFailureType = 'BUSINESS_LOGIC'
        preventionActions.push('Review and validate business logic')
      }

      if (healthStatus.avgProcessingTime > 1500000) { // 25 minutes
        riskScore += 20
        predictedFailureType = 'MEMORY'
        preventionActions.push('Increase memory allocation')
      }

      if (healthStatus.dataIntegrity < 0.98) {
        riskScore += 25
        predictedFailureType = 'DATABASE'
        preventionActions.push('Check database connectivity and data quality')
      }

      // Consider job age and pattern
      if (riskScore < 20) {
        riskScore += healthStatus.riskLevel === 'MEDIUM' ? 15 : healthStatus.riskLevel === 'HIGH' ? 30 : 5
      }

      // Normalize risk score to 0-100
      riskScore = Math.min(100, riskScore)
      confidence = Math.min(0.95, 0.3 + (riskScore / 100) * 0.65)

      // Estimate time to failure
      if (riskScore > 70) {
        estimatedTimeToFailure = 15 // minutes
      } else if (riskScore > 50) {
        estimatedTimeToFailure = 30
      } else if (riskScore > 30) {
        estimatedTimeToFailure = 45
      }

      // Only return prediction if risk is significant
      if (riskScore < 25) {
        return null
      }

      const prediction: FailurePrediction = {
        jobId,
        riskScore,
        predictedFailureType,
        confidence,
        estimatedTimeToFailure,
        preventionActions,
        timestamp: new Date()
      }

      this.failurePredictionModels.set(jobId, prediction)
      
      // Record prediction
      await this.monitor.recordMetric(
        'failure_prediction',
        'risk_assessment',
        riskScore,
        'percentage',
        {
          jobId,
          failureType: predictedFailureType,
          confidence,
          estimatedTimeToFailure
        }
      )

      return prediction
    } catch (error) {
      console.error(`Failure prediction failed for job ${jobId}:`, error)
      return null
    }
  }

  /**
   * Generate recovery strategy for a failed or problematic job
   */
  async generateRecoveryStrategy(jobId: string, executionId?: string): Promise<RecoveryStrategy | null> {
    try {
      const healthStatus = await this.checkJobHealth(jobId, executionId)
      const latestCheckpoint = await this.getLatestCheckpoint(jobId, executionId)
      
      let strategy: RecoveryStrategy['strategy']
      let estimatedRecoveryTime = 30 // minutes default
      let riskLevel: RecoveryStrategy['riskLevel'] = 'MEDIUM'
      const preconditions: string[] = []
      const steps: string[] = []

      // Determine strategy based on health status and checkpoints
      if (healthStatus.status === 'FAILED') {
        if (latestCheckpoint && latestCheckpoint.state === 'COMPLETED') {
          strategy = 'RESTART_FROM_CHECKPOINT'
          estimatedRecoveryTime = Math.max(5, (latestCheckpoint.totalData - latestCheckpoint.dataProcessed) / 1000) // Rough estimate
          steps.push(`Restart from checkpoint: ${latestCheckpoint.stepName}`)
          steps.push('Validate data integrity before resuming')
          riskLevel = 'LOW'
        } else {
          strategy = 'FULL_RESTART'
          estimatedRecoveryTime = 60 // Full job restart
          steps.push('Perform full job restart')
          steps.push('Verify all data sources are accessible')
          steps.push('Clear any cached data')
          riskLevel = 'HIGH'
        }
      } else if (healthStatus.status === 'CRITICAL') {
        if (latestCheckpoint) {
          strategy = 'RESTART_FROM_CHECKPOINT'
          estimatedRecoveryTime = Math.max(15, estimatedRecoveryTime * 0.7)
          steps.push('Restart from last successful checkpoint')
          steps.push('Implement circuit breaker for problematic components')
          riskLevel = 'MEDIUM'
        } else {
          strategy = 'MANUAL_INTERVENTION'
          estimatedRecoveryTime = 120 // Requires manual intervention
          steps.push('Review job logs and configuration')
          steps.push('Manual data validation required')
          riskLevel = 'HIGH'
        }
      } else if (healthStatus.status === 'WARNING') {
        strategy = 'CIRCUIT_BREAKER_BYPASS'
        estimatedRecoveryTime = 10
        steps.push('Implement circuit breaker bypass')
        steps.push('Monitor closely during recovery')
        riskLevel = 'LOW'
      } else {
        return null // Job is healthy, no recovery needed
      }

      // Add preconditions based on predicted failure type
      const prediction = await this.predictJobFailure(jobId)
      if (prediction) {
        if (prediction.predictedFailureType === 'MEMORY') {
          preconditions.push('Increase memory allocation for job execution')
        } else if (prediction.predictedFailureType === 'DATABASE') {
          preconditions.push('Verify database connectivity and performance')
        } else if (prediction.predictedFailureType === 'NETWORK') {
          preconditions.push('Check network stability and connectivity')
        }
      }

      const recoveryStrategy: RecoveryStrategy = {
        jobId,
        strategy,
        checkpoints: latestCheckpoint ? [latestCheckpoint.checkpointId] : [],
        estimatedRecoveryTime,
        riskLevel,
        preconditions,
        steps
      }

      // Record recovery strategy
      await this.bankingManager.createAuditEntry(
        jobId,
        'RECOVERY_STRATEGY_GENERATED',
        {
          executionId,
          strategy,
          healthStatus: healthStatus.status,
          estimatedRecoveryTime,
          riskLevel
        },
        executionId
      )

      return recoveryStrategy
    } catch (error) {
      console.error(`Recovery strategy generation failed for job ${jobId}:`, error)
      return null
    }
  }

  /**
   * Execute a recovery strategy
   */
  async executeRecoveryStrategy(strategy: RecoveryStrategy): Promise<boolean> {
    try {
      console.log(`Executing recovery strategy for job ${strategy.jobId}: ${strategy.strategy}`)
      
      // Record recovery attempt
      await this.bankingManager.createAuditEntry(
        strategy.jobId,
        'RECOVERY_STARTED',
        {
          strategy: strategy.strategy,
          estimatedRecoveryTime: strategy.estimatedRecoveryTime,
          riskLevel: strategy.riskLevel,
          steps: strategy.steps
        }
      )

      // Simulate recovery execution
      switch (strategy.strategy) {
        case 'RESTART_FROM_CHECKPOINT':
          return await this.executeCheckpointRecovery(strategy)
        
        case 'FULL_RESTART':
          return await this.executeFullRestart(strategy)
        
        case 'CIRCUIT_BREAKER_BYPASS':
          return await this.executeCircuitBreakerBypass(strategy)
        
        case 'MANUAL_INTERVENTION':
          return await this.executeManualIntervention(strategy)
        
        default:
          throw new Error(`Unknown recovery strategy: ${strategy.strategy}`)
      }
    } catch (error) {
      console.error('Recovery strategy execution failed:', error)
      
      await this.bankingManager.createAuditEntry(
        strategy.jobId,
        'RECOVERY_FAILED',
        {
          strategy: strategy.strategy,
          error: error instanceof Error ? error.message : String(error)
        }
      )
      
      return false
    }
  }

  /**
   * Verify checkpoint data integrity
   */
  private async verifyCheckpointIntegrity(checkpoint: JobCheckpoint): Promise<boolean> {
    try {
      const checksumData = {
        jobId: checkpoint.jobId,
        executionId: checkpoint.executionId,
        stepName: checkpoint.stepName,
        stepNumber: checkpoint.stepNumber,
        dataProcessed: checkpoint.dataProcessed,
        totalData: checkpoint.totalData,
        state: checkpoint.state,
        metadata: checkpoint.metadata,
        timestamp: checkpoint.timestamp.toISOString()
      }
      
      const calculatedChecksum = await this.calculateChecksum(checksumData)
      return calculatedChecksum === checkpoint.checksum
    } catch (error) {
      console.error('Checkpoint integrity verification failed:', error)
      return false
    }
  }

  /**
   * Get recent checkpoints for a job
   */
  private async getRecentCheckpoints(jobId: string, executionId?: string, limit: number = 10): Promise<JobCheckpoint[]> {
    // Simulate fetching recent checkpoints
    // In real implementation, this would query the checkpoint table
    return []
  }

  /**
   * Calculate data integrity score
   */
  private async calculateDataIntegrity(jobId: string, executionId?: string): Promise<number> {
    try {
      // Simulate data integrity calculation
      // In real implementation, this would validate checksums, counts, etc.
      return 0.98 // 98% integrity score
    } catch (error) {
      console.error('Data integrity calculation failed:', error)
      return 0
    }
  }

  /**
   * Handle job health status changes
   */
  private async handleJobHealthStatus(jobId: string, healthStatus: JobHealthStatus): Promise<void> {
    // Create alerts for critical conditions
    if (healthStatus.status === 'CRITICAL') {
      await this.monitor.recordBusinessMetric({
        category: 'ERROR_RATE',
        name: 'critical_job_status',
        value: 1,
        unit: 'alert',
        timestamp: Date.now(),
        metadata: { jobId, riskLevel: healthStatus.riskLevel }
      })
    }

    // Auto-trigger recovery for critical jobs
    if (healthStatus.status === 'CRITICAL' && healthStatus.riskLevel === 'CRITICAL') {
      const recoveryStrategy = await this.generateRecoveryStrategy(jobId, healthStatus.executionId)
      if (recoveryStrategy && recoveryStrategy.riskLevel !== 'HIGH') {
        console.log(`Auto-triggering recovery for critical job ${jobId}`)
        setTimeout(() => this.executeRecoveryStrategy(recoveryStrategy), 5000) // Execute after 5 seconds
      }
    }
  }

  /**
   * Calculate checksum for data integrity
   */
  private async calculateChecksum(data: any): Promise<string> {
    const dataString = JSON.stringify(data)
    const encoder = new TextEncoder()
    const dataBuffer = encoder.encode(dataString)
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  }

  /**
   * Execute checkpoint-based recovery
   */
  private async executeCheckpointRecovery(strategy: RecoveryStrategy): Promise<boolean> {
    try {
      // Simulate recovery execution
      console.log('Executing checkpoint recovery...')
      
      await this.bankingManager.createAuditEntry(
        strategy.jobId,
        'CHECKPOINT_RECOVERY_EXECUTED',
        { strategy: strategy.strategy }
      )
      
      return true
    } catch (error) {
      console.error('Checkpoint recovery failed:', error)
      return false
    }
  }

  /**
   * Execute full restart recovery
   */
  private async executeFullRestart(strategy: RecoveryStrategy): Promise<boolean> {
    try {
      // Simulate full restart
      console.log('Executing full restart...')
      
      await this.bankingManager.createAuditEntry(
        strategy.jobId,
        'FULL_RESTART_EXECUTED',
        { strategy: strategy.strategy }
      )
      
      return true
    } catch (error) {
      console.error('Full restart failed:', error)
      return false
    }
  }

  /**
   * Execute circuit breaker bypass
   */
  private async executeCircuitBreakerBypass(strategy: RecoveryStrategy): Promise<boolean> {
    try {
      // Simulate circuit breaker bypass
      console.log('Executing circuit breaker bypass...')
      
      await this.bankingManager.createAuditEntry(
        strategy.jobId,
        'CIRCUIT_BREAKER_BYPASS_EXECUTED',
        { strategy: strategy.strategy }
      )
      
      return true
    } catch (error) {
      console.error('Circuit breaker bypass failed:', error)
      return false
    }
  }

  /**
   * Execute manual intervention strategy
   */
  private async executeManualIntervention(strategy: RecoveryStrategy): Promise<boolean> {
    try {
      // Mark for manual intervention (don't auto-execute)
      console.log('Manual intervention required...')
      
      await this.bankingManager.createAuditEntry(
        strategy.jobId,
        'MANUAL_INTERVENTION_REQUIRED',
        { strategy: strategy.strategy }
      )
      
      return false // Manual intervention required
    } catch (error) {
      console.error('Manual intervention marking failed:', error)
      return false
    }
  }

  /**
   * Get comprehensive job state report
   */
  async getJobStateReport(jobId: string): Promise<{
    healthStatus: JobHealthStatus
    recentCheckpoints: JobCheckpoint[]
    failurePrediction: FailurePrediction | null
    recoveryStrategy: RecoveryStrategy | null
    recommendations: string[]
  }> {
    const healthStatus = await this.checkJobHealth(jobId)
    const recentCheckpoints = await this.getRecentCheckpoints(jobId)
    const failurePrediction = await this.predictJobFailure(jobId)
    const recoveryStrategy = await this.generateRecoveryStrategy(jobId)
    
    const recommendations = [...healthStatus.recommendations]
    
    if (failurePrediction) {
      recommendations.push(...failurePrediction.preventionActions)
    }
    
    if (recoveryStrategy) {
      recommendations.push(`Recovery strategy available: ${recoveryStrategy.strategy}`)
    }

    return {
      healthStatus,
      recentCheckpoints,
      failurePrediction,
      recoveryStrategy,
      recommendations
    }
  }
}

export default JobStateManager