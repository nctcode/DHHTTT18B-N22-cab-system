const { createClient } = require('redis');

let redisClient = null;

const initRedis = async () => {
  if (!redisClient) {
    redisClient = createClient({
      socket: {
        host: process.env.REDIS_HOST || 'redis',
        port: process.env.REDIS_PORT || 6379
      }
    });

    redisClient.on('error', (err) => console.error('Redis Auth Service Error:', err));
    
    await redisClient.connect();
    console.log('✅ Auth Service Redis connected');
  }
  return redisClient;
};

const getRedisClient = () => {
  return redisClient;
};

module.exports = { initRedis, getRedisClient };
