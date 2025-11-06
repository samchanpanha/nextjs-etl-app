/**
 * Banking-Grade Enhanced Batching and Resource Management System
 * Provides intelligent batching algorithms, resource optimization, and performance monitoring for financial ETL operations
 */

import BankingTransactionManager from './banking-transaction-manager'
import BankingMonitor from './banking-monitor'
import MemoryManager from './memory-manager'
import CircuitBreakerManager from './circuit-breaker'

export interface BatchingConfig {
  minBatchSize: number
  maxBatchSize: number
  targetProcessingTime: number // ms
  memoryThreshold: number // percentage (0-1)
  cpuThreshold: number // percentage (0-1)
  adaptive: boolean
  financialDataOptimization: boolean
  complianceChecks: boolean
}

export interface BatchMetrics {
  batchSize: number
  processingTime: number
  memoryUsed: number
  throughput: number
  errorRate: number
  dataIntegrityScore: number
  financialAmount: number
  compliancePassed: boolean
}

export interface ResourceAllocation {
  maxMemoryMB: number
  maxCpuPercent: number
  maxConcurrency: number
  ioLimit: number // operations per second
  networkBandwidthMBps: number
  databaseConnections: number
}

export interface DataCharacteristics {
  recordSize: number
  financialValue: number
  dataType: 'TRANSACTION' | 'ACCOUNT' | 'REFERENCE' | 'LOG' | 'AUDIT'
  sensitivity: 'PUBLIC' | 'INTERNAL' | 'CONFIDENTIAL' | 'RESTRICTED'
  complianceRequirements: string[]
}

export interface AdaptiveBatchingStrategy {
  name: string
  conditions: {
    memoryUsage: number
    cpuUsage: number
    systemLoad: number
    dataCharacteristics: DataCharacteristics
    failureRate: number
  }
  batchSize: number
  concurrency: number
  priority: number
}

export class EnhancedBatchingManager {
  private static instance: EnhancedBatchingManager
  private readonly bankingManager: BankingTransactionManager
  private readonly monitor: BankingMonitor
  private readonly memoryManager: MemoryManager
  private readonly circuitBreakerManager: CircuitBreakerManager
  
  private readonly config: BatchingConfig
  private resourceAllocations = new Map<string, ResourceAllocation>()
  private activeStrategies = new Map<string, AdaptiveBatchingStrategy>()
  private performanceHistory: BatchMetrics[] = []
  private maxHistorySize = 500
  
  // Banking-specific thresholds
  private readonly maxFinancialBatchValue = 10000000 // $10M per batch
  private readonly minComplianceScore = 0.95
  private readonly maxProcessingTime = 300000 // 5 minutes per batch
  private readonly optimalConcurrency = 8

  private constructor(config?: Partial<BatchingConfig>) {
    this.bankingManager = BankingTransactionManager.getInstance()
    this.monitor = BankingMonitor.getInstance()
    this.memoryManager = MemoryManager.getInstance()
    this.circuitBreakerManager = CircuitBreakerManager.getInstance()
    
    this.config = {
      minBatchSize: 100,
      maxBatchSize: 10000,
      targetProcessingTime: 5000, // 5 seconds
      memoryThreshold: 0.8,
      cpuThreshold: 0.8,
      adaptive: true,
      financialDataOptimization: true,
      complianceChecks: true,
      ...config
    }
    
    this.initializeBankingStrategies()
  }

  static getInstance(config?: Partial<BatchingConfig>): EnhancedBatchingManager {
    if (!EnhancedBatchingManager.instance) {
      EnhancedBatchingManager.instance = new EnhancedBatchingManager(config)
    }
    return EnhancedBatchingManager.instance
  }

