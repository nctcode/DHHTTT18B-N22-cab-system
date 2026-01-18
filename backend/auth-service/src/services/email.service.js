const nodemailer = require('nodemailer');
const ejs = require('ejs');
const path = require('path');

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT),
      secure: process.env.SMTP_PORT === '465',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      },
      tls: {
        rejectUnauthorized: false
      }
    });
  }

  async sendEmail(to, subject, template, data) {
    try {
      // Render email template
      const html = await ejs.renderFile(
        path.join(__dirname, '../templates/emails', `${template}.ejs`),
        data
      );

      const mailOptions = {
        from: process.env.EMAIL_FROM,
        to,
        subject,
        html,
        text: this.generatePlainText(html)
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log('Email sent:', info.messageId);
      return info;
    } catch (error) {
      console.error('Email sending error:', error);
      throw new Error('Failed to send email');
    }
  }

  generatePlainText(html) {
    // Simple HTML to plain text conversion
    return html
      .replace(/<[^>]*>/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  async sendPasswordResetEmail(email, resetToken, userName) {
    const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    
    return this.sendEmail(email, 'Reset Your Password - CAB Booking', 'password-reset', {
      userName,
      resetLink,
      expiryHours: 1,
      supportEmail: process.env.SUPPORT_EMAIL || 'support@cabbooking.com'
    });
  }

  async sendWelcomeEmail(email, userName) {
    return this.sendEmail(email, 'Welcome to CAB Booking System', 'welcome', {
      userName,
      appName: 'CAB Booking System',
      supportEmail: process.env.SUPPORT_EMAIL || 'support@cabbooking.com',
      dashboardLink: `${process.env.FRONTEND_URL}/dashboard`
    });
  }

  async sendEmailVerification(email, verificationToken, userName) {
    const verificationLink = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;
    
    return this.sendEmail(email, 'Verify Your Email - CAB Booking', 'email-verification', {
      userName,
      verificationLink,
      expiryHours: 24,
      supportEmail: process.env.SUPPORT_EMAIL || 'support@cabbooking.com'
    });
  }

  async sendAccountDeactivatedEmail(email, userName) {
    return this.sendEmail(email, 'Account Deactivated - CAB Booking', 'account-deactivated', {
      userName,
      supportEmail: process.env.SUPPORT_EMAIL || 'support@cabbooking.com',
      reactivationLink: `${process.env.FRONTEND_URL}/reactivate-account`
    });
  }
}

module.exports = new EmailService();