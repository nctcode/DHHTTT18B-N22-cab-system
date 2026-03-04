// src/redis/driver.cache.js
const { getRedisClient, isRedisConnected } = require('../config/redis');
const geoService = require('../services/driver.geo.service');

module.exports = {
  getRedisClient,
  isRedisConnected,
  ...geoService
};
