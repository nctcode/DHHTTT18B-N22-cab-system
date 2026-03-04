// Common utility functions for user service

// Format customer response
function formatCustomerResponse(customer) {
  return {
    id: customer.id,
    fullName: customer.fullName,
    email: customer.email,
    phone: customer.phone,
    avatarUrl: customer.avatarUrl,
    role: customer.role,
    status: customer.status,
    ratingAvg: customer.ratingAvg,
    createdAt: customer.createdAt,
    updatedAt: customer.updatedAt
  };
}

// Format profile response
function formatProfileResponse(profile) {
  return {
    id: profile.id,
    fullName: profile.fullName,
    email: profile.email,
    phone: profile.phone,
    avatarUrl: profile.avatarUrl,
    role: profile.role,
    status: profile.status,
    ratingAvg: profile.ratingAvg,
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt,
    addresses: profile.addresses || [] // Include addresses if available
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
