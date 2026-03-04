// Notification Model - Updated for new schema
const { pool } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

class Notification {
  /**
   * Create new notification with channel support
   */
  static async create({ userId, title, message, type, channel = 'IN_APP' }) {
    const validTypes = ['BOOKING_CONFIRMED', 'RIDE_ASSIGNED', 'RIDE_STARTED', 'RIDE_COMPLETED', 'PAYMENT_SUCCESS', 'SYSTEM_ALERT'];
    const validChannels = ['EMAIL', 'SMS', 'PUSH', 'IN_APP'];
    
    if (!validTypes.includes(type)) {
      throw new Error(`Invalid notification type. Must be one of: ${validTypes.join(', ')}`);
    }
    
    if (!validChannels.includes(channel)) {
      throw new Error(`Invalid channel. Must be one of: ${validChannels.join(', ')}`);
    }

    const id = uuidv4();
    const query = `
      INSERT INTO notifications (id, user_id, title, message, type, channel, status)
      VALUES ($1, $2, $3, $4, $5, $6, 'PENDING')
      RETURNING *
    `;
    const values = [id, userId, title, message, type, channel];
    
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  /**
   * Find notification by ID
   */
  static async findById(id) {
    const query = 'SELECT * FROM notifications WHERE id = $1';
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  /**
   * Find notifications by user ID with filtering
   */
  static async findByUserId(userId, limit = 20, offset = 0, options = {}) {
    const { isRead } = options;
    
    let query = 'SELECT * FROM notifications WHERE user_id = $1';
    const values = [userId];
    
    if (isRead !== undefined) {
      query += ` AND is_read = $${values.length + 1}`;
      values.push(isRead);
    }
    
    query += ` ORDER BY created_at DESC LIMIT $${values.length + 1} OFFSET $${values.length + 2}`;
    values.push(limit, offset);
    
    const result = await pool.query(query, values);
    return result.rows;
  }

  /**
   * Count unread notifications
   */
  static async countUnread(userId) {
    const query = `
      SELECT COUNT(*) as count 
      FROM notifications
      WHERE user_id = $1 AND is_read = FALSE
    `;
    const result = await pool.query(query, [userId]);
    return parseInt(result.rows[0].count);
  }

  /**
   * Mark notification as read
   */
  static async markAsRead(id, userId = null) {
    const query = userId 
      ? 'UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2 RETURNING *'
      : 'UPDATE notifications SET is_read = TRUE WHERE id = $1 RETURNING *';
    
    const values = userId ? [id, userId] : [id];
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  /**
   * Mark all notifications as read for user
   */
  static async markAllAsRead(userId) {
    const query = `
      UPDATE notifications 
      SET is_read = TRUE 
      WHERE user_id = $1 AND is_read = FALSE
      RETURNING *
    `;
    const result = await pool.query(query, [userId]);
    return result.rows;
  }

  /**
   * Update notification status (PENDING/SENT/FAILED)
   */
  static async updateStatus(id, status) {
    const validStatuses = ['PENDING', 'SENT', 'FAILED'];
    if (!validStatuses.includes(status)) {
      throw new Error(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
    }

    const query = `
      UPDATE notifications
      SET status = $1, sent_at = CASE WHEN $1 = 'SENT' THEN CURRENT_TIMESTAMP ELSE sent_at END
      WHERE id = $2
      RETURNING *
    `;
    const result = await pool.query(query, [status, id]);
    return result.rows[0];
  }

  /**
   * Delete old notifications (cleanup task)
   */
  static async deleteOlderThan(days) {
    const query = `
      DELETE FROM notifications
      WHERE created_at < NOW() - INTERVAL '${days} days'
    `;
    const result = await pool.query(query);
    return result.rowCount;
  }
}

module.exports = Notification;