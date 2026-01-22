// Common utility functions for user service

// Format customer response
function formatCustomerResponse(customer) {
  return {
    customerId: customer.customerId,
    firstName: customer.firstName,
    lastName: customer.lastName,
    email: customer.email,
    phone: customer.phone,
    profilePicture: customer.profilePicture,
    rideCount: customer.rideCount,
    totalSpent: customer.totalSpent,
    averageRating: customer.averageRating,
    isVerified: customer.isVerified,
    isActive: customer.isActive,
    createdAt: customer.createdAt,
    updatedAt: customer.updatedAt
  };
}

// Format profile response
function formatProfileResponse(profile) {
  return {
    userId: profile.userId,
    bio: profile.bio,
    profilePicture: profile.profilePicture,
    dateOfBirth: profile.dateOfBirth,
    gender: profile.gender,
    address: profile.address,
    city: profile.city,
    state: profile.state,
    zipCode: profile.zipCode,
    country: profile.country,
    verificationStatus: profile.verificationStatus,
    isPhoneVerified: profile.isPhoneVerified,
    isEmailVerified: profile.isEmailVerified,
    lastActiveAt: profile.lastActiveAt,
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt
  };
}

// Validate email format
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Validate phone format (basic)
function isValidPhone(phone) {
  const phoneRegex = /^\d{10,15}$/;
  return phoneRegex.test(phone.replace(/\D/g, ''));
}

// Calculate pagination offset
function getPaginationOffset(page = 1, limit = 10) {
  const skip = Math.max(0, (parseInt(page) - 1) * parseInt(limit));
  return {
    skip,
    take: parseInt(limit)
  };
}

// Format error response
function formatErrorResponse(message, statusCode = 500) {
  return {
    success: false,
    message,
    statusCode
  };
}

// Format success response
function formatSuccessResponse(data, message = 'Success') {
  return {
    success: true,
    message,
    data
  };
}

module.exports = {
  formatCustomerResponse,
  formatProfileResponse,
  isValidEmail,
  isValidPhone,
  getPaginationOffset,
  formatErrorResponse,
  formatSuccessResponse
};
