const Redis = require('redis');

let redisClient = null;

const createRedisClient = async () => {
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  
  redisClient = Redis.createClient({
    url: redisUrl,
    socket: {
      reconnectStrategy: (retries) => {
        if (retries > 10) {
          console.error('Too many retries on Redis. Connection terminated');
          return new Error('Too many retries');
        }
        return Math.min(retries * 100, 3000);
      }
    }
  });

  redisClient.on('error', (err) => console.error('Redis Client Error:', err));
  redisClient.on('connect', () => console.log('Connected to Redis'));
  redisClient.on('reconnecting', () => console.log('Reconnecting to Redis...'));

  await redisClient.connect();
  return redisClient;
};

const getRedisClient = () => {
  if (!redisClient) {
    throw new Error('Redis client not initialized. Call createRedisClient first.');
  }
  return redisClient;
};

module.exports = {
  createRedisClient,
  getRedisClient
};

// Export redis client for direct use
module.exports.redis = {
  set: async (key, value, mode, duration) => {
    const client = getRedisClient();
    if (mode && duration) {
      return client.set(key, value, { [mode]: duration });
    }
    return client.set(key, value);
  },
  get: async (key) => {
    const client = getRedisClient();
    return client.get(key);
  },
  del: async (key) => {
    const client = getRedisClient();
    return client.del(key);
  },
  exists: async (key) => {
    const client = getRedisClient();
    return client.exists(key);
  },
  expire: async (key, seconds) => {
    const client = getRedisClient();
    return client.expire(key, seconds);
  }
};