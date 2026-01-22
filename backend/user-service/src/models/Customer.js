const prisma = require('../../prisma/client');

class CustomerModel {
  // Create a new customer profile
  static async createCustomer(userId, customerData) {
    return await prisma.customer.create({
      data: {
        userId,
        phoneNumber: customerData.phoneNumber || null,
        homeAddress: customerData.homeAddress || null,
        workAddress: customerData.workAddress || null,
        emergencyContact: customerData.emergencyContact || null,
        rideCount: 0,
        totalSpent: 0.0,
        averageRating: 5.0,
        totalRating: 0,
        numberOfRatings: 0,
        isVerified: false,
        isActive: true,
        isBlocked: false
      }
    });
  }

  // Find customer by ID
  static async findCustomerById(customerId) {
    return await prisma.customer.findUnique({
      where: { id: customerId },
      include: {
        userProfile: true
      }
    });
  }

  // Find customer by user ID
  static async findCustomerByUserId(userId) {
    return await prisma.customer.findUnique({
      where: { userId },
      include: {
        userProfile: true
      }
    });
  }

  // Find all customers (with pagination)
  static async findAllCustomers(skip = 0, take = 10) {
    return await prisma.customer.findMany({
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      include: {
        userProfile: true
      }
    });
  }

  // Update customer profile
  static async updateCustomer(customerId, updateData) {
    const data = {};
    if (updateData.phoneNumber !== undefined) data.phoneNumber = updateData.phoneNumber;
    if (updateData.homeAddress !== undefined) data.homeAddress = updateData.homeAddress;
    if (updateData.workAddress !== undefined) data.workAddress = updateData.workAddress;
    if (updateData.emergencyContact !== undefined) data.emergencyContact = updateData.emergencyContact;
    
    return await prisma.customer.update({
      where: { id: customerId },
      data,
      include: {
        userProfile: true
      }
    });
  }

  // Update customer ride statistics
  static async updateRideStats(customerId, amount, rating = null) {
    const customer = await this.findCustomerById(customerId);
    if (!customer) throw new Error('Customer not found');

    const newRideCount = customer.rideCount + 1;
    const newTotalSpent = customer.totalSpent + amount;

    // Calculate average rating if provided
    let newAverageRating = customer.averageRating;
    let newTotalRating = customer.totalRating;
    let newNumberOfRatings = customer.numberOfRatings;

    if (rating !== null) {
      newTotalRating = customer.totalRating + rating;
      newNumberOfRatings = customer.numberOfRatings + 1;
      newAverageRating = newTotalRating / newNumberOfRatings;
    }

    return await prisma.customer.update({
      where: { id: customerId },
      data: {
        rideCount: newRideCount,
        totalSpent: newTotalSpent,
        averageRating: newAverageRating,
        totalRating: newTotalRating,
        numberOfRatings: newNumberOfRatings,
        lastActivityAt: new Date()
      }
    });
  }

  // Verify customer
  static async verifyCustomer(customerId) {
    return await prisma.customer.update({
      where: { id: customerId },
      data: { isVerified: true }
    });
  }

  // Deactivate customer
  static async deactivateCustomer(customerId) {
    return await prisma.customer.update({
      where: { id: customerId },
      data: { isActive: false }
    });
  }

  // Activate customer
  static async activateCustomer(customerId) {
    return await prisma.customer.update({
      where: { id: customerId },
      data: { isActive: true }
    });
  }

  // Block customer
  static async blockCustomer(customerId) {
    return await prisma.customer.update({
      where: { id: customerId },
      data: { isBlocked: true, isActive: false }
    });
  }

  // Unblock customer
  static async unblockCustomer(customerId) {
    return await prisma.customer.update({
      where: { id: customerId },
      data: { isBlocked: false }
    });
  }

  // Delete customer
  static async deleteCustomer(customerId) {
    return await prisma.customer.delete({
      where: { id: customerId }
    });
  }

  // Update last activity
  static async updateLastActivity(customerId) {
    return await prisma.customer.update({
      where: { id: customerId },
      data: { lastActivityAt: new Date() }
    });
  }
}

module.exports = CustomerModel;
