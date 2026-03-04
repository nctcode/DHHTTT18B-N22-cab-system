// src/config/redis.js
const { createClient } = require('redis');

let client = null;
let isConnected = false;

const connectRedis = async () => {
  // Check if Redis should be enabled
  if (process.env.REDIS_ENABLED === 'false') {
    console.log('🧠 Redis is disabled, using in-memory storage');
    return null;
  }

  try {
    const redisHost = process.env.REDIS_HOST || 'redis';
    const redisPort = process.env.REDIS_PORT || 6379;
    
    console.log(`🔄 Attempting to connect to Redis at ${redisHost}:${redisPort}`);
    
    client = createClient({
      socket: {
        host: redisHost,
        port: redisPort,
        reconnectStrategy: (retries) => {
          if (retries > 5) {
            console.log('❌ Too many retries on Redis. Using in-memory fallback.');
            return false; // Stop retrying
          }
          return Math.min(retries * 100, 3000);
        }
      },
      password: process.env.REDIS_PASSWORD || undefined
    });

    client.on('error', (err) => {
      console.error('Redis Client Error:', err.message);
      isConnected = false;
    });
    
    client.on('connect', () => {
      console.log('🔄 Connecting to Redis...');
    });
    
    client.on('ready', () => {
      console.log('✅ Redis connected successfully');
      isConnected = true;
    });
    
    client.on('end', () => {
      console.log('❌ Redis connection ended');
      isConnected = false;
    });

    await client.connect();
    return client;
  } catch (error) {
    console.error('❌ Failed to connect to Redis:', error.message);
    console.log('📝 Running in fallback mode (in-memory storage)');
    return null;
  }
};

const getRedisClient = () => {
  return client;
};

const isRedisConnected = () => {
  return isConnected;
};

module.exports = { connectRedis, getRedisClient, isRedisConnected };
