const Redis = require('ioredis');
require('dotenv').config();

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  retryStrategy: (times) => Math.min(times * 200, 5000),
  maxRetriesPerRequest: 3,
});

redis.on('connect', () => console.log('✅ Feature Store Redis connected'));
redis.on('error', (err) => console.error('Redis error:', err.message));

module.exports = redis;
