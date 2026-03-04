/**
 * SMS Adapter (Strategy Pattern)
 * Replace with Twilio in production.
 */
class SmsAdapter {
  async send(userId, message, metadata = {}) {
    console.log(`[SMS] Sending to user ${userId}: "${message.substring(0, 80)}..."`);
    await new Promise(r => setTimeout(r, 100));
    return { success: true, provider: 'console', sentAt: new Date() };
  }
}

module.exports = new SmsAdapter();
