/**
 * Push Notification Adapter (Strategy Pattern)
 * Replace with Firebase Cloud Messaging in production.
 */
class PushAdapter {
  async send(userId, message, metadata = {}) {
    console.log(`[Push] Sending to user ${userId}: "${message.substring(0, 80)}..."`);
    await new Promise(r => setTimeout(r, 50));
    return { success: true, provider: 'console', sentAt: new Date() };
  }
}

module.exports = new PushAdapter();
