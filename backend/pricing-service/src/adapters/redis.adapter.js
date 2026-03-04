const { getRedisClient } = require('../config/redis');

const METRICS_TTL = 600; // 10 minutes
const SURGE_CACHE_TTL = 300; // 5 minutes

class RedisAdapter {

  _getClient() {
    const client = getRedisClient();
    if (!client) throw new Error('Redis not connected');
    return client;
  }

  // ─── Demand/Supply Metrics ───

  async updateDemand(zoneId) {
    const client = this._getClient();
    const key = `zone:${zoneId}:demand_count`;
    await client.incr(key);
    await client.expire(key, METRICS_TTL);
    await client.set(`zone:${zoneId}:last_updated`, Date.now().toString(), { EX: METRICS_TTL });
    console.log(`[Redis] Demand incremented for zone ${zoneId}`);
  }

  async updateSupply(zoneId) {
    const client = this._getClient();
    const key = `zone:${zoneId}:supply_count`;
    await client.incr(key);
    await client.expire(key, METRICS_TTL);
    await client.set(`zone:${zoneId}:last_updated`, Date.now().toString(), { EX: METRICS_TTL });
    console.log(`[Redis] Supply incremented for zone ${zoneId}`);
  }

  async getZoneMetrics(zoneId) {
    const client = this._getClient();
    const [demand, supply, lastUpdated] = await Promise.all([
      client.get(`zone:${zoneId}:demand_count`),
      client.get(`zone:${zoneId}:supply_count`),
      client.get(`zone:${zoneId}:last_updated`)
    ]);
    return {
      demand: parseInt(demand) || 0,
      supply: parseInt(supply) || 0,
      lastUpdated: lastUpdated ? parseInt(lastUpdated) : null
    };
  }

  // ─── Surge Cache (Redis as source of truth for active multiplier) ───

  async setSurgeMultiplier(zoneId, multiplier, version) {
    const client = this._getClient();
    const key = `surge:zone:${zoneId}`;
    
    // Versioned update: only update if version is newer
    const currentData = await client.get(key);
    if (currentData) {
      const parsed = JSON.parse(currentData);
      if (parsed.version && version <= parsed.version) {
        console.log(`[Redis] Skipping stale surge update for zone ${zoneId} (v${version} <= v${parsed.version})`);
        return false; // Race condition prevented
      }
    }

    const data = JSON.stringify({ multiplier, version, updatedAt: Date.now() });
    await client.set(key, data, { EX: SURGE_CACHE_TTL });
    console.log(`[Redis] Surge multiplier updated for zone ${zoneId}: ${multiplier}x (v${version})`);
    return true;
  }

  async getSurgeMultiplier(zoneId) {
    const client = this._getClient();
    const key = `surge:zone:${zoneId}`;
    const data = await client.get(key);
    if (!data) return { multiplier: 1.0, version: 0 };
    return JSON.parse(data);
  }

  async getAllSurgeMultipliers(zoneIds) {
    const client = this._getClient();
    const results = {};
    for (const zoneId of zoneIds) {
      const data = await client.get(`surge:zone:${zoneId}`);
      results[zoneId] = data ? JSON.parse(data) : { multiplier: 1.0, version: 0 };
    }
    return results;
  }

  // ─── In-Memory Fallback ───

  _inMemoryMetrics = {};
  _inMemorySurge = {};

  async updateDemandFallback(zoneId) {
    if (!this._inMemoryMetrics[zoneId]) this._inMemoryMetrics[zoneId] = { demand: 0, supply: 0 };
    this._inMemoryMetrics[zoneId].demand++;
  }

  async updateSupplyFallback(zoneId) {
    if (!this._inMemoryMetrics[zoneId]) this._inMemoryMetrics[zoneId] = { demand: 0, supply: 0 };
    this._inMemoryMetrics[zoneId].supply++;
  }

  async getZoneMetricsFallback(zoneId) {
    return this._inMemoryMetrics[zoneId] || { demand: 0, supply: 0, lastUpdated: null };
  }

  async setSurgeMultiplierFallback(zoneId, multiplier, version) {
    const current = this._inMemorySurge[zoneId];
    if (current && current.version >= version) return false;
    this._inMemorySurge[zoneId] = { multiplier, version, updatedAt: Date.now() };
    return true;
  }

  async getSurgeMultiplierFallback(zoneId) {
    return this._inMemorySurge[zoneId] || { multiplier: 1.0, version: 0 };
  }

  // ─── Auto-select Redis or Fallback ───

  async safeDemand(zoneId) {
    try { await this.updateDemand(zoneId); } catch { await this.updateDemandFallback(zoneId); }
  }

  async safeSupply(zoneId) {
    try { await this.updateSupply(zoneId); } catch { await this.updateSupplyFallback(zoneId); }
  }

  async safeGetMetrics(zoneId) {
    try { return await this.getZoneMetrics(zoneId); } catch { return await this.getZoneMetricsFallback(zoneId); }
  }

  async safeSetSurge(zoneId, multiplier, version) {
    try { return await this.setSurgeMultiplier(zoneId, multiplier, version); } catch { return await this.setSurgeMultiplierFallback(zoneId, multiplier, version); }
  }

  async safeGetSurge(zoneId) {
    try { return await this.getSurgeMultiplier(zoneId); } catch { return await this.getSurgeMultiplierFallback(zoneId); }
  }
}

module.exports = new RedisAdapter();
