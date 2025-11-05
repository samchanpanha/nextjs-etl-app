// Redis Cache Implementation for ETL System
import Redis from 'ioredis';

let redis: Redis;

// Initialize Redis connection
export function initializeRedis() {
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  
  redis = new Redis(redisUrl, {
    retryDelayOnFailover: 100,
    maxRetriesPerRequest: 3,
    enableReadyCheck: false,
    lazyConnect: true,
    keepAlive: true,
    family: 4, // 4 (IPv4) or 6 (IPv6)
    connectTimeout: 10000,
    commandTimeout: 5000,
  });

  redis.on('error', (error) => {
    console.error('Redis connection error:', error);
  });

  redis.on('connect', () => {
    console.log('Redis connected successfully');
  });

  return redis;
}

// Get Redis instance
export function getRedis(): Redis {
  if (!redis) {
    redis = initializeRedis();
  }
  return redis;
}

// Export the redis instance as default
export { redis as default };

// Cache key generators
export const CACHE_KEYS = {
  USER: (id: string) => `user:${id}`,
  DATASOURCE: (id: string) => `datasource:${id}`,
  JOB: (id: string) => `job:${id}`,
  JOB_EXECUTION: (id: string) => `job_execution:${id}`,
  NOTIFICATION: (id: string) => `notification:${id}`,
  SYSTEM_SETTINGS: (key: string) => `system_settings:${key}`,
  USER_PERMISSIONS: (id: string) => `user_permissions:${id}`,
  DASHBOARD_DATA: (userId: string) => `dashboard:${userId}`,
  ANALYTICS_DATA: (type: string) => `analytics:${type}`,
} as const;

// Cache configuration
export const CACHE_CONFIG = {
  USER_DATA: { ttl: 3600 }, // 1 hour
  DASHBOARD_DATA: { ttl: 300 }, // 5 minutes
  ANALYTICS_DATA: { ttl: 1800 }, // 30 minutes
  SYSTEM_SETTINGS: { ttl: 600 }, // 10 minutes
  JOB_RESULTS: { ttl: 7200 }, // 2 hours
  USER_PERMISSIONS: { ttl: 1800 }, // 30 minutes
} as const;

// Cache utilities
export class CacheManager {
  private redis: Redis;

  constructor() {
    this.redis = getRedis();
  }

  /**
   * Set a value with TTL
   */
  async set(key: string, value: any, ttlSeconds?: number): Promise<void> {
    const serialized = JSON.stringify(value);
    
    if (ttlSeconds) {
      await this.redis.setex(key, ttlSeconds, serialized);
    } else {
      await this.redis.set(key, serialized);
    }
  }

  /**
   * Get a value
   */
  async get<T = any>(key: string): Promise<T | null> {
    const value = await this.redis.get(key);
    return value ? JSON.parse(value) : null;
  }

  /**
   * Delete a key
   */
  async del(key: string): Promise<void> {
    await this.redis.del(key);
  }

  /**
   * Delete multiple keys
   */
  async delPattern(pattern: string): Promise<void> {
    const keys = await this.redis.keys(pattern);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    const result = await this.redis.exists(key);
    return result === 1;
  }

  /**
   * Get multiple values
   */
  async mget<T = any>(keys: string[]): Promise<(T | null)[]> {
    const values = await this.redis.mget(keys);
    return values.map(value => value ? JSON.parse(value) : null);
  }

  /**
   * Set multiple values
   */
  async mset(keyValuePairs: Record<string, any>, ttlSeconds?: number): Promise<void> {
    const pipeline = this.redis.pipeline();
    
    for (const [key, value] of Object.entries(keyValuePairs)) {
      const serialized = JSON.stringify(value);
      if (ttlSeconds) {
        pipeline.setex(key, ttlSeconds, serialized);
      } else {
        pipeline.set(key, serialized);
      }
    }
    
    await pipeline.exec();
  }

  /**
   * Increment a counter
   */
  async incr(key: string): Promise<number> {
    return await this.redis.incr(key);
  }

  /**
   * Set expiration on existing key
   */
  async expire(key: string, ttlSeconds: number): Promise<void> {
    await this.redis.expire(key, ttlSeconds);
  }

  /**
   * Get TTL for a key
   */
  async ttl(key: string): Promise<number> {
    return await this.redis.ttl(key);
  }
}

// Singleton cache manager instance
export const cacheManager = new CacheManager();