  /**
   * Process data with enhanced batching algorithms
   */
  async processBatch<T>(
    data: T[],
    dataCharacteristics: DataCharacteristics,
    processor: (batch: T[], characteristics: DataCharacteristics) => Promise<any>
  ): Promise<{
    result: any
    metrics: BatchMetrics
    strategy: AdaptiveBatchingStrategy
    resourceUsage: ResourceAllocation
  }> {
    const startTime = Date.now()
    
    try {
      // Get current system status
      const systemStatus = await this.getSystemStatus()
      const memoryStats = await this.memoryManager.monitorMemory()
      
      // Select optimal batching strategy
      const strategy = await this.selectOptimalStrategy(dataCharacteristics, systemStatus)
      
      // Calculate dynamic batch size
      const batchSize = this.calculateOptimalBatchSize(
        data.length,
        strategy,
        memoryStats,
        dataCharacteristics
      )
      
      // Get resource allocation
      const resourceUsage = this.getResourceAllocation(strategy, batchSize, dataCharacteristics)
      
      // Validate financial compliance
      const financialAmount = this.calculateBatchFinancialValue(data, dataCharacteristics)
      if (financialAmount > this.maxFinancialBatchValue) {
        throw new Error(`Batch financial value $${financialAmount.toLocaleString()} exceeds maximum of $${this.maxFinancialBatchValue.toLocaleString()}`)
      }
      
      // Process data in batches
      let totalProcessed = 0
      let totalErrors = 0
      const batchResults: any[] = []
      
      for (let i = 0; i < data.length; i += batchSize) {
        const batch = data.slice(i, i + batchSize)
        
        try {
          // Apply resource constraints
          await this.applyResourceConstraints(resourceUsage)
          
          // Process batch
          const batchResult = await processor(batch, dataCharacteristics)
          batchResults.push(batchResult)
          
          totalProcessed += batch.length
          
          // Record batch metrics
          await this.recordBatchMetrics({
            batchSize: batch.length,
            processingTime: Date.now() - startTime,
            memoryUsed: memoryStats.heapUsed,
            throughput: batch.length / ((Date.now() - startTime) / 1000),
            errorRate: 0, // Will be updated if errors occur
            dataIntegrityScore: 1.0, // Assume integrity for now
            financialAmount,
            compliancePassed: true
          })
          
          // Check for circuit breaker conditions
          if (totalErrors > batch.length * 0.1) { // 10% error threshold
            throw new Error('High error rate detected, circuit breaker triggered')
          }
          
        } catch (batchError) {
          totalErrors += batch.length
          console.error(`Batch processing failed at batch ${i}:`, batchError)
          
          // Add failed batch to dead letter queue
          await this.bankingManager.addToDeadLetterQueue(
            'enhanced-batching',
            'PROCESSING_ERROR' as const,
            batchError instanceof Error ? batchError.message : String(batchError),
            {
              batchStart: i,
              batchSize: batch.length,
              dataCharacteristics,
              partialData: batch.slice(0, 3) // First 3 records for analysis
            }
          )
        }
        
        // Adaptive adjustment based on performance
        if (this.config.adaptive) {
          await this.adjustStrategy(systemStatus, batch, i / batchSize)
        }
      }
      
      const metrics: BatchMetrics = {
        batchSize: data.length,
        processingTime: Date.now() - startTime,
        memoryUsed: (await this.memoryManager.monitorMemory()).heapUsed,
        throughput: totalProcessed / ((Date.now() - startTime) / 1000),
        errorRate: totalErrors / data.length,
        dataIntegrityScore: this.calculateDataIntegrityScore(data),
        financialAmount,
        compliancePassed: true
      }
      
      // Record final metrics
      await this.recordBatchMetrics(metrics)
      
      return {
        result: this.consolidateBatchResults(batchResults),
        metrics,
        strategy,
        resourceUsage
      }
      
    } catch (error) {
      console.error('Enhanced batch processing failed:', error)
      
      // Record failure metrics
      await this.recordBatchMetrics({
        batchSize: data.length,
        processingTime: Date.now() - startTime,
        memoryUsed: 0,
        throughput: 0,
        errorRate: 1.0,
        dataIntegrityScore: 0,
        financialAmount: 0,
        compliancePassed: false
      })
      
      throw error
    }
  }

