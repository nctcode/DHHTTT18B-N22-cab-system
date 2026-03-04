const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const crypto = require('crypto');

// ==================================================
// ACCOUNT MODEL (formerly credentials)
// ==================================================

/**
 * Find account by user_id
 */
exports.findByUserId = async (userId) => {
  return await prisma.account.findUnique({
    where: { userId }
  });
};

/**
 * Find account by email (for login)
 */
exports.findByEmail = async (email) => {
  return await prisma.account.findUnique({
    where: { email }
  });
};

/**
 * Create new account
 * @param {string} userId - UUID from user service
 * @param {string} email - Email from user service/input
 * @param {string} passwordHash - Hashed password
 */
exports.createAccount = async (userId, email, passwordHash, role) => {
  return await prisma.account.create({
    data: {
      userId,
      email,
      passwordHash,
      role,
      isActive: true
    }
  });
};

/**
 * Update password hash
 */
exports.updatePassword = async (userId, newPasswordHash) => {
  return await prisma.account.update({
    where: { userId },
    data: { passwordHash: newPasswordHash }
  });
};

/**
 * Check if account exists for user
 */
exports.accountExists = async (userId) => {
  const count = await prisma.account.count({
    where: { userId }
  });
  return count > 0;
};

// ==================================================
// REFRESH TOKENS MODEL
// ==================================================

/**
 * Create refresh token
 * @param {string} accountId - Account ID (UUID)
 * @param {string} token - Raw refresh token
 * @param {Date} expiresAt - Expiration timestamp
 */
exports.createRefreshToken = async (accountId, token, expiresAt) => {
  return await prisma.refreshToken.create({
    data: {
        accountId,
        token, // Prisma schema says token is String @unique
        expiresAt
    }
  });
};

/**
 * Find refresh token by token value
 */
exports.findRefreshToken = async (token) => {
  return await prisma.refreshToken.findUnique({
    where: { token },
    include: { account: true }
  });
};

/**
 * Validate refresh token (not expired)
 * Note: revoked status is not in schema anymore, rely on existence/expiry
 */
exports.validateRefreshToken = async (token) => {
  const tokenData = await exports.findRefreshToken(token);
  
  if (!tokenData) {
    return { valid: false, reason: 'Token not found' };
  }
  
  if (new Date(tokenData.expiresAt) < new Date()) {
    return { valid: false, reason: 'Token expired' };
  }
  
  return { valid: true, userId: tokenData.account.userId, accountId: tokenData.accountId };
};

/**
 * Delete refresh token (logout, token rotation)
 * Schema has no 'revoked' field, so we delete it.
 */
exports.deleteRefreshToken = async (token) => {
  return await prisma.refreshToken.delete({
    where: { token }
  });
};

/**
 * Delete all refresh tokens for an account
 */
exports.deleteAllAccountTokens = async (accountId) => {
  return await prisma.refreshToken.deleteMany({
    where: { accountId }
  });
};

/**
 * Clean up expired tokens
 */
exports.deleteExpiredTokens = async () => {
  return await prisma.refreshToken.deleteMany({
    where: {
        expiresAt: {
            lt: new Date()
        }
    }
  });
};

/**
 * Deactivate account by userId
 */
exports.deactivateAccount = async (userId) => {
  return await prisma.account.update({
    where: { userId },
    data: { isActive: false }
  });
};

module.exports = exports;
