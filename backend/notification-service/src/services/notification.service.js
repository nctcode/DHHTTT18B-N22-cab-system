const Notification = require('../models/notification.model');
const { executeWithRetry } = require('../utils/retry');

// Channel adapter registry (strategy pattern)
const adapters = {
  EMAIL: require('../adapters/email.adapter'),
  SMS: require('../adapters/sms.adapter'),
  PUSH: require('../adapters/push.adapter'),
  IN_APP: require('../adapters/push.adapter'),
};

class NotificationService {

  /**
   * Process a notification from a domain event.
   * Idempotent: checks idempotencyKey before creating.
   */
  async processNotification({ userId, eventType, channel, message, idempotencyKey, metadata }) {
    // 1. Idempotency check
    if (idempotencyKey) {
      const existing = await Notification.findOne({ idempotencyKey });
      if (existing) {
        console.log(`[NotificationService] Duplicate ignored (key=${idempotencyKey})`);
        return existing;
      }
    }

    // 2. Create PENDING notification
    const notification = await Notification.create({
      userId,
      eventType,
      channel,
      message,
      status: 'PENDING',
      idempotencyKey,
      metadata: metadata || null,
      retryCount: 0
    });

    console.log(`[NotificationService] Created ${notification._id} (${eventType} → ${channel})`);

    // 3. Send asynchronously (non-blocking)
    this._sendAsync(notification);

    return notification;
  }

  /**
   * Send notification with retry. Does NOT block the caller.
   */
  async _sendAsync(notification) {
    const adapter = adapters[notification.channel];
    if (!adapter) {
      console.error(`[NotificationService] No adapter for channel: ${notification.channel}`);
      await Notification.findByIdAndUpdate(notification._id, { status: 'FAILED' });
      return;
    }

    try {
      await Notification.findByIdAndUpdate(notification._id, { status: 'RETRYING' });

      let attempt = 0;
      const result = await executeWithRetry(
        async () => {
          attempt++;
          await Notification.findByIdAndUpdate(notification._id, { retryCount: attempt });
          return adapter.send(notification.userId, notification.message, notification.metadata);
        },
        { maxAttempts: 5, baseDelay: 1000, factor: 2 }
      );

      // SENT
      await Notification.findByIdAndUpdate(notification._id, {
        status: 'SENT',
        sentAt: result.sentAt || new Date(),
        retryCount: attempt
      });

      console.log(`[NotificationService] ✅ Sent ${notification._id}`);

    } catch (error) {
      console.error(`[NotificationService] ❌ Failed ${notification._id} after retries: ${error.message}`);
      await Notification.findByIdAndUpdate(notification._id, { status: 'FAILED' });
    }
  }

  // ─── Read-Only Queries ───

  async getByUserId(userId, { page = 1, limit = 20 } = {}) {
    const skip = (page - 1) * limit;
    const [notifications, total] = await Promise.all([
      Notification.find({ userId }).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Notification.countDocuments({ userId })
    ]);
    return { notifications, total, page, limit };
  }

  async getById(id) {
    return Notification.findById(id);
  }

  async getByStatus(status, { page = 1, limit = 20 } = {}) {
    const skip = (page - 1) * limit;
    const [notifications, total] = await Promise.all([
      Notification.find({ status }).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Notification.countDocuments({ status })
    ]);
    return { notifications, total, page, limit };
  }
}

module.exports = new NotificationService();