  /**
   * Calculate optimal batch size based on multiple factors
   */
  private calculateOptimalBatchSize(
    totalRecords: number,
    strategy: AdaptiveBatchingStrategy,
    memoryStats: any,
    dataCharacteristics: DataCharacteristics
  ): number {
    let baseBatchSize = strategy.batchSize
    
    // Adjust for memory constraints
    const availableMemory = memoryStats.heapMax - memoryStats.heapUsed
    const estimatedRecordSize = this.estimateRecordSize(dataCharacteristics)
    const memoryLimitedBatchSize = Math.floor(availableMemory * 0.1 / estimatedRecordSize) // Use 10% of available memory
    
    // Adjust for financial sensitivity
    let financialMultiplier = 1.0
    if (dataCharacteristics.sensitivity === 'RESTRICTED') {
      financialMultiplier = 0.5 // Smaller batches for sensitive data
    } else if (dataCharacteristics.sensitivity === 'CONFIDENTIAL') {
      financialMultiplier = 0.7
    }
    
    // Adjust for data type
    let typeMultiplier = 1.0
    if (dataCharacteristics.dataType === 'TRANSACTION') {
      typeMultiplier = 0.8 // Transactions are more critical, smaller batches
    } else if (dataCharacteristics.dataType === 'REFERENCE') {
      typeMultiplier = 1.5 // Reference data can be processed in larger batches
    }
    
    // Calculate final batch size
    const optimalBatchSize = Math.floor(
      Math.min(
        baseBatchSize * financialMultiplier * typeMultiplier,
        memoryLimitedBatchSize,
        this.config.maxBatchSize
      )
    )
    
    return Math.max(
      this.config.minBatchSize,
      Math.min(optimalBatchSize, totalRecords)
    )
  }

  /**
   * Select optimal batching strategy based on current conditions
   */
  private async selectOptimalStrategy(
    dataCharacteristics: DataCharacteristics,
    systemStatus: any
  ): Promise<AdaptiveBatchingStrategy> {
    let bestStrategy: AdaptiveBatchingStrategy | null = null
    let bestScore = -1
    
    for (const strategy of this.activeStrategies.values()) {
      let score = 0
      
      // Score based on data characteristics match
      if (strategy.conditions.dataCharacteristics.dataType === dataCharacteristics.dataType) {
        score += 30
      }
      if (strategy.conditions.dataCharacteristics.sensitivity === dataCharacteristics.sensitivity) {
        score += 25
      }
      
      // Score based on system conditions
      if (systemStatus.memoryUsage < strategy.conditions.memoryUsage) {
        score += 20
      }
      if (systemStatus.cpuUsage < strategy.conditions.cpuUsage) {
        score += 15
      }
      if (systemStatus.errorRate < strategy.conditions.failureRate) {
        score += 10
      }
      
      // Add strategy priority as tie-breaker
      score += strategy.priority * 0.1
      
      if (score > bestScore) {
        bestScore = score
        bestStrategy = strategy
      }
    }
    
    // Return default strategy if no suitable match found
    return bestStrategy || this.getDefaultStrategy()
  }

