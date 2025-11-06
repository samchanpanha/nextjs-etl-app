/**
 * Banking-Grade Circuit Breaker Implementation
 * Provides service health monitoring and automatic failover protection
 */

import { db } from './db'
import BankingTransactionManager from './banking-transaction-manager'

export type CircuitBreakerState = 'CLOSED' | 'OPEN' | 'HALF_OPEN'

export interface CircuitBreakerConfig {
  failureThreshold: number
  recoveryTimeout: number
  successThreshold: number
  timeout: number
}

export class CircuitBreaker {
  private state: CircuitBreakerState = 'CLOSED'
  private failureCount = 0
  private successCount = 0
  private lastFailureTime = 0
  private readonly config: CircuitBreakerConfig
  private readonly serviceName: string

  constructor(serviceName: string, config?: Partial<CircuitBreakerConfig>) {
    this.serviceName = serviceName
    this.config = {
      failureThreshold: config?.failureThreshold || 5,
      recoveryTimeout: config?.recoveryTimeout || 60000, // 60 seconds
      successThreshold: config?.successThreshold || 3,
      timeout: config?.timeout || 30000, // 30 seconds
      ...config
    }
  }

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (this.shouldAttemptReset()) {
        this.state = 'HALF_OPEN'
        this.successCount = 0
        await this.recordStateChange('HALF_OPEN')
        return this.executeOperation(operation)
      } else {
        throw new Error(`Circuit breaker is OPEN for service: ${this.serviceName}`)
      }
    }

    return this.executeOperation(operation)
  }

  private async executeOperation<T>(operation: () => Promise<T>): Promise<T> {
    const startTime = Date.now()
    
    try {
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error(`Operation timeout: ${this.config.timeout}ms`)), this.config.timeout)
      })

      const result = await Promise.race([operation(), timeoutPromise])
      
      this.onSuccess()
      return result
    } catch (error) {
      this.onFailure()
      throw error
    } finally {
      const duration = Date.now() - startTime
      await this.recordPerformanceMetric('circuit_breaker_operation', duration, 'ms')
    }
  }

  private onSuccess(): void {
    this.failureCount = 0
    
    if (this.state === 'HALF_OPEN') {
      this.successCount++
      if (this.successCount >= this.config.successThreshold) {
        this.state = 'CLOSED'
        this.successCount = 0
        this.recordStateChange('CLOSED')
      }
    }
  }

  private onFailure(): void {
    this.failureCount++
    this.lastFailureTime = Date.now()
    
    if (this.state === 'HALF_OPEN' || this.failureCount >= this.config.failureThreshold) {
      this.state = 'OPEN'
      this.recordStateChange('OPEN')
    }
  }

  private shouldAttemptReset(): boolean {
    return Date.now() - this.lastFailureTime >= this.config.recoveryTimeout
  }

  private async recordStateChange(newState: CircuitBreakerState): Promise<void> {
    try {
      await db.circuitBreakerStates.update({
        where: { serviceName: this.serviceName },
        data: {
          state: newState,
          failureCount: this.failureCount,
          lastFailureTime: new Date(this.lastFailureTime),
          updatedAt: new Date()
        }
      })
    } catch (error) {
      console.error('Failed to record circuit breaker state change:', error)
    }
  }

  private async recordPerformanceMetric(metricName: string, value: number, unit: string): Promise<void> {
    try {
      const bankingManager = BankingTransactionManager.getInstance()
      await bankingManager.recordPerformanceMetric(
        'circuit-breaker-system',
        this.serviceName,
        'CIRCUIT_BREAKER',
        metricName,
        value,
        unit
      )
    } catch (error) {
      console.error('Failed to record circuit breaker metrics:', error)
    }
  }

  getState(): CircuitBreakerState {
    return this.state
  }

  getFailureCount(): number {
    return this.failureCount
  }

  getLastFailureTime(): number {
    return this.lastFailureTime
  }
}

export class CircuitBreakerManager {
  private static instance: CircuitBreakerManager
  private circuitBreakers = new Map<string, CircuitBreaker>()
  private readonly bankingManager = BankingTransactionManager.getInstance()

  static getInstance(): CircuitBreakerManager {
    if (!CircuitBreakerManager.instance) {
      CircuitBreakerManager.instance = new CircuitBreakerManager()
    }
    return CircuitBreakerManager.instance
  }

  getCircuitBreaker(serviceName: string, config?: Partial<CircuitBreakerConfig>): CircuitBreaker {
    if (!this.circuitBreakers.has(serviceName)) {
      this.circuitBreakers.set(serviceName, new CircuitBreaker(serviceName, config))
    }
    return this.circuitBreakers.get(serviceName)!
  }

  async loadCircuitBreakerStates(): Promise<void> {
    try {
      const states = await db.circuitBreakerStates.findMany()
      
      for (const state of states) {
        const circuitBreaker = this.getCircuitBreaker(state.serviceName)
        circuitBreaker['state'] = state.state as CircuitBreakerState
        circuitBreaker['failureCount'] = state.failureCount
        circuitBreaker['lastFailureTime'] = state.lastFailureTime.getTime()
      }
    } catch (error) {
      console.error('Failed to load circuit breaker states:', error)
    }
  }

  async getAllCircuitBreakerStates(): Promise<Array<{
    serviceName: string
    state: CircuitBreakerState
    failureCount: number
    lastFailureTime: Date | null
  }>> {
    return Array.from(this.circuitBreakers.entries()).map(([serviceName, cb]) => ({
      serviceName,
      state: cb.getState(),
      failureCount: cb.getFailureCount(),
      lastFailureTime: cb.getLastFailureTime() > 0 ? new Date(cb.getLastFailureTime()) : null
    }))
  }

  async resetCircuitBreaker(serviceName: string): Promise<void> {
    const circuitBreaker = this.getCircuitBreaker(serviceName)
    circuitBreaker['state'] = 'CLOSED'
    circuitBreaker['failureCount'] = 0
    circuitBreaker['successCount'] = 0
    
    try {
      await db.circuitBreakerStates.update({
        where: { serviceName },
        data: {
          state: 'CLOSED',
          failureCount: 0,
          lastFailureTime: null,
          updatedAt: new Date()
        }
      })
      
      await this.bankingManager.createAuditEntry(
        'circuit-breaker-system',
        'CIRCUIT_BREAKER_RESET',
        { serviceName },
        undefined,
        undefined
      )
    } catch (error) {
      console.error('Failed to reset circuit breaker:', error)
      throw error
    }
  }

  async healthCheck(): Promise<{
    healthy: boolean
    circuitBreakers: Array<{
      serviceName: string
      state: CircuitBreakerState
      healthy: boolean
    }>
  }> {
    const states = await this.getAllCircuitBreakerStates()
    const circuitBreakers = states.map(cb => ({
      serviceName: cb.serviceName,
      state: cb.state,
      healthy: cb.state !== 'OPEN'
    }))
    
    const healthy = circuitBreakers.every(cb => cb.healthy)
    
    await this.bankingManager.recordPerformanceMetric(
      'circuit-breaker-system',
      'health-check',
      'SYSTEM_HEALTH',
      'overall_health',
      healthy ? 1 : 0,
      'boolean',
      { circuitBreakers: circuitBreakers.length }
    )
    
    return { healthy, circuitBreakers }
  }
}

export default CircuitBreakerManager