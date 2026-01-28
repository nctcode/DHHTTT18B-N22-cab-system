// src/utils/helpers.js
const crypto = require('crypto');

class Helpers {
  static generateBookingId() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    return `BKG${timestamp}${random}`.toUpperCase();
  }
  
  static generateTransactionId() {
    return `TXN${Date.now()}${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
  }
  
  static generateEventId() {
    return `EVT${Date.now()}${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
  }
  
  static calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c; // Distance in km
    
    return distance;
  }
  
  static toRad(value) {
    return value * Math.PI / 180;
  }
  
  static formatDuration(minutes) {
    if (minutes < 60) {
      return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}min`;
  }
  
  static formatCurrency(amount, currency = 'VND') {
    if (currency === 'VND') {
      return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
        minimumFractionDigits: 0
      }).format(amount);
    }
    
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  }
  
  static maskSensitiveData(data) {
    if (typeof data !== 'object' || data === null) {
      return data;
    }
    
    const masked = { ...data };
    const sensitiveFields = ['password', 'token', 'secret', 'creditCard', 'cvv'];
    
    for (const field of sensitiveFields) {
      if (masked[field]) {
        masked[field] = '***MASKED***';
      }
    }
    
    return masked;
  }
  
  static validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  }
  
  static validatePhone(phone) {
    const re = /^[0-9]{10,15}$/;
    return re.test(phone);
  }
  
  static delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  static async retryOperation(operation, maxRetries = 3, delayMs = 1000) {
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await operation();
      } catch (error) {
        if (i === maxRetries - 1) throw error;
        await this.delay(delayMs * Math.pow(2, i)); // Exponential backoff
      }
    }
  }
  
  static sanitizeInput(input) {
    if (typeof input === 'string') {
      return input
        .replace(/[<>]/g, '') // Remove HTML tags
        .trim();
    }
    return input;
  }
}

module.exports = Helpers;