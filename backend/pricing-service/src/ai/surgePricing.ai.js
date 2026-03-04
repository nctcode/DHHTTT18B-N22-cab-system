/**
 * Surge Pricing AI Module (Mock)
 * 
 * Replace this with a real ML model in production.
 * Input: feature vector with demand, supply, time context.
 * Output: surge multiplier (1.0 – 3.0)
 */
class SurgePricingAI {

  /**
   * @param {Object} features
   * @param {number} features.demand - Current demand count
   * @param {number} features.supply - Current supply count
   * @param {number} features.hour - Hour of day (0-23)
   * @param {boolean} features.isWeekend
   * @param {boolean} features.isSpecialEvent
   * @returns {number} multiplier (1.0 – 3.0)
   */
  calculateMultiplier(features) {
    const { demand = 0, supply = 1, hour = 12, isWeekend = false, isSpecialEvent = false } = features;

    let multiplier = 1.0;

    // Demand/Supply ratio
    const ratio = supply > 0 ? demand / supply : demand;
    if (ratio > 3) {
      multiplier = 2.0;
    } else if (ratio > 2) {
      multiplier = 1.5;
    } else if (ratio > 1.5) {
      multiplier = 1.2;
    }

    // Peak hours: 7-9 AM, 5-8 PM
    const isPeakHour = (hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 20);
    if (isPeakHour) {
      multiplier += 0.3;
    }

    // Weekend premium
    if (isWeekend) {
      multiplier += 0.1;
    }

    // Special event premium
    if (isSpecialEvent) {
      multiplier += 0.5;
    }

    // Clamp between 1.0 and 3.0
    multiplier = Math.max(1.0, Math.min(3.0, multiplier));

    // Round to 1 decimal
    multiplier = Math.round(multiplier * 10) / 10;

    console.log(`[AI] Features: ratio=${ratio.toFixed(2)}, hour=${hour}, peak=${isPeakHour}, weekend=${isWeekend}, event=${isSpecialEvent} → Multiplier: ${multiplier}x`);
    return multiplier;
  }
}

module.exports = new SurgePricingAI();
