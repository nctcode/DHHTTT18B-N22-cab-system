const authModel = require('../models/auth.model');
const passwordUtil = require('../utils/password');
const tokenService = require('./token.service');
const UserClient = require('../clients/user.client');

/**
 * Register new user - Microservices architecture
 * 1. Create user in User Service
 * 2. Store credentials (Account) in Auth DB
 * 3. Generate JWT tokens
 */
exports.register = async (userData) => {
  const { password, fullName, phone, email, role } = userData;

  let userId = null;

  try {
    // Step 1: Create user profile in User Service
    // This will throw if email/phone exists in User Service
    console.log('Creating user in User Service...');
    const user = await UserClient.createUser({
      fullName,
      phone,
      email,
      role
    });

    userId = user.id;
    if (!userId) {
      throw new Error('User Service did not return user ID');
    }

    // Step 2: Hash password and store credentials
    console.log('Storing credentials for user:', userId);
    const passwordHash = await passwordUtil.hash(password);
    
    // Create Account in Auth DB
    const account = await authModel.createAccount(userId, email, passwordHash, user.role);

    // Step 3: Generate token pair
    const tokens = await tokenService.generateTokenPair({
      userId: userId,
      email: email,
      role: user.role, // Use role from User Service response
      accountId: account.id
    });

    return {
      success: true,
      message: 'Registration successful',
      data: {
        userId: userId,
        email: email,
        role: user.role
      },
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken
    };
  } catch (err) {
    console.error('Registration error:', err.message);

    // TODO: Compensating transaction - if auth account creation failed, 
    // we should ideally delete the user from User Service to maintain consistency.
    if (userId) {
       console.error(`[CRITICAL] Orphaned user created in User Service: ${userId}. Compensation required.`);
    }

    throw err;
  }
};

/**
 * Login user - Find account by email, verify password, fetch profile
 */
exports.login = async (email, password) => {
  try {
    // Step 1: Find account by email
    const account = await authModel.findByEmail(email);
    if (!account) {
      const error = new Error('Invalid credentials');
      error.status = 401;
      throw error;
    }

    if (!account.isActive) {
        const error = new Error('Account is disabled');
        error.status = 403;
        throw error;
    }

    // Step 2: Verify password
    const passwordMatch = await passwordUtil.compare(password, account.passwordHash);
    if (!passwordMatch) {
      const error = new Error('Invalid credentials');
      error.status = 401;
      throw error;
    }

    // Step 3: Generate token pair using Account data
    const tokens = await tokenService.generateTokenPair({
      userId: account.userId,
      email: account.email,
      role: account.role || 'PASSENGER', // Use role from Auth DB, default to PASSENGER if missing
      accountId: account.id
    });

    return {
      success: true,
      message: 'Login successful',
      data: {
        userId: account.userId,
        email: account.email,
        role: account.role || 'PASSENGER'
      },
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken
    };
  } catch (err) {
    console.error('Login error:', err.message);
    throw err;
  }
};

/**
 * Deactivate user account
 */
exports.deactivateAccount = async (userId) => {
  try {
    // 1. Update account status
    const account = await authModel.findByUserId(userId);
    if (!account) {
      const error = new Error('Account not found');
      error.status = 404;
      throw error;
    }

    await authModel.deactivateAccount(userId);

    // 2. Revoke all tokens
    await tokenService.revokeAllUserTokens(userId);

    return { message: 'Account deactivated successfully' };
  } catch (err) {
    throw err;
  }
};