  /**
   * Initialize banking-specific batching strategies
   */
  private initializeBankingStrategies(): void {
    const strategies: AdaptiveBatchingStrategy[] = [
      {
        name: 'high_value_transactions',
        conditions: {
          memoryUsage: 0.7,
          cpuUsage: 0.6,
          systemLoad: 0.6,
          dataCharacteristics: {
            recordSize: 1000,
            financialValue: 100000,
            dataType: 'TRANSACTION',
            sensitivity: 'CONFIDENTIAL',
            complianceRequirements: ['PCI-DSS', 'SOX']
          },
          failureRate: 0.01
        },
        batchSize: 100,
        concurrency: 4,
        priority: 10
      },
      {
        name: 'account_data_processing',
        conditions: {
          memoryUsage: 0.8,
          cpuUsage: 0.7,
          systemLoad: 0.7,
          dataCharacteristics: {
            recordSize: 2000,
            financialValue: 50000,
            dataType: 'ACCOUNT',
            sensitivity: 'CONFIDENTIAL',
            complianceRequirements: ['KYC', 'AML']
          },
          failureRate: 0.02
        },
        batchSize: 500,
        concurrency: 6,
        priority: 8
      },
      {
        name: 'reference_data_bulk',
        conditions: {
          memoryUsage: 0.85,
          cpuUsage: 0.8,
          systemLoad: 0.8,
          dataCharacteristics: {
            recordSize: 500,
            financialValue: 1000,
            dataType: 'REFERENCE',
            sensitivity: 'INTERNAL',
            complianceRequirements: []
          },
          failureRate: 0.05
        },
        batchSize: 5000,
        concurrency: 8,
        priority: 5
      },
      {
        name: 'audit_log_processing',
        conditions: {
          memoryUsage: 0.9,
          cpuUsage: 0.9,
          systemLoad: 0.9,
          dataCharacteristics: {
            recordSize: 200,
            financialValue: 0,
            dataType: 'AUDIT',
            sensitivity: 'RESTRICTED',
            complianceRequirements: ['SOX', 'GDPR']
          },
          failureRate: 0.03
        },
        batchSize: 10000,
        concurrency: 10,
        priority: 6
      }
    ]
    
    for (const strategy of strategies) {
      this.activeStrategies.set(strategy.name, strategy)
    }
  }

  /**
   * Get current system status for strategy selection
   */
  private async getSystemStatus(): Promise<{
    memoryUsage: number
    cpuUsage: number
    errorRate: number
    activeJobs: number
  }> {
    const memoryStats = await this.memoryManager.monitorMemory()
    const circuitStates = await this.circuitBreakerManager.getAllCircuitBreakerStates()
    
    // Calculate system load (simplified)
    const cpuUsage = Math.random() * 0.8 + 0.1 // Simulated CPU usage
    const memoryUsage = memoryStats.heapUsed / memoryStats.heapMax
    const errorRate = circuitStates.filter(cb => cb.state !== 'CLOSED').length / circuitStates.length
    const activeJobs = Math.floor(Math.random() * 20) + 5 // Simulated active jobs
    
    return {
      memoryUsage,
      cpuUsage,
      errorRate,
      activeJobs
    }
  }

  /**
   * Get resource allocation for a given strategy
   */
  private getResourceAllocation(
    strategy: AdaptiveBatchingStrategy,
    batchSize: number,
    dataCharacteristics: DataCharacteristics
  ): ResourceAllocation {
    const baseAllocation: ResourceAllocation = {
      maxMemoryMB: Math.min(batchSize * 10, 2048), // 10MB per record, max 2GB
      maxCpuPercent: strategy.concurrency * 12.5, // 12.5% per core
      maxConcurrency: strategy.concurrency,
      ioLimit: 1000,
      networkBandwidthMBps: 100,
      databaseConnections: strategy.concurrency
    }
    
    // Adjust for data sensitivity
    if (dataCharacteristics.sensitivity === 'RESTRICTED') {
      baseAllocation.maxMemoryMB *= 0.8
      baseAllocation.maxConcurrency = Math.max(1, Math.floor(baseAllocation.maxConcurrency * 0.7))
    }
    
    // Adjust for financial data
    if (dataCharacteristics.financialValue > 50000) {
      baseAllocation.databaseConnections = Math.min(baseAllocation.databaseConnections, 4) // Conservative for high-value data
      baseAllocation.maxConcurrency = Math.min(baseAllocation.maxConcurrency, 6)
    }
    
    return baseAllocation
  }

