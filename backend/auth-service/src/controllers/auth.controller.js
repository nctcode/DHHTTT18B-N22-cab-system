const AuthService = require('../services/auth.service');
const { validationResult } = require('express-validator');

class AuthController {
  static async register(req, res) {
    try {
      // Validate input
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, password, firstName, lastName, phone, role } = req.body;
      
      const result = await AuthService.register({
        email,
        password,
        firstName,
        lastName,
        phone,
        role: role || 'CUSTOMER'
      });

      res.status(201).json({
        success: true,
        message: 'Registration successful',
        data: result
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  static async login(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, password } = req.body;
      
      const result = await AuthService.login(email, password);

      res.json({
        success: true,
        message: 'Login successful',
        data: result
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(401).json({
        success: false,
        message: error.message
      });
    }
  }

  static async refreshToken(req, res) {
    try {
      const { refreshToken } = req.body;
      
      if (!refreshToken) {
        return res.status(400).json({
          success: false,
          message: 'Refresh token is required'
        });
      }

      const result = await AuthService.refreshAccessToken(refreshToken);

      res.json({
        success: true,
        message: 'Token refreshed successfully',
        data: result
      });
    } catch (error) {
      console.error('Refresh token error:', error);
      res.status(401).json({
        success: false,
        message: error.message
      });
    }
  }

  static async logout(req, res) {
    try {
      const accessToken = req.headers.authorization?.split(' ')[1];
      const { refreshToken } = req.body;
      const userId = req.user?.userId;

      if (!accessToken) {
        return res.status(400).json({
          success: false,
          message: 'Access token is required'
        });
      }

      const result = await AuthService.logout(accessToken, refreshToken, userId);

      res.json({
        success: true,
        message: 'Logout successful',
        data: result
      });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  static async requestPasswordReset(req, res) {
    try {
      const { email } = req.body;
      
      const result = await AuthService.requestPasswordReset(email);

      res.json({
        success: true,
        message: result.message
      });
    } catch (error) {
      console.error('Password reset request error:', error);
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  static async resetPassword(req, res) {
    try {
      const { token, newPassword } = req.body;
      
      const result = await AuthService.resetPassword(token, newPassword);

      res.json({
        success: true,
        message: result.message
      });
    } catch (error) {
      console.error('Password reset error:', error);
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  static async verifyEmail(req, res) {
    try {
      const { token } = req.query;
      
      const result = await AuthService.verifyEmail(token);

      res.json({
        success: true,
        message: result.message
      });
    } catch (error) {
      console.error('Email verification error:', error);
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }
}

module.exports = AuthController;