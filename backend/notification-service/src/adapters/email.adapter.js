/**
 * Email Adapter (Strategy Pattern)
 * Replace with SendGrid/Mailgun in production.
 */
class EmailAdapter {
  async send(userId, message, metadata = {}) {
    console.log(`[Email] Sending to user ${userId}: "${message.substring(0, 80)}..."`);
    // Simulate async email sending
    await new Promise(r => setTimeout(r, 100));
    return { success: true, provider: 'console', sentAt: new Date() };
  }
}

module.exports = new EmailAdapter();