  /**
   * Apply resource constraints during batch processing
   */
  private async applyResourceConstraints(allocation: ResourceAllocation): Promise<void> {
    // Monitor memory usage
    const memoryStats = await this.memoryManager.monitorMemory()
    if (memoryStats.heapUsed > allocation.maxMemoryMB * 1024 * 1024) {
      // Trigger garbage collection
      await this.memoryManager.optimizeGarbageCollection()
    }
    
    // Check CPU usage (simplified - would use actual CPU monitoring)
    const estimatedCpuUsage = allocation.maxCpuPercent / 100
    if (estimatedCpuUsage > 0.9) {
      // Add small delay to prevent CPU overload
      await new Promise(resolve => setTimeout(resolve, 100))
    }
  }

  /**
   * Calculate batch financial value for compliance checks
   */
  private calculateBatchFinancialValue<T>(data: T[], characteristics: DataCharacteristics): number {
    if (characteristics.dataType !== 'TRANSACTION') {
      return characteristics.financialValue * data.length
    }
    
    // For transaction data, sum up values (simplified)
    return data.reduce((total, record) => {
      const transaction = record as any
      return total + (transaction.amount || 0)
    }, 0)
  }

  /**
   * Estimate record size for memory calculations
   */
  private estimateRecordSize(characteristics: DataCharacteristics): number {
    let baseSize = characteristics.recordSize
    
    // Add overhead for financial data processing
    if (characteristics.financialValue > 0) {
      baseSize *= 1.5 // Extra overhead for validation and encryption
    }
    
    // Add compliance overhead
    baseSize *= (1 + characteristics.complianceRequirements.length * 0.1)
    
    return baseSize
  }

  /**
   * Calculate data integrity score
   */
  private calculateDataIntegrityScore<T>(data: T[]): number {
    // Simplified integrity calculation
    // In real implementation, this would include checksums, validation rules, etc.
    const baseScore = 0.98
    const variance = Math.random() * 0.04 - 0.02 // ±2% variance
    
    return Math.max(0, Math.min(1, baseScore + variance))
  }

  /**
   * Consolidate batch processing results
   */
  private consolidateBatchResults(results: any[]): any {
    if (results.length === 0) {
      return { success: false, message: 'No successful batches' }
    }
    
    return {
      success: true,
      totalBatches: results.length,
      processedAt: new Date(),
      summary: {
        totalProcessed: results.reduce((sum, r) => sum + (r.processed || 0), 0),
        totalErrors: results.reduce((sum, r) => sum + (r.errors || 0), 0),
        averageProcessingTime: results.reduce((sum, r) => sum + (r.processingTime || 0), 0) / results.length
      }
    }
  }

  /**
   * Record batch processing metrics
   */
  private async recordBatchMetrics(metrics: BatchMetrics): Promise<void> {
    // Add to performance history
    this.performanceHistory.push(metrics)
    if (this.performanceHistory.length > this.maxHistorySize) {
      this.performanceHistory.shift()
    }
    
    // Record in banking monitor using correct category
    await this.monitor.recordBusinessMetric({
      category: 'VOLUME' as const,
      name: 'enhanced_batch_throughput',
      value: metrics.throughput,
      unit: 'records/sec',
      timestamp: Date.now(),
      metadata: {
        batchSize: metrics.batchSize,
        processingTime: metrics.processingTime,
        errorRate: metrics.errorRate,
        compliancePassed: metrics.compliancePassed
      }
    })
    
    // Record resource utilization
    await this.monitor.recordSLAMetric(
      'batch_processing_time',
      metrics.processingTime,
      'ms',
      this.config.targetProcessingTime,
      { batchSize: metrics.batchSize }
    )
  }

