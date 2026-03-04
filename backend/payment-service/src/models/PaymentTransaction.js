// Payment Transaction Model - For Saga Pattern
const db = require('../config/db');
const { v4: uuidv4 } = require('uuid');

class PaymentTransaction {
  /**
   * Create payment transaction (CHARGE/REFUND/CAPTURE)
   */
  static async create({ paymentId, transactionType, amount, provider, providerTransactionId = null }) {
    const validTypes = ['CHARGE', 'REFUND', 'CAPTURE'];
    if (!validTypes.includes(transactionType)) {
      throw new Error(`Invalid transaction type. Must be one of: ${validTypes.join(', ')}`);
    }

    const id = uuidv4();
    const query = `
      INSERT INTO payment_transactions 
        (id, payment_id, transaction_type, amount, provider, provider_transaction_id, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    const values = [id, paymentId, transactionType, amount, provider, providerTransactionId, 'PENDING'];
    
    const result = await db.query(query, values);
    return result.rows[0];
  }

  /**
   * Find transaction by ID
   */
  static async findById(id) {
    const query = 'SELECT * FROM payment_transactions WHERE id = $1';
    const result = await db.query(query, [id]);
    return result.rows[0];
  }

  /**
   * Find transactions by payment ID
   */
  static async findByPaymentId(paymentId) {
    const query = `
      SELECT * FROM payment_transactions 
      WHERE payment_id = $1 
      ORDER BY created_at DESC
    `;
    const result = await db.query(query, [paymentId]);
    return result.rows;
  }

  /**
   * Find transaction by provider transaction ID
   */
  static async findByProviderTransactionId(provider, providerTransactionId) {
    const query = `
      SELECT * FROM payment_transactions 
      WHERE provider = $1 AND provider_transaction_id = $2
      LIMIT 1
    `;
    const result = await db.query(query, [provider, providerTransactionId]);
    return result.rows[0];
  }

  /**
   * Update transaction status (SUCCESS/FAILED)
   */
  static async updateStatus(id, status, errorMessage = null) {
    const query = `
      UPDATE payment_transactions
      SET status = $1, error_message = $2
      WHERE id = $3
      RETURNING *
    `;
    const result = await db.query(query, [status, errorMessage, id]);
    return result.rows[0];
  }

  /**
   * Mark transaction as successful
   */
  static async markSuccess(id) {
    return this.updateStatus(id, 'SUCCESS', null);
  }

  /**
   * Mark transaction as failed
   */
  static async markFailed(id, errorMessage) {
    return this.updateStatus(id, 'FAILED', errorMessage);
  }

  /**
   * Get transaction history for payment (for Saga compensation)
   */
  static async getHistory(paymentId) {
    const query = `
      SELECT * FROM payment_transactions 
      WHERE payment_id = $1 
      ORDER BY created_at ASC
    `;
    const result = await db.query(query, [paymentId]);
    return result.rows;
  }
}

module.exports = PaymentTransaction;
