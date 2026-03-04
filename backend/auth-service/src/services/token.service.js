// src/services/token.service.js
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const authModel = require('../models/auth.model'); // Use Auth Model for DB operations

// Token configuration
const ACCESS_TOKEN_EXPIRY = '15m'; // 15 minutes
const REFRESH_TOKEN_EXPIRY = '7d'; // 7 days

/**
 * Generate access token (short-lived)
 */
const generateAccessToken = (payload) => {
  const secret = process.env.JWT_SECRET || process.env.JWT_ACCESS_SECRET;
  
  return jwt.sign(
    {
      userId: payload.userId, // Explicitly named userId
      sub: payload.userId,    // Standard claim for compatibility
      email: payload.email,
      role: payload.role
    },
    secret,
    { 
      expiresIn: ACCESS_TOKEN_EXPIRY,
      issuer: 'cab-booking-auth-service',
      audience: 'cab-booking-api'
    }
  );
};

/**
 * Generate refresh token (long-lived)
 */
const generateRefreshToken = (payload) => {
  const secret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;
  const tokenId = crypto.randomBytes(32).toString('hex');
  
  return {
    token: jwt.sign(
      {
        sub: payload.userId,
        email: payload.email,
        tokenId: tokenId,
        type: 'refresh'
      },
      secret,
      { 
        expiresIn: REFRESH_TOKEN_EXPIRY,
        issuer: 'cab-booking-auth-service',
        audience: 'cab-booking-api'
      }
    ),
    tokenId
  };
};

/**
 * Generate token pair (access + refresh)
 * @param {Object} payload - { userId, email, role, accountId }
 */
const generateTokenPair = async (payload) => {
  if (!payload.accountId) {
    throw new Error('accountId is required for token generation');
  }

  const accessToken = generateAccessToken(payload);
  const { token: refreshToken } = generateRefreshToken(payload);

  // Calculate expiry date
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now

  // Store refresh token in Postgres
  await authModel.createRefreshToken(payload.accountId, refreshToken, expiresAt);

  console.log(`✅ Stored refresh token for user ${payload.userId} (Account: ${payload.accountId})`);

  return {
    accessToken,
    refreshToken,
    expiresIn: ACCESS_TOKEN_EXPIRY
  };
};

/**
 * Verify and decode refresh token
 */
const verifyRefreshToken = async (token) => {
  const secret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;
  
  try {
    const decoded = jwt.verify(token, secret);
    
    // Check if token type is refresh
    if (decoded.type !== 'refresh') {
      throw new Error('Invalid token type');
    }

    // Check if token exists in DB
    const validation = await authModel.validateRefreshToken(token);

    if (!validation.valid) {
      throw new Error(validation.reason || 'Refresh token not found or expired');
    }

    // Return decoded token + accountId from DB
    return {
        ...decoded,
        accountId: validation.accountId
    };
  } catch (error) {
    throw error;
  }
};

/**
 * Rotate refresh token (invalidate old, create new)
 */
const rotateRefreshToken = async (oldToken) => {
  // Verify old token
  const decoded = await verifyRefreshToken(oldToken);

  // Delete old token
  await authModel.deleteRefreshToken(oldToken);

  console.log(`🔄 Rotated refresh token for user ${decoded.sub}`);

  // Need to fetch fresh role? Assuming payload has it or we re-fetch account?
  // Ideally, we might want to fetch the account/user to get the latest role.
  // For now, we reuse the info in the decoded token or minimal info.
  // But generateTokenPair needs accountId. verifyRefreshToken returns it.
  
  return generateTokenPair({
    userId: decoded.sub,
    email: decoded.email,
    accountId: decoded.accountId,
    role: decoded.role // Role might be stale if not fetched from User Service
  });
};

/**
 * Revoke token (logout)
 */
const revokeToken = async (token) => {
  try {
      // We only track refresh tokens in DB. Access tokens are stateless (expiry based).
      // If we need blacklist for access tokens, we'd need Redis. 
      // User requirements say "Auth Service database stores ONLY... refresh tokens".
      // So we assume only refresh token revocation is supported via DB deletion.
      
      await authModel.deleteRefreshToken(token);
      return true;
  } catch (error) {
    console.error('Error revoking token:', error);
    throw error;
  }
};

/**
 * Revoke all tokens for a user
 */
const revokeAllUserTokens = async (userId) => {
    // We need accountId to delete tokens. 
    // authModel.findByUserId can get accountId
    const account = await authModel.findByUserId(userId);
    if (!account) return 0;

    const result = await authModel.deleteAllAccountTokens(account.id);
    console.log(`🚫 Revoked tokens for account ${account.id}`);
    return result.count;
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  generateTokenPair,
  verifyRefreshToken,
  rotateRefreshToken,
  revokeToken,
  revokeAllUserTokens
};

