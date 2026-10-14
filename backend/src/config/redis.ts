import { Redis } from 'ioredis';
import { env } from './env.js';
import { logger } from './logger.js';

let redisClient: Redis | null = null;
let isRedisAvailable = false;

// In-memory fallback cache
const memoryCache = new Map<string, { value: string; expiresAt: number }>();

try {
  redisClient = new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    retryStrategy(times) {
      if (times > 5) {
        logger.warn('Redis unavailable after 5 retries. Running in fallback in-memory mode.');
        return null; // stop reconnecting automatically
      }
      return Math.min(times * 500, 2000);
    },
    lazyConnect: true,
  });

  redisClient.on('connect', () => {
    isRedisAvailable = true;
    logger.info('Connected to Redis server');
  });

  redisClient.on('error', (err) => {
    if (isRedisAvailable) {
      logger.warn({ err }, 'Redis connection error. Falling back to in-memory mode.');
    }
    isRedisAvailable = false;
  });

  // Attempt initial connect asynchronously
  redisClient.connect().catch((err) => {
    logger.warn('Redis connection failed on startup. Utilizing in-memory cache/mock queue.');
    isRedisAvailable = false;
  });
} catch (error) {
  logger.warn('Failed to initialize Redis client. Fallback mode enabled.');
  isRedisAvailable = false;
}

export { redisClient };

export const isRedisConnected = (): boolean => isRedisAvailable;

export const cacheService = {
  async get(key: string): Promise<string | null> {
    if (isRedisAvailable && redisClient) {
      try {
        return await redisClient.get(key);
      } catch {
        // Fall back to memory
      }
    }
    const item = memoryCache.get(key);
    if (!item) return null;
    if (Date.now() > item.expiresAt) {
      memoryCache.delete(key);
      return null;
    }
    return item.value;
  },

  async set(key: string, value: string, ttlSeconds: number = 300): Promise<void> {
    if (isRedisAvailable && redisClient) {
      try {
        await redisClient.set(key, value, 'EX', ttlSeconds);
        return;
      } catch {
        // Fall back to memory
      }
    }
    memoryCache.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  },

  async del(key: string): Promise<void> {
    if (isRedisAvailable && redisClient) {
      try {
        await redisClient.del(key);
      } catch {
        // Ignore
      }
    }
    memoryCache.delete(key);
  },

  async delPattern(pattern: string): Promise<void> {
    if (isRedisAvailable && redisClient) {
      try {
        const keys = await redisClient.keys(pattern);
        if (keys.length > 0) {
          await redisClient.del(...keys);
        }
      } catch {
        // Ignore
      }
    }
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    for (const key of memoryCache.keys()) {
      if (regex.test(key)) {
        memoryCache.delete(key);
      }
    }
  },
};