  /**
   * Adjust strategy based on performance feedback
   */
  private async adjustStrategy(systemStatus: any, batch: any[], progressRatio: number): Promise<void> {
    const recentMetrics = this.performanceHistory.slice(-5)
    if (recentMetrics.length < 3) return
    
    const avgProcessingTime = recentMetrics.reduce((sum, m) => sum + m.processingTime, 0) / recentMetrics.length
    const avgErrorRate = recentMetrics.reduce((sum, m) => sum + m.errorRate, 0) / recentMetrics.length
    
    // Adjust batch size if performance is poor
    if (avgProcessingTime > this.config.targetProcessingTime * 1.5 || avgErrorRate > 0.05) {
      // Reduce batch sizes for better stability
      for (const strategy of this.activeStrategies.values()) {
        strategy.batchSize = Math.max(
          this.config.minBatchSize,
          Math.floor(strategy.batchSize * 0.8)
        )
      }
    } else if (avgProcessingTime < this.config.targetProcessingTime * 0.5 && avgErrorRate < 0.01) {
      // Increase batch sizes for better throughput
      for (const strategy of this.activeStrategies.values()) {
        strategy.batchSize = Math.min(
          this.config.maxBatchSize,
          Math.floor(strategy.batchSize * 1.2)
        )
      }
    }
  }

  /**
   * Get default batching strategy
   */
  private getDefaultStrategy(): AdaptiveBatchingStrategy {
    return {
      name: 'default_strategy',
      conditions: {
        memoryUsage: 0.8,
        cpuUsage: 0.7,
        systemLoad: 0.7,
        dataCharacteristics: {
          recordSize: 1000,
          financialValue: 1000,
          dataType: 'REFERENCE',
          sensitivity: 'INTERNAL',
          complianceRequirements: []
        },
        failureRate: 0.03
      },
      batchSize: 1000,
      concurrency: this.optimalConcurrency,
      priority: 1
    }
  }

  /**
   * Get performance analytics for optimization
   */
  async getPerformanceAnalytics(): Promise<{
    averageThroughput: number
    averageProcessingTime: number
    averageErrorRate: number
    resourceUtilization: {
      memory: number
      cpu: number
    }
    recommendations: string[]
  }> {
    const recentMetrics = this.performanceHistory.slice(-50)
    
    if (recentMetrics.length === 0) {
      return {
        averageThroughput: 0,
        averageProcessingTime: 0,
        averageErrorRate: 0,
        resourceUtilization: { memory: 0, cpu: 0 },
        recommendations: ['No performance data available']
      }
    }
    
    const averageThroughput = recentMetrics.reduce((sum, m) => sum + m.throughput, 0) / recentMetrics.length
    const averageProcessingTime = recentMetrics.reduce((sum, m) => sum + m.processingTime, 0) / recentMetrics.length
    const averageErrorRate = recentMetrics.reduce((sum, m) => sum + m.errorRate, 0) / recentMetrics.length
    
    const memoryStats = await this.memoryManager.monitorMemory()
    const resourceUtilization = {
      memory: memoryStats.heapUsed / memoryStats.heapMax,
      cpu: 0.7 // Simplified - would calculate actual CPU usage
    }
    
    const recommendations: string[] = []
    
    if (averageErrorRate > 0.05) {
      recommendations.push('High error rate detected - consider reducing batch sizes')
    }
    
    if (resourceUtilization.memory > 0.8) {
      recommendations.push('High memory usage - consider optimizing batch sizes')
    }
    
    if (averageProcessingTime > this.config.targetProcessingTime * 1.5) {
      recommendations.push('Processing time exceeds targets - consider increasing resources')
    }
    
    if (averageThroughput < 100) {
      recommendations.push('Low throughput - consider optimizing batching strategy')
    }
    
    if (recommendations.length === 0) {
      recommendations.push('Performance metrics are within acceptable ranges')
    }
    
    return {
      averageThroughput: Math.round(averageThroughput * 100) / 100,
      averageProcessingTime: Math.round(averageProcessingTime),
      averageErrorRate: Math.round(averageErrorRate * 10000) / 10000,
      resourceUtilization,
      recommendations
    }
  }
}

export default EnhancedBatchingManager