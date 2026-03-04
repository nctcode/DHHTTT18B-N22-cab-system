// backend/shared/encryption/index.js
/**
 * Data Encryption and Masking Utilities
 * For PII, payment data, and sensitive information
 */

const crypto = require('crypto');

// Encryption algorithm
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;
const TAG_POSITION = SALT_LENGTH + IV_LENGTH;
const ENCRYPTED_POSITION = TAG_POSITION + TAG_LENGTH;

/**
 * Get encryption key from environment or generate one
 */
const getEncryptionKey = () => {
  const key = process.env.ENCRYPTION_KEY;
  
  if (!key) {
    console.warn('⚠️ ENCRYPTION_KEY not set in environment. Using default (INSECURE for production!)');
    // In production, this should throw an error
    return crypto.scryptSync('default-insecure-key', 'salt', 32);
  }
  
  // Derive 32-byte key from the provided key
  return crypto.scryptSync(key, 'app-salt', 32);
};

/**
 * Encrypt sensitive data
 * @param {string} text - Plain text to encrypt
 * @returns {string} - Encrypted text in base64
 */
const encrypt = (text) => {
  if (!text) return text;
  
  try {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const salt = crypto.randomBytes(SALT_LENGTH);
    
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    
    const encrypted = Buffer.concat([
      cipher.update(String(text), 'utf8'),
      cipher.final()
    ]);
    
    const tag = cipher.getAuthTag();
    
    // Combine: salt + iv + tag + encrypted
    const result = Buffer.concat([salt, iv, tag, encrypted]);
    
    return result.toString('base64');
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
};

/**
 * Decrypt encrypted data
 * @param {string} encryptedData - Encrypted text in base64
 * @returns {string} - Decrypted plain text
 */
const decrypt = (encryptedData) => {
  if (!encryptedData) return encryptedData;
  
  try {
    const key = getEncryptionKey();
    const data = Buffer.from(encryptedData, 'base64');
    
    const salt = data.slice(0, SALT_LENGTH);
    const iv = data.slice(SALT_LENGTH, TAG_POSITION);
    const tag = data.slice(TAG_POSITION, ENCRYPTED_POSITION);
    const encrypted = data.slice(ENCRYPTED_POSITION);
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    
    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final()
    ]);
    
    return decrypted.toString('utf8');
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt data');
  }
};

/**
 * Hash sensitive data (one-way, cannot be reversed)
 * @param {string} data - Data to hash
 * @returns {string} - Hashed data
 */
const hash = (data) => {
  if (!data) return data;
  
  return crypto
    .createHash('sha256')
    .update(String(data))
    .digest('hex');
};

/**
 * Mask email address
 * Example: john.doe@example.com -> j**n.d**@example.com
 */
const maskEmail = (email) => {
  if (!email || !email.includes('@')) return email;
  
  const [username, domain] = email.split('@');
  
  if (username.length <= 2) {
    return `${username[0]}***@${domain}`;
  }
  
  const masked = `${username[0]}${'*'.repeat(username.length - 2)}${username[username.length - 1]}`;
  return `${masked}@${domain}`;
};

/**
 * Mask phone number
 * Example: +84901234567 -> +849012****7
 */
const maskPhone = (phone) => {
  if (!phone || phone.length < 4) return phone;
  
  const visible = 6; // Show first 6 and last 1
  const masked = phone.slice(0, visible) + '*'.repeat(Math.max(0, phone.length - visible - 1)) + phone.slice(-1);
  
  return masked;
};

/**
 * Mask credit card number
 * Example: 4111111111111111 -> 4111 **** **** 1111
 */
const maskCreditCard = (cardNumber) => {
  if (!cardNumber || cardNumber.length < 8) return cardNumber;
  
  const cleaned = cardNumber.replace(/\s/g, '');
  const first4 = cleaned.slice(0, 4);
  const last4 = cleaned.slice(-4);
  
  return `${first4} **** **** ${last4}`;
};

/**
 * Mask personal ID / SSN
 * Example: 123456789 -> ***456***
 */
const maskPersonalId = (id) => {
  if (!id || id.length < 6) return '***';
  
  const middle = id.slice(3, 6);
  return `***${middle}***`;
};

/**
 * Mask object fields recursively
 */
const maskObject = (obj, fieldsToMask = ['email', 'phone', 'cardNumber', 'ssn']) => {
  if (!obj || typeof obj !== 'object') return obj;
  
  const masked = Array.isArray(obj) ? [] : {};
  
  for (const [key, value] of Object.entries(obj)) {
    if (fieldsToMask.includes(key)) {
      // Apply appropriate masking
      if (key === 'email') {
        masked[key] = maskEmail(value);
      } else if (key === 'phone') {
        masked[key] = maskPhone(value);
      } else if (key === 'cardNumber' || key === 'card_number') {
        masked[key] = maskCreditCard(value);
      } else if (key === 'ssn' || key === 'personalId') {
        masked[key] = maskPersonalId(value);
      } else {
        masked[key] = '***MASKED***';
      }
    } else if (typeof value === 'object' && value !== null) {
      masked[key] = maskObject(value, fieldsToMask);
    } else {
      masked[key] = value;
    }
  }
  
  return masked;
};

/**
 * Encrypt specific fields in an object
 */
const encryptFields = (obj, fieldsToEncrypt = []) => {
  if (!obj || typeof obj !== 'object') return obj;
  
  const encrypted = { ...obj };
  
  for (const field of fieldsToEncrypt) {
    if (encrypted[field]) {
      encrypted[field] = encrypt(encrypted[field]);
    }
  }
  
  return encrypted;
};

/**
 * Decrypt specific fields in an object
 */
const decryptFields = (obj, fieldsToDecrypt = []) => {
  if (!obj || typeof obj !== 'object') return obj;
  
  const decrypted = { ...obj };
  
  for (const field of fieldsToDecrypt) {
    if (decrypted[field]) {
      try {
        decrypted[field] = decrypt(decrypted[field]);
      } catch (error) {
        console.error(`Failed to decrypt field: ${field}`, error);
      }
    }
  }
  
  return decrypted;
};

/**
 * Generate secure random token
 */
const generateSecureToken = (length = 32) => {
  return crypto.randomBytes(length).toString('hex');
};

module.exports = {
  encrypt,
  decrypt,
  hash,
  maskEmail,
  maskPhone,
  maskCreditCard,
  maskPersonalId,
  maskObject,
  encryptFields,
  decryptFields,
  generateSecureToken
};
