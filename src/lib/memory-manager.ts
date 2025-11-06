/**
 * Banking-Grade Memory Manager
 * Provides memory optimization, monitoring, and resource management for large-scale ETL operations
 */

import BankingTransactionManager from './banking-transaction-manager'

export interface MemoryConfig {
  maxHeapSize: number
  warningThreshold: number
  criticalThreshold: number
  gcOptimization: boolean
  streamingBatchSize: number
}

export interface MemoryStats {
  heapUsed: number
  heapTotal: number
  heapMax: number
  external: number
  arrayBuffers: number
  timestamp: number
}

export interface ResourcePool {
  name: string
  maxSize: number
  currentSize: number
  activeConnections: number
  waitQueue: Array<() => void>
}

// Resource types for different pools
type ResourceType = 'database-connection' | 'file-handle' | 'generic'

export class MemoryManager {
  private static instance: MemoryManager
  private readonly config: MemoryConfig
  private readonly memoryHistory: MemoryStats[] = []
  private readonly maxHistorySize = 100
  private resourcePools = new Map<string, ResourcePool>()
  private memoryWarnings = 0
  private lastGC = Date.now()
  private readonly bankingManager = BankingTransactionManager.getInstance()

  private constructor(config?: Partial<MemoryConfig>) {
    this.config = {
      maxHeapSize: config?.maxHeapSize || 2048 * 1024 * 1024, // 2GB default
      warningThreshold: config?.warningThreshold || 0.8, // 80% of max
      criticalThreshold: config?.criticalThreshold || 0.9, // 90% of max
      gcOptimization: config?.gcOptimization || true,
      streamingBatchSize: config?.streamingBatchSize || 10000,
      ...config
    }
  }

  static getInstance(config?: Partial<MemoryConfig>): MemoryManager {
    if (!MemoryManager.instance) {
      MemoryManager.instance = new MemoryManager(config)
    }
    return MemoryManager.instance
  }

  /**
   * Monitor memory usage and trigger alerts if thresholds are exceeded
   */
  async monitorMemory(): Promise<MemoryStats> {
    const stats = this.getMemoryStats()
    
    // Add to history for trend analysis
    this.memoryHistory.push(stats)
    if (this.memoryHistory.length > this.maxHistorySize) {
      this.memoryHistory.shift()
    }

    // Check memory thresholds
    const usagePercent = stats.heapUsed / this.config.maxHeapSize
    
    if (usagePercent > this.config.criticalThreshold) {
      await this.handleCriticalMemoryUsage(stats)
    } else if (usagePercent > this.config.warningThreshold) {
      await this.handleMemoryWarning(stats)
    }

    // Perform garbage collection optimization if enabled
    if (this.config.gcOptimization && Date.now() - this.lastGC > 60000) {
      this.optimizeGarbageCollection()
    }

    // Record memory metrics
    await this.bankingManager.recordPerformanceMetric(
      'memory-manager',
      'monitor',
      'MEMORY',
      'heap_usage_mb',
      Math.round(stats.heapUsed / 1024 / 1024),
      'MB',
      { usagePercent, warnings: this.memoryWarnings }
    )

    return stats
  }

  /**
   * Create a resource pool for managing connections/objects efficiently
   */
  async createResourcePool(name: string, maxSize: number): Promise<ResourcePool> {
    const pool: ResourcePool = {
      name,
      maxSize,
      currentSize: 0,
      activeConnections: 0,
      waitQueue: []
    }
    
    this.resourcePools.set(name, pool)
    
    // Record pool creation in audit log
    await this.bankingManager.createAuditEntry(
      'memory-manager',
      'RESOURCE_POOL_CREATED',
      { poolName: name, maxSize },
      undefined,
      undefined
    )

    return pool
  }

