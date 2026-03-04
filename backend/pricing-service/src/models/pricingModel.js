// PostgreSQL-based Pricing Model
const db = require('../config/db');

class PricingModel {
  /**
   * Get active pricing rule for vehicle type
   */
  static async getPricingRule(vehicleType) {
    const query = `
      SELECT * FROM pricing_rules 
      WHERE vehicle_type = $1 AND active = TRUE 
      LIMIT 1
    `;
    
    const result = await db.query(query, [vehicleType]);
    return result.rows[0] || null;
  }

  /**
   * Get all active pricing rules
   */
  static async getAllPricingRules() {
    const query = `
      SELECT * FROM pricing_rules 
      WHERE active = TRUE 
      ORDER BY vehicle_type
    `;
    
    const result = await db.query(query);
    return result.rows;
  }

  /**
   * Calculate base price based on distance and time
   */
  static async calculateBasePrice(vehicleType, distanceKm, durationMin) {
    const rule = await this.getPricingRule(vehicleType);
    
    if (!rule) {
      throw new Error(`No active pricing rule found for vehicle type: ${vehicleType}`);
    }

    const priceDistance = rule.price_per_km * distanceKm;
    const priceTime = rule.price_per_min * durationMin;
    const basePrice = parseFloat(rule.base_price) + priceDistance + priceTime;

    // Apply minimum fare
    const finalPrice = Math.max(basePrice, parseFloat(rule.min_fare));

    return {
      vehicleType,
      basePrice: parseFloat(rule.base_price),
      distancePrice: priceDistance,
      timePrice: priceTime,
      subtotal: basePrice,
      minFare: parseFloat(rule.min_fare),
      finalPrice: Math.round(finalPrice)  // Round to nearest VND
    };
  }

  /**
   * Get active surge zone for location
   */
  static async getSurgeZone(lat, lng) {
    const now = new Date().toISOString();
    
    // Query for zones that contain the location (within radius) and are currently active
    const query = `
      SELECT *, 
        (6371 * acos(
          cos(radians($1)) * cos(radians(lat)) * 
          cos(radians(lng) - radians($2)) + 
          sin(radians($1)) * sin(radians(lat))
        )) AS distance_km
      FROM surge_zones
      WHERE active = TRUE 
        AND valid_from <= $3
        AND valid_until >= $3
      HAVING distance_km <= radius_km
      ORDER BY surge_multiplier DESC, distance_km ASC
      LIMIT 1
    `;
    
    const result = await db.query(query, [lat, lng, now]);
    return result.rows[0] || null;
  }

  /**
   * Get all active surge zones
   */
  static async getActiveSurgeZones() {
    const now = new Date().toISOString();
    
    const query = `
      SELECT * FROM surge_zones
      WHERE active = TRUE 
        AND valid_from <= $1
        AND valid_until >= $1
      ORDER BY surge_multiplier DESC
    `;
    
    const result = await db.query(query, [now]);
    return result.rows;
  }

  /**
   * Create surge zone (Admin only)
   */
  static async createSurgeZone(zoneData) {
    const query = `
      INSERT INTO surge_zones 
        (zone_name, lat, lng, radius_km, surge_multiplier, valid_from, valid_until, active)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;
    
    const values = [
      zoneData.zoneName,
      zoneData.lat,
      zoneData.lng,
      zoneData.radiusKm,
      zoneData.surgeMultiplier,
      zoneData.validFrom,
      zoneData.validUntil,
      zoneData.active !== false  // Default to true
    ];
    
    const result = await db.query(query, values);
    return result.rows[0];
  }

  /**
   * Deactivate surge zone
   */
  static async deactivateSurgeZone(zoneId) {
    const query = `
      UPDATE surge_zones 
      SET active = FALSE 
      WHERE id = $1 
      RETURNING *
    `;
    
    const result = await db.query(query, [zoneId]);
    return result.rows[0];
  }

  /**
   * Update pricing rule (Admin only)
   */
  static async updatePricingRule(vehicleType, ruleData) {
    // Deactivate old rules for this vehicle type
    await db.query(
      'UPDATE pricing_rules SET active = FALSE WHERE vehicle_type = $1',
      [vehicleType]
    );

    // Insert new rule
    const query = `
      INSERT INTO pricing_rules 
        (vehicle_type, base_price, price_per_km, price_per_min, min_fare, active)
      VALUES ($1, $2, $3, $4, $5, TRUE)
      RETURNING *
    `;
    
    const values = [
      vehicleType,
      ruleData.basePrice,
      ruleData.pricePerKm,
      ruleData.pricePerMin,
      ruleData.minFare
    ];
    
    const result = await db.query(query, values);
    return result.rows[0];
  }
}

module.exports = PricingModel;