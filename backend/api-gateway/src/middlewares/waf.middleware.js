// src/middlewares/waf.middleware.js
/**
 * Web Application Firewall (WAF) Middleware
 * Protects against common web attacks: SQL Injection, XSS, etc.
 */

const createError = (message, code = 'SECURITY_VIOLATION') => {
  const error = new Error(message);
  error.code = code;
  error.status = 400;
  return error;
};

/**
 * SQL Injection detection patterns
 * Updated to avoid false positives on Unicode text (Vietnamese, etc.)
 */
const SQL_INJECTION_PATTERNS = [
  // SQL keywords with word boundaries - only match when standalone
  /(^|\s)(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE|UNION|DECLARE|CAST)\s/gi,
  
  // SQL comment patterns - but allow single dashes in text
  /(--\s|\/\*|\*\/)/g,
  
  // Dangerous SQL functions and system objects - word boundary required
  /\b(xp_|sp_|sysobjects|syscolumns|information_schema)\b/gi,
  
  // SQL injection specific patterns - quotes with SQL context
  /('\s*(OR|AND)\s*'?\d)/gi,
  /('\s*(OR|AND)\s*'\w+'\s*=\s*')/gi,
  
  // Multiple semicolons or unusual SQL syntax
  /(;\s*(DROP|DELETE|UPDATE|INSERT))/gi
];

/**
 * XSS (Cross-Site Scripting) detection patterns
 */
const XSS_PATTERNS = [
  /<script[^>]*>.*?<\/script>/gi,
  /<iframe[^>]*>.*?<\/iframe>/gi,
  /javascript:/gi,
  /on\w+\s*=/gi, // Event handlers like onclick=, onload=
  /<img[^>]*onerror/gi,
  /<svg[^>]*onload/gi,
  /eval\s*\(/gi,
  /expression\s*\(/gi
];

/**
 * Path Traversal detection
 */
const PATH_TRAVERSAL_PATTERNS = [
  /\.\.(\/|\\)/g,
  /\.(\/|\\)\./g,
  /%2e%2e/gi,
  /%252e%252e/gi
];

/**
 * Command Injection detection
 */
const COMMAND_INJECTION_PATTERNS = [
  /[;&|`$(){}[\]<>]/g,
  /\b(cat|ls|pwd|wget|curl|nc|netcat|bash|sh|powershell|cmd)\b/gi
];

/**
 * Check string against pattern array
 */
const checkPatterns = (value, patterns, threatType) => {
  if (typeof value !== 'string') return null;
  
  for (const pattern of patterns) {
    if (pattern.test(value)) {
      return {
        threat: threatType,
        pattern: pattern.toString(),
        value: value.substring(0, 100) // Limit logged value
      };
    }
  }
  return null;
};

/**
 * Recursively scan object for malicious patterns
 */
const scanObject = (obj, path = '') => {
  const threats = [];

  if (typeof obj === 'string') {
    // Check SQL Injection
    let threat = checkPatterns(obj, SQL_INJECTION_PATTERNS, 'SQL_INJECTION');
    if (threat) {
      threats.push({ ...threat, path });
      return threats; // Return immediately on first threat
    }

    // Check XSS
    threat = checkPatterns(obj, XSS_PATTERNS, 'XSS');
    if (threat) {
      threats.push({ ...threat, path });
      return threats;
    }

    // Check Path Traversal
    threat = checkPatterns(obj, PATH_TRAVERSAL_PATTERNS, 'PATH_TRAVERSAL');
    if (threat) {
      threats.push({ ...threat, path });
      return threats;
    }

    // Check Command Injection
    threat = checkPatterns(obj, COMMAND_INJECTION_PATTERNS, 'COMMAND_INJECTION');
    if (threat) {
      threats.push({ ...threat, path });
      return threats;
    }
  } else if (Array.isArray(obj)) {
    obj.forEach((item, index) => {
      threats.push(...scanObject(item, `${path}[${index}]`));
    });
  } else if (obj !== null && typeof obj === 'object') {
    Object.keys(obj).forEach(key => {
      threats.push(...scanObject(obj[key], path ? `${path}.${key}` : key));
    });
  }

  return threats;
};

/**
 * WAF Middleware - Scan request for malicious patterns
 */
const wafProtection = (req, res, next) => {
  try {
    const threats = [];

    // Scan query parameters
    if (req.query && Object.keys(req.query).length > 0) {
      threats.push(...scanObject(req.query, 'query'));
    }

    // Scan request body
    if (req.body && Object.keys(req.body).length > 0) {
      threats.push(...scanObject(req.body, 'body'));
    }

    // Scan URL parameters
    if (req.params && Object.keys(req.params).length > 0) {
      threats.push(...scanObject(req.params, 'params'));
    }

    // If threats detected, block request
    if (threats.length > 0) {
      console.warn('🚨 [WAF] Security threat detected:', {
        ip: req.ip,
        method: req.method,
        path: req.path,
        threats: threats
      });

      return res.status(400).json({
        success: false,
        message: 'Malicious input detected',
        code: 'WAF_BLOCKED',
        threat: threats[0].threat // Don't expose all details to attacker
      });
    }

    next();
  } catch (error) {
    console.error('[WAF] Error scanning request:', error);
    // Don't block request if WAF has an error
    next();
  }
};

/**
 * Sanitize string - remove potentially dangerous characters
 */
const sanitizeString = (str) => {
  if (typeof str !== 'string') return str;
  
  return str
    .replace(/[<>]/g, '') // Remove < and >
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .trim();
};

/**
 * Sanitize object recursively
 */
const sanitizeObject = (obj) => {
  if (typeof obj === 'string') {
    return sanitizeString(obj);
  } else if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  } else if (obj !== null && typeof obj === 'object') {
    const sanitized = {};
    Object.keys(obj).forEach(key => {
      sanitized[key] = sanitizeObject(obj[key]);
    });
    return sanitized;
  }
  return obj;
};

/**
 * Sanitization middleware - Clean input data
 */
const sanitizeInput = (req, res, next) => {
  try {
    if (req.body) {
      req.body = sanitizeObject(req.body);
    }
    if (req.query) {
      req.query = sanitizeObject(req.query);
    }
    if (req.params) {
      req.params = sanitizeObject(req.params);
    }
    next();
  } catch (error) {
    console.error('[WAF] Error sanitizing input:', error);
    next();
  }
};

module.exports = {
  wafProtection,
  sanitizeInput,
  sanitizeString,
  sanitizeObject
};
