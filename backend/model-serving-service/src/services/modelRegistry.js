const fs = require('fs');
const path = require('path');

const MODELS_DIR = path.join(__dirname, '../models');

class ModelRegistry {
  constructor() {
    this.models = {};
    this.loadAll();
  }

  loadAll() {
    const types = ['matching', 'eta', 'surge'];
    for (const type of types) {
      this.loadLatest(type);
    }
  }

  loadLatest(modelType) {
    const files = fs.readdirSync(MODELS_DIR)
      .filter(f => f.startsWith(`${modelType}_`) && f.endsWith('.json'))
      .sort()
      .reverse();

    if (files.length === 0) {
      console.warn(`⚠️ No model file found for type: ${modelType}`);
      return;
    }

    const filePath = path.join(MODELS_DIR, files[0]);
    const model = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    this.models[modelType] = model;
    console.log(`✅ Loaded model: ${modelType} (${model.version})`);
  }

  getModel(modelType) {
    return this.models[modelType] || null;
  }

  listModels() {
    return Object.entries(this.models).map(([type, model]) => ({
      type,
      version: model.version,
      algorithm: model.algorithm,
      trainedAt: model.trainedAt,
    }));
  }

  reloadAll() {
    this.models = {};
    this.loadAll();
    return this.listModels();
  }

  // ── Prediction engines ──

  predictMatching(features) {
    const model = this.getModel('matching');
    if (!model) throw new Error('Matching model not loaded');

    const w = model.weights;
    const norm = model.normalization;

    // Score each driver
    return features.drivers.map(driver => {
      const distNorm = Math.min(driver.distanceKm / norm.maxDistanceKm, 1.0);
      const ratingNorm = (driver.rating - norm.minRating) / (norm.maxRating - norm.minRating);
      const acceptNorm = driver.acceptanceRate || 0.85;
      const cancelNorm = driver.cancellationRate || 0.05;
      const respNorm = Math.min((driver.avgResponseTimeSec || 15) / 60, 1.0);

      const score =
        w.distanceScore * distNorm +
        w.ratingScore * ratingNorm +
        w.acceptanceRateScore * acceptNorm +
        w.cancellationRateScore * cancelNorm +
        w.responseTimeScore * respNorm;

      return {
        driverId: driver.driverId,
        score: parseFloat(score.toFixed(4)),
        confidence: 0.85, // static until real training data
      };
    }).sort((a, b) => b.score - a.score);
  }

  predictETA(features) {
    const model = this.getModel('eta');
    if (!model) throw new Error('ETA model not loaded');

    const c = model.coefficients;
    const tc = model.tripDurationCoefficients;
    const { distanceKm, hourOfDay, dayOfWeek } = features;

    const isMorningRush = hourOfDay >= 7 && hourOfDay <= 9 ? 1 : 0;
    const isEveningRush = hourOfDay >= 17 && hourOfDay <= 19 ? 1 : 0;
    const isNight = (hourOfDay >= 22 || hourOfDay <= 5) ? 1 : 0;
    const isWeekend = (dayOfWeek === 0 || dayOfWeek === 6) ? 1 : 0;

    let arrivalMin =
      c.intercept +
      c.distanceKm * distanceKm +
      c.hourOfDay_rushMorning * isMorningRush +
      c.hourOfDay_rushEvening * isEveningRush +
      c.hourOfDay_night * isNight +
      c.isWeekend * isWeekend;

    let tripDurationMin =
      tc.intercept +
      tc.distanceKm * distanceKm +
      tc.hourOfDay_rushMorning * isMorningRush +
      tc.hourOfDay_rushEvening * isEveningRush +
      tc.hourOfDay_night * isNight +
      tc.isWeekend * isWeekend;

    return {
      predictedArrivalMinutes: Math.max(1, Math.round(arrivalMin)),
      predictedTripDurationMinutes: Math.max(2, Math.round(tripDurationMin)),
      distanceKm: parseFloat(distanceKm.toFixed(2)),
    };
  }

  predictSurge(features) {
    const model = this.getModel('surge');
    if (!model) throw new Error('Surge model not loaded');

    const c = model.coefficients;
    const { demandCount, supplyCount, hourOfDay, dayOfWeek, specialEvent } = features;

    const ratio = supplyCount > 0 ? demandCount / supplyCount : 3.0;
    const isRush = (hourOfDay >= 7 && hourOfDay <= 9) || (hourOfDay >= 17 && hourOfDay <= 19) ? 1 : 0;
    const isWeekend = (dayOfWeek === 0 || dayOfWeek === 6) ? 1 : 0;
    const isSpecial = specialEvent ? 1 : 0;

    // Logistic-style score
    const rawScore =
      c.intercept +
      c.demandSupplyRatio * ratio +
      c.isRushHour * isRush +
      c.isWeekend * isWeekend +
      c.isSpecialEvent * isSpecial;

    // Map score to surge level
    const levels = model.surgeLevels;
    let surgeLevel = 'NONE';
    let surgeMultiplier = 1.0;

    for (const [level, config] of Object.entries(levels)) {
      if (rawScore >= config.min && rawScore < config.max) {
        surgeLevel = level;
        surgeMultiplier = config.multiplier;
        break;
      }
    }

    return {
      surgeMultiplier,
      surgeLevel,
      rawScore: parseFloat(rawScore.toFixed(4)),
      confidence: 0.80,
    };
  }
}

module.exports = new ModelRegistry();
