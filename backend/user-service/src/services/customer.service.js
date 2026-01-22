const CustomerModel = require('../models/Customer');

class CustomerService {
  // Register new customer
  static async registerCustomer(customerId, customerData) {
    try {
      const customer = await CustomerModel.createCustomer(
        customerId,
        customerData
      );
      return {
        success: true,
        message: 'Customer profile created successfully',
        data: customer
      };
    } catch (error) {
      throw new Error(`Failed to register customer: ${error.message}`);
    }
  }

  // Get customer profile by ID
  static async getCustomerProfile(customerId) {
    try {
      const customer = await CustomerModel.findCustomerById(customerId);
      if (!customer) {
        throw new Error('Customer not found');
      }
      return {
        success: true,
        data: customer
      };
    } catch (error) {
      throw new Error(`Failed to fetch customer profile: ${error.message}`);
    }
  }

  // Get customer profile by User ID
  static async getCustomerByUserId(userId) {
    try {
      const customer = await CustomerModel.findCustomerByUserId(userId);
      if (!customer) {
        throw new Error('Customer not found for this user');
      }
      return {
        success: true,
        data: customer
      };
    } catch (error) {
      throw new Error(`Failed to fetch customer profile: ${error.message}`);
    }
  }

  // Get all customers (admin)
  static async getAllCustomers(skip = 0, take = 10) {
    try {
      const customers = await CustomerModel.findAllCustomers(skip, take);
      const total = await CustomerModel.count?.() || 0;
      return {
        success: true,
        data: customers,
        pagination: {
          skip,
          take,
          total
        }
      };
    } catch (error) {
      throw new Error(`Failed to fetch customers: ${error.message}`);
    }
  }

  // Update customer profile
  static async updateCustomerProfile(customerId, updateData) {
    try {
      const customer = await CustomerModel.updateCustomer(
        customerId,
        updateData
      );
      return {
        success: true,
        message: 'Customer profile updated successfully',
        data: customer
      };
    } catch (error) {
      throw new Error(`Failed to update customer profile: ${error.message}`);
    }
  }

  // Update ride statistics after trip completion
  static async recordRideCompletion(customerId, fare, rating = null) {
    try {
      const customer = await CustomerModel.updateRideStats(
        customerId,
        fare,
        rating
      );
      return {
        success: true,
        message: 'Ride statistics updated',
        data: customer
      };
    } catch (error) {
      throw new Error(
        `Failed to update ride statistics: ${error.message}`
      );
    }
  }

  // Verify customer identity
  static async verifyCustomer(customerId) {
    try {
      const customer = await CustomerModel.verifyCustomer(customerId);
      return {
        success: true,
        message: 'Customer verified successfully',
        data: customer
      };
    } catch (error) {
      throw new Error(`Failed to verify customer: ${error.message}`);
    }
  }

  // Deactivate customer account
  static async deactivateCustomer(customerId) {
    try {
      const customer = await CustomerModel.deactivateCustomer(customerId);
      return {
        success: true,
        message: 'Customer account deactivated',
        data: customer
      };
    } catch (error) {
      throw new Error(`Failed to deactivate customer: ${error.message}`);
    }
  }

  // Reactivate customer account
  static async activateCustomer(customerId) {
    try {
      const customer = await CustomerModel.activateCustomer(customerId);
      return {
        success: true,
        message: 'Customer account activated',
        data: customer
      };
    } catch (error) {
      throw new Error(`Failed to activate customer: ${error.message}`);
    }
  }

  // Delete customer
  static async deleteCustomer(customerId) {
    try {
      const customer = await CustomerModel.deleteCustomer(customerId);
      return {
        success: true,
        message: 'Customer deleted successfully',
        data: customer
      };
    } catch (error) {
      throw new Error(`Failed to delete customer: ${error.message}`);
    }
  }

  // Get customer statistics (for dashboard)
  static async getCustomerStats(customerId) {
    try {
      const customer = await CustomerModel.findCustomerById(customerId);
      if (!customer) {
        throw new Error('Customer not found');
      }
      return {
        success: true,
        data: {
          rideCount: customer.rideCount,
          totalSpent: customer.totalSpent,
          averageRating: customer.averageRating,
          isVerified: customer.isVerified,
          joinedAt: customer.createdAt
        }
      };
    } catch (error) {
      throw new Error(`Failed to fetch customer stats: ${error.message}`);
    }
  }
}

module.exports = CustomerService;
