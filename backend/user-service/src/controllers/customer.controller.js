const CustomerService = require('../services/customer.service');
const { validationResult } = require('express-validator');

class CustomerController {
  // Register customer profile
  static async registerCustomer(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { userId } = req.params;
      const customerData = req.body;

      const result = await CustomerService.registerCustomer(
        userId,
        customerData
      );

      res.status(201).json(result);
    } catch (error) {
      console.error('Register customer error:', error);
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Get customer profile (by customerId or userId)
  static async getCustomerProfile(req, res) {
    try {
      const { customerId } = req.params;

      const result = await CustomerService.getCustomerProfile(customerId);

      res.json(result);
    } catch (error) {
      console.error('Get customer profile error:', error);
      res.status(404).json({
        success: false,
        message: error.message
      });
    }
  }

  // Get customer profile by user ID
  static async getCustomerByUserId(req, res) {
    try {
      const { userId } = req.params;

      const result = await CustomerService.getCustomerByUserId(userId);

      res.json(result);
    } catch (error) {
      console.error('Get customer by userId error:', error);
      res.status(404).json({
        success: false,
        message: error.message
      });
    }
  }

  // Get all customers (admin)
  static async getAllCustomers(req, res) {
    try {
      const { skip = 0, take = 10 } = req.query;

      const result = await CustomerService.getAllCustomers(
        parseInt(skip),
        parseInt(take)
      );

      res.json(result);
    } catch (error) {
      console.error('Get all customers error:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  // Update customer profile
  static async updateCustomerProfile(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { customerId } = req.params;
      const updateData = req.body;

      const result = await CustomerService.updateCustomerProfile(
        customerId,
        updateData
      );

      res.json(result);
    } catch (error) {
      console.error('Update customer profile error:', error);
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Record ride completion
  static async recordRideCompletion(req, res) {
    try {
      const { customerId } = req.params;
      const { fare, rating } = req.body;

      if (!fare) {
        return res.status(400).json({
          success: false,
          message: 'Fare is required'
        });
      }

      const result = await CustomerService.recordRideCompletion(
        customerId,
        parseFloat(fare),
        rating
      );

      res.json(result);
    } catch (error) {
      console.error('Record ride completion error:', error);
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Verify customer
  static async verifyCustomer(req, res) {
    try {
      const { customerId } = req.params;

      const result = await CustomerService.verifyCustomer(customerId);

      res.json(result);
    } catch (error) {
      console.error('Verify customer error:', error);
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Deactivate customer
  static async deactivateCustomer(req, res) {
    try {
      const { customerId } = req.params;

      const result = await CustomerService.deactivateCustomer(customerId);

      res.json(result);
    } catch (error) {
      console.error('Deactivate customer error:', error);
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Activate customer
  static async activateCustomer(req, res) {
    try {
      const { customerId } = req.params;

      const result = await CustomerService.activateCustomer(customerId);

      res.json(result);
    } catch (error) {
      console.error('Activate customer error:', error);
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Delete customer
  static async deleteCustomer(req, res) {
    try {
      const { customerId } = req.params;

      const result = await CustomerService.deleteCustomer(customerId);

      res.json(result);
    } catch (error) {
      console.error('Delete customer error:', error);
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Get customer statistics
  static async getCustomerStats(req, res) {
    try {
      const { customerId } = req.params;

      const result = await CustomerService.getCustomerStats(customerId);

      res.json(result);
    } catch (error) {
      console.error('Get customer stats error:', error);
      res.status(404).json({
        success: false,
        message: error.message
      });
    }
  }
}

module.exports = CustomerController;