  /**
   * Acquire a resource from the pool with timeout
   */
  async acquireResource(poolName: string, timeout: number = 30000): Promise<any> {
    const pool = this.resourcePools.get(poolName)
    if (!pool) {
      throw new Error(`Resource pool ${poolName} not found`)
    }

    // If pool has available resources, return one
    if (pool.currentSize < pool.maxSize) {
      pool.currentSize++
      pool.activeConnections++
      return this.createResource(poolName)
    }

    // Wait for a resource to become available
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Resource acquisition timeout after ${timeout}ms`))
      }, timeout)

      pool.waitQueue.push(() => {
        clearTimeout(timeoutId)
        pool.currentSize++
        pool.activeConnections++
        resolve(this.createResource(poolName))
      })
    })
  }

  /**
   * Release a resource back to the pool
   */
  async releaseResource(poolName: string, resource: any): Promise<void> {
    const pool = this.resourcePools.get(poolName)
    if (!pool) {
      throw new Error(`Resource pool ${poolName} not found`)
    }

    pool.activeConnections = Math.max(0, pool.activeConnections - 1)

    // Clean up the resource
    await this.cleanupResource(resource)

    // Give the resource to the next waiter or keep it in pool
    if (pool.waitQueue.length > 0) {
      const waiter = pool.waitQueue.shift()!
      waiter()
    } else {
      pool.currentSize = Math.max(0, pool.currentSize - 1)
    }

    // Record resource release
    await this.bankingManager.recordPerformanceMetric(
      'memory-manager',
      'monitor',
      'RESOURCE_POOL',
      'resource_released',
      1,
      'count',
      { poolName, activeConnections: pool.activeConnections }
    )
  }

  /**
   * Process large datasets using streaming to minimize memory usage
   */
  async *streamProcess<T>(
    dataSource: AsyncIterable<T> | T[],
    processor: (batch: T[]) => Promise<any>,
    batchSize?: number
  ): AsyncGenerator<any, void, unknown> {
    const effectiveBatchSize = batchSize || this.config.streamingBatchSize
    const batch: T[] = []
    let processedCount = 0

    for await (const item of this.asAsyncIterable(dataSource)) {
      batch.push(item)

      if (batch.length >= effectiveBatchSize) {
        // Check memory before processing
        const memoryStats = await this.monitorMemory()
        const usagePercent = memoryStats.heapUsed / this.config.maxHeapSize

        if (usagePercent > this.config.warningThreshold) {
          console.warn(`High memory usage (${Math.round(usagePercent * 100)}%), flushing batch`)
          await this.flushBatch(batch, processor)
        }

        yield await this.processBatch(batch, processor)
        processedCount += batch.length
        batch.length = 0

        // Record throughput
        await this.bankingManager.recordPerformanceMetric(
          'memory-manager',
          'stream-process',
          'THROUGHPUT',
          'records_processed',
          processedCount,
          'count',
          { memoryUsage: memoryStats.heapUsed }
        )
      }
    }

    // Process remaining items
    if (batch.length > 0) {
      yield await this.processBatch(batch, processor)
    }
  }

  /**
   * Get memory usage trends for analysis
   */
  getMemoryTrends(): {
    averageUsage: number
    trendDirection: 'increasing' | 'decreasing' | 'stable'
    peakUsage: number
    warningsCount: number
  } {
    if (this.memoryHistory.length < 2) {
      return {
        averageUsage: 0,
        trendDirection: 'stable',
        peakUsage: 0,
        warningsCount: this.memoryWarnings
      }
    }

    const recent = this.memoryHistory.slice(-10)
    const older = this.memoryHistory.slice(-20, -10)
    
    const recentAvg = recent.reduce((sum, stats) => sum + stats.heapUsed, 0) / recent.length
    const olderAvg = older.reduce((sum, stats) => sum + stats.heapUsed, 0) / older.length
    
    let trendDirection: 'increasing' | 'decreasing' | 'stable'
    const diff = recentAvg - olderAvg
    if (Math.abs(diff) / olderAvg < 0.05) {
      trendDirection = 'stable'
    } else if (diff > 0) {
      trendDirection = 'increasing'
    } else {
      trendDirection = 'decreasing'
    }

    return {
      averageUsage: Math.round(recentAvg / 1024 / 1024),
      trendDirection,
      peakUsage: Math.round(Math.max(...this.memoryHistory.map(s => s.heapUsed)) / 1024 / 1024),
      warningsCount: this.memoryWarnings
    }
  }

  /**
   * Force garbage collection if available
   */
  optimizeGarbageCollection(): void {
    try {
      if (typeof (globalThis as any).gc !== 'undefined') {
        (globalThis as any).gc()
        this.lastGC = Date.now()
        
        this.bankingManager.recordPerformanceMetric(
          'memory-manager',
          'gc-optimization',
          'GARBAGE_COLLECTION',
          'forced_gc',
          1,
          'count'
        ).catch(() => {})
      }
    } catch (error) {
      console.warn('Garbage collection optimization not available:', error)
    }
  }

  private getMemoryStats(): MemoryStats {
    try {
      // Safe way to access process.memoryUsage() that works in both Node.js and browser environments
      const usage = typeof (globalThis as any).process !== 'undefined' && (globalThis as any).process.memoryUsage 
        ? (globalThis as any).process.memoryUsage() 
        : { heapUsed: 0, heapTotal: 0, external: 0 }
      
      const maxRSS = typeof (globalThis as any).process !== 'undefined' && (globalThis as any).process.resourceUsage
        ? (globalThis as any).process.resourceUsage()?.maxRSS || 0
        : 0
      
      return {
        heapUsed: usage.heapUsed || 0,
        heapTotal: usage.heapTotal || 0,
        heapMax: (usage.heapTotal || 0) + (maxRSS * 1024),
        external: usage.external || 0,
        arrayBuffers: (usage as any).arrayBuffers || 0,
        timestamp: Date.now()
      }
    } catch (error) {
      return {
        heapUsed: 0,
        heapTotal: 0,
        heapMax: 0,
        external: 0,
        arrayBuffers: 0,
        timestamp: Date.now()
      }
    }
  }

  private async handleCriticalMemoryUsage(stats: MemoryStats): Promise<void> {
    console.error(`CRITICAL: Memory usage at ${Math.round(stats.heapUsed / 1024 / 1024)}MB`)
    
    // Force garbage collection
    this.optimizeGarbageCollection()
    
    // Record critical memory event
    await this.bankingManager.createAuditEntry(
      'memory-manager',
      'CRITICAL_MEMORY_USAGE',
      {
        heapUsed: stats.heapUsed,
        heapTotal: stats.heapTotal,
        usagePercent: stats.heapUsed / this.config.maxHeapSize
      },
      undefined,
      undefined
    )
  }

  private async handleMemoryWarning(stats: MemoryStats): Promise<void> {
    this.memoryWarnings++
    
    console.warn(`WARNING: Memory usage at ${Math.round(stats.heapUsed / 1024 / 1024)}MB`)
    
    // Record warning
    await this.bankingManager.createAuditEntry(
      'memory-manager',
      'MEMORY_WARNING',
      {
        heapUsed: stats.heapUsed,
        heapTotal: stats.heapTotal,
        usagePercent: stats.heapUsed / this.config.maxHeapSize,
        warningsCount: this.memoryWarnings
      },
      undefined,
      undefined
    )
  }

  private async *processBatch<T>(
    batch: T[],
    processor: (batch: T[]) => Promise<any>
  ): AsyncGenerator<any, void, unknown> {
    try {
      const result = await processor(batch)
      yield result
    } catch (error) {
      console.error('Batch processing failed:', error)
      
      // Add to dead letter queue if banking manager is available
      try {
        await this.bankingManager.addToDeadLetterQueue(
          'memory-manager',
          'PROCESSING_ERROR',
          error instanceof Error ? error.message : String(error),
          { batchSize: batch.length, batchSample: batch.slice(0, 3) }
        )
      } catch (dlqError) {
        console.error('Failed to add batch to DLQ:', dlqError)
      }
      
      throw error
    }
  }

  private async flushBatch<T>(
    batch: T[],
    processor: (batch: T[]) => Promise<any>
  ): Promise<void> {
    try {
      await processor(batch)
      batch.length = 0
    } catch (error) {
      console.error('Batch flush failed:', error)
      throw error
    }
  }

  private async *asAsyncIterable<T>(source: AsyncIterable<T> | T[]): AsyncGenerator<T, void, unknown> {
    if (Symbol.asyncIterator in Object(source)) {
      const iterator = (source as any)[Symbol.asyncIterator]()
      for await (const item of iterator) {
        yield item
      }
    } else {
      const array = source as T[]
      for (const item of array) {
        yield item
      }
    }
  }

  private createResource(poolName: string): any {
    // Create a mock resource based on pool type
    switch (poolName) {
      case 'database':
        return { type: 'database-connection' as ResourceType, id: Date.now() }
      case 'file':
        return { type: 'file-handle' as ResourceType, id: Date.now() }
      default:
        return { type: 'generic' as ResourceType, id: Date.now() }
    }
  }

  private async cleanupResource(resource: any): Promise<void> {
    // Clean up resource-specific data
    // Add cleanup logic as needed
  }

  /**
   * Get comprehensive memory report
   */
  async getMemoryReport(): Promise<{
    current: MemoryStats
    trends: ReturnType<MemoryManager['getMemoryTrends']>
    pools: Array<ResourcePool & { utilization: number }>
    recommendations: string[]
  }> {
    const current = await this.monitorMemory()
    const trends = this.getMemoryTrends()
    const pools = Array.from(this.resourcePools.values()).map(pool => ({
      ...pool,
      utilization: pool.activeConnections / pool.maxSize
    }))

    const recommendations = this.generateRecommendations(current, trends, pools)

    return {
      current,
      trends,
      pools,
      recommendations
    }
  }

  private generateRecommendations(
    current: MemoryStats,
    trends: ReturnType<MemoryManager['getMemoryTrends']>,
    pools: Array<ResourcePool & { utilization: number }>
  ): string[] {
    const recommendations: string[] = []
    const usagePercent = current.heapUsed / this.config.maxHeapSize

    if (usagePercent > 0.8) {
      recommendations.push('Consider reducing batch size or implementing streaming processing')
    }

    if (trends.trendDirection === 'increasing') {
      recommendations.push('Memory usage is trending upward - investigate potential memory leaks')
    }

    const highUtilizationPools = pools.filter(p => p.utilization > 0.8)
    if (highUtilizationPools.length > 0) {
      recommendations.push(`High resource pool utilization detected: ${highUtilizationPools.map(p => p.name).join(', ')}`)
    }

    if (this.memoryWarnings > 10) {
      recommendations.push('Multiple memory warnings detected - consider optimizing memory configuration')
    }

    if (recommendations.length === 0) {
      recommendations.push('Memory usage appears normal')
    }

    return recommendations
  }

  /**
   * Check if memory is within acceptable limits for banking operations
   */
  async isMemoryAcceptableForBankingOperations(): Promise<{
    acceptable: boolean
    reasons: string[]
    recommendations: string[]
  }> {
    const stats = await this.monitorMemory()
    const usagePercent = stats.heapUsed / this.config.maxHeapSize
    const trends = this.getMemoryTrends()
    
    const reasons: string[] = []
    const recommendations: string[] = []
    let acceptable = true

    if (usagePercent > 0.85) {
      acceptable = false
      reasons.push('Memory usage exceeds 85% threshold')
      recommendations.push('Reduce batch size or implement more aggressive memory management')
    }

    if (trends.trendDirection === 'increasing' && trends.averageUsage > 100) {
      acceptable = false
      reasons.push('Memory usage trending upward')
      recommendations.push('Investigate memory leaks and optimize resource cleanup')
    }

    if (stats.heapUsed > 1500 * 1024 * 1024) { // 1.5GB
      acceptable = false
      reasons.push('Heap usage exceeds 1.5GB')
      recommendations.push('Consider horizontal scaling or batch processing optimization')
    }

    return {
      acceptable,
      reasons,
      recommendations: recommendations.length > 0 ? recommendations : ['Memory usage is within acceptable limits']
    }
  }
}

export default MemoryManager