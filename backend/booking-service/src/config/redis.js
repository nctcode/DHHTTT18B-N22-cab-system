// src/config/redis.js
const redis = require('redis');
const logger = require('../utils/logger');

let redisClient = null;

const createRedisClient = () => {
  try {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    
    const client = redis.createClient({
      url: redisUrl,
      socket: {
        reconnectStrategy: (retries) => {
          if (retries > 10) {
            logger.error('Too many retries on Redis. Connection terminated.');
            return new Error('Too many retries.');
          }
          return Math.min(retries * 100, 3000);
        }
      }
    });

    client.on('error', (err) => {
      logger.error('Redis Client Error:', err);
    });

    client.on('connect', () => {
      logger.info('Redis connected successfully');
    });

    client.on('ready', () => {
      logger.info('Redis client ready');
    });

    client.on('end', () => {
      logger.warn('Redis connection ended');
    });

    client.on('reconnecting', () => {
      logger.info('Redis reconnecting...');
    });

    return client;
  } catch (error) {
    logger.error('Failed to create Redis client:', error);
    throw error;
  }
};

const getRedisClient = () => {
  if (!redisClient) {
    redisClient = createRedisClient();
  }
  return redisClient;
};

const connectRedis = async () => {
  try {
    const client = getRedisClient();
    await client.connect();
    return client;
  } catch (error) {
    logger.error('Failed to connect to Redis:', error);
    throw error;
  }
};

const disconnectRedis = async () => {
  try {
    if (redisClient) {
      await redisClient.quit();
      redisClient = null;
      logger.info('Redis disconnected successfully');
    }
  } catch (error) {
    logger.error('Error disconnecting Redis:', error);
  }
};

const isRedisConnected = () => {
  return redisClient ? redisClient.isReady : false;
};

// Health check for Redis
const checkRedisHealth = async () => {
  try {
    if (!redisClient || !redisClient.isReady) {
      return { status: 'disconnected', message: 'Redis client not ready' };
    }
    
    await redisClient.ping();
    return { status: 'connected', message: 'Redis is healthy' };
  } catch (error) {
    return { status: 'error', message: error.message };
  }
};

module.exports = {
  createRedisClient,
  getRedisClient,
  connectRedis,
  disconnectRedis,
  isRedisConnected,
  checkRedisHealth
};