// Payment Method Model
const db = require('../config/db');
const { v4: uuidv4 } = require('uuid');

class PaymentMethod {
  /**
   * Create payment method for user
   */
  static async create({ userId, type, details, isDefault = false }) {
    const validTypes = ['CREDIT_CARD', 'E_WALLET', 'BANK_ACCOUNT'];
    if (!validTypes.includes(type)) {
      throw new Error(`Invalid payment method type. Must be one of: ${validTypes.join(', ')}`);
    }

    // If setting as default, unset other defaults for this user
    if (isDefault) {
      await this.unsetDefaultsForUser(userId);
    }

    const id = uuidv4();
    const query = `
      INSERT INTO payment_methods (id, user_id, type, details, is_default)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    const values = [id, userId, type, JSON.stringify(details), isDefault];
    
    const result = await db.query(query, values);
    return result.rows[0];
  }

  /**
   * Find payment method by ID
   */
  static async findById(id) {
    const query = 'SELECT * FROM payment_methods WHERE id = $1';
    const result = await db.query(query, [id]);
    return result.rows[0];
  }

  /**
   * Find all payment methods for user
   */
  static async findByUserId(userId) {
    const query = `
      SELECT * FROM payment_methods 
      WHERE user_id = $1 
      ORDER BY is_default DESC, created_at DESC
    `;
    const result = await db.query(query, [userId]);
    return result.rows;
  }

  /**
   * Get default payment method for user
   */
  static async getDefaultForUser(userId) {
    const query = `
      SELECT * FROM payment_methods 
      WHERE user_id = $1 AND is_default = TRUE 
      LIMIT 1
    `;
    const result = await db.query(query, [userId]);
    return result.rows[0];
  }

  /**
   * Set payment method as default
   */
  static async setAsDefault(id, userId) {
    // First unset all defaults for this user
    await this.unsetDefaultsForUser(userId);

    // Then set this one as default
    const query = `
      UPDATE payment_methods
      SET is_default = TRUE
      WHERE id = $1 AND user_id = $2
      RETURNING *
    `;
    const result = await db.query(query, [id, userId]);
    return result.rows[0];
  }

  /**
   * Unset all default payment methods for user
   */
  static async unsetDefaultsForUser(userId) {
    const query = `
      UPDATE payment_methods
      SET is_default = FALSE
      WHERE user_id = $1 AND is_default = TRUE
    `;
    await db.query(query, [userId]);
  }

  /**
   * Delete payment method
   */
  static async delete(id, userId) {
    const query = `
      DELETE FROM payment_methods
      WHERE id = $1 AND user_id = $2
      RETURNING *
    `;
    const result = await db.query(query, [id, userId]);
    return result.rows[0];
  }
}

module.exports = PaymentMethod;
