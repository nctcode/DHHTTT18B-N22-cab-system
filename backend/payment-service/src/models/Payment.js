// Payment Model - PostgreSQL
const db = require('../config/db');
const { v4: uuidv4 } = require('uuid');

class Payment {
  /**
   * Create new payment
   */
  static async create({ rideId, passengerId, driverId, amount, method = 'CASH' }) {
    // Validate rideId format (MongoDB ObjectId or ride_xxxx format)
    if (!rideId || typeof rideId !== 'string' || !rideId.trim()) {
      throw new Error('rideId must be a non-empty string');
    }

    const id = uuidv4();
    const query = `
      INSERT INTO payments (id, ride_id, passenger_id, driver_id, amount, method, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    const values = [id, rideId, passengerId, driverId, amount, method, 'PENDING'];
    
    const result = await db.query(query, values);
    return result.rows[0];
  }

  /**
   * Find payment by ID
   */
  static async findById(id) {
    const query = 'SELECT * FROM payments WHERE id = $1';
    const result = await db.query(query, [id]);
    return result.rows[0];
  }

  /**
   * Find payment by ride ID
   */
  static async findByRideId(rideId) {
    const query = `
      SELECT * FROM payments 
      WHERE ride_id = $1 
      ORDER BY created_at DESC
    `;
    const result = await db.query(query, [rideId]);
    return result.rows;
  }

  /**
   * Find payments by passenger ID
   */
  static async findByPassengerId(passengerId, options = {}) {
    const { limit = 20, offset = 0, status } = options;
    
    let query = `
      SELECT * FROM payments 
      WHERE passenger_id = $1
    `;
    const values = [passengerId];
    
    if (status) {
      query += ` AND status = $${values.length + 1}`;
      values.push(status);
    }
    
    query += ` ORDER BY created_at DESC LIMIT $${values.length + 1} OFFSET $${values.length + 2}`;
    values.push(limit, offset);
    
    const result = await db.query(query, values);
    return result.rows;
  }

  /**
   * Update payment status
   */
  static async updateStatus(id, status) {
    const query = `
      UPDATE payments
      SET status = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `;
    const result = await db.query(query, [status, id]);
    return result.rows[0];
  }

  /**
   * Process payment (mark as SUCCESS)
   */
  static async confirm(id) {
    return this.updateStatus(id, 'SUCCESS');
  }

  /**
   * Refund payment
   */
  static async refund(id) {
    return this.updateStatus(id, 'REFUNDED');
  }

  /**
   * Fail payment
   */
  static async fail(id) {
    return this.updateStatus(id, 'FAILED');
  }
}

module.exports = Payment;