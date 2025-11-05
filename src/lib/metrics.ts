// Performance Monitoring and Metrics Collection
import { PrismaClient } from '@prisma/client';
import { redis } from './cache';
import { getClientIP } from './auth';

interface MetricsCollector {
  recordRequest(method: string, endpoint: string, statusCode: number, duration: number, userId?: string): void;
  recordDatabaseQuery(query: string, duration: number, success: boolean): void;
  recordCacheOperation(operation: 'get' | 'set' | 'delete', key: string, hit: boolean): void;
  recordJobExecution(jobId: string, duration: number, recordsProcessed: number, success: boolean): void;
  recordSystemMetrics(): Promise<void>;
}

class MetricsCollectorImpl implements MetricsCollector {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  /**
   * Record HTTP request metrics
   */
  async recordRequest(
    method: string,
    endpoint: string,
    statusCode: number,
    duration: number,
    userId?: string
  ): Promise<void> {
    const metric = {
      timestamp: new Date(),
      type: 'http_request',
      method,
      endpoint,
      statusCode,
      duration,
      userId,
    };

    // Store in Redis for real-time monitoring
    await redis.lpush('metrics:http_requests', JSON.stringify(metric));
    await redis.ltrim('metrics:http_requests', 0, 999); // Keep last 1000 entries

    // Store critical metrics in database
    if (statusCode >= 400 || duration > 1000) {
      await this.prisma.systemSettings.upsert({
        where: { key: `metric_${Date.now()}` },
        update: {},
        create: {
          key: `metric_${Date.now()}`,
          value: JSON.stringify(metric),
          description: 'Performance metric',
        },
      });
    }
  }

  /**
   * Record database query metrics
   */
  async recordDatabaseQuery(query: string, duration: number, success: boolean): Promise<void> {
    const metric = {
      timestamp: new Date(),
      type: 'database_query',
      query: query.substring(0, 100), // Truncate for privacy
      duration,
      success,
    };

    await redis.lpush('metrics:database_queries', JSON.stringify(metric));
    await redis.ltrim('metrics:database_queries', 0, 999);
  }

  /**
   * Record cache operation metrics
   */
  async recordCacheOperation(operation: 'get' | 'set' | 'delete', key: string, hit: boolean): Promise<void> {
    const metric = {
      timestamp: new Date(),
      type: 'cache_operation',
      operation,
      key: key.substring(0, 50), // Truncate for privacy
      hit,
    };

    await redis.lpush('metrics:cache_operations', JSON.stringify(metric));
    await redis.ltrim('metrics:cache_operations', 0, 999);
  }

  /**
   * Record job execution metrics
   */
  async recordJobExecution(
    jobId: string,
    duration: number,
    recordsProcessed: number,
    success: boolean
  ): Promise<void> {
    const metric = {
      timestamp: new Date(),
      type: 'job_execution',
      jobId,
      duration,
      recordsProcessed,
      success,
    };

    await redis.lpush('metrics:job_executions', JSON.stringify(metric));
    await redis.ltrim('metrics:job_executions', 0, 999);
  }

  /**
   * Record system-level metrics
   */
  async recordSystemMetrics(): Promise<void> {
    const metrics = {
      timestamp: new Date(),
      type: 'system_metrics',
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
      uptime: process.uptime(),
      eventLoopLag: await this.measureEventLoopLag(),
    };

    await redis.lpush('metrics:system', JSON.stringify(metrics));
    await redis.ltrim('metrics:system', 0, 99); // Keep last 100 entries
  }

  /**
   * Get real-time metrics for dashboard
   */
  async getRealTimeMetrics(): Promise<any> {
    const [
      httpRequests,
      systemMetrics,
      cacheMetrics,
      jobMetrics,
    ] = await Promise.all([
      redis.lrange('metrics:http_requests', 0, 49),
      redis.lrange('metrics:system', 0, 9),
      redis.lrange('metrics:cache_operations', 0, 49),
      redis.lrange('metrics:job_executions', 0, 19),
    ]);

    return {
      httpRequests: httpRequests.map(JSON.parse),
      systemMetrics: systemMetrics.map(JSON.parse),
      cacheMetrics: cacheMetrics.map(JSON.parse),
      jobMetrics: jobMetrics.map(JSON.parse),
    };
  }

  /**
   * Measure event loop lag
   */
  private async measureEventLoopLag(): Promise<number> {
    return new Promise((resolve) => {
      const start = process.hrtime.bigint();
      setImmediate(() => {
        const end = process.hrtime.bigint();
        resolve(Number(end - start) / 1e6); // Convert to milliseconds
      });
    });
  }

  /**
   * Get performance alerts
   */
  async getPerformanceAlerts(): Promise<any[]> {
    const alerts = [];
    
    // Check for slow requests
    const slowRequests = await redis.lrange('metrics:http_requests', 0, 99);
    const slowCount = slowRequests.filter(req => {
      const metric = JSON.parse(req);
      return metric.duration > 2000; // Requests taking more than 2 seconds
    }).length;

    if (slowCount > 10) {
      alerts.push({
        type: 'performance_warning',
        message: `${slowCount} slow requests detected in the last 100 requests`,
        severity: 'warning',
      });
    }

    // Check for high error rate
    const recentRequests = await redis.lrange('metrics:http_requests', 0, 19);
    const errorCount = recentRequests.filter(req => {
      const metric = JSON.parse(req);
      return metric.statusCode >= 400;
    }).length;

    const errorRate = errorCount / recentRequests.length;
    if (errorRate > 0.1) {
      alerts.push({
        type: 'high_error_rate',
        message: `High error rate: ${(errorRate * 100).toFixed(1)}%`,
        severity: 'error',
      });
    }

    // Check memory usage
    const systemMetrics = await redis.lrange('metrics:system', 0, 0);
    if (systemMetrics.length > 0) {
      const memory = JSON.parse(systemMetrics[0]).memory;
      const memoryUsagePercent = (memory.heapUsed / memory.heapTotal) * 100;
      
      if (memoryUsagePercent > 90) {
        alerts.push({
          type: 'high_memory_usage',
          message: `High memory usage: ${memoryUsagePercent.toFixed(1)}%`,
          severity: 'warning',
        });
      }
    }

    return alerts;
  }
}

// Singleton instance
export const metricsCollector = new MetricsCollectorImpl();

// Performance monitoring middleware
export function performanceMonitor() {
  return async (handler: any, req: any) => {
    const start = process.hrtime.bigint();
    const startTime = Date.now();

    try {
      const response = await handler(req);
      const duration = Number(process.hrtime.bigint() - start) / 1e6;

      await metricsCollector.recordRequest(
        req.method,
        req.url,
        response.status,
        duration,
        req.user?.id
      );

      return response;
    } catch (error) {
      const duration = Number(process.hrtime.bigint() - start) / 1e6;
      
      await metricsCollector.recordRequest(
        req.method,
        req.url,
        500,
        duration,
        req.user?.id
      );

      throw error;
    }
  };
}

// Database query monitoring
export function monitorQuery(queryFn: Function) {
  return async (...args: any[]) => {
    const start = process.hrtime.bigint();
    let success = true;
    let error = null;

    try {
      const result = await queryFn(...args);
      return result;
    } catch (err) {
      success = false;
      error = err;
      throw err;
    } finally {
      const duration = Number(process.hrtime.bigint() - start) / 1e6;
      await metricsCollector.recordDatabaseQuery(
        queryFn.toString(),
        duration,
        success
      );
    }
  };
}

// System metrics collection
setInterval(() => {
  metricsCollector.recordSystemMetrics();
}, 30000); // Every 30 seconds