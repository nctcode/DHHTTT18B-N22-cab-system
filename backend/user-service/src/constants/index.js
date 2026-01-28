// Constants for user service

const VERIFICATION_STATUS = {
  PENDING: 'PENDING',
  VERIFIED: 'VERIFIED',
  REJECTED: 'REJECTED'
};

const USER_ROLES = {
  CUSTOMER: 'CUSTOMER',
  DRIVER: 'DRIVER',
  ADMIN: 'ADMIN'
};

const GENDER = {
  MALE: 'MALE',
  FEMALE: 'FEMALE',
  OTHER: 'OTHER'
};

const NOTIFICATION_PREFERENCES = {
  EMAIL: 'email',
  SMS: 'sms',
  PUSH: 'push'
};

const ERROR_MESSAGES = {
  CUSTOMER_NOT_FOUND: 'Customer not found',
  PROFILE_NOT_FOUND: 'User profile not found',
  INVALID_EMAIL: 'Invalid email format',
  INVALID_PHONE: 'Invalid phone number format',
  CUSTOMER_ALREADY_EXISTS: 'Customer already exists',
  PROFILE_ALREADY_EXISTS: 'User profile already exists',
  INVALID_VERIFICATION_STATUS: 'Invalid verification status',
  REGISTRATION_FAILED: 'Customer registration failed',
  UPDATE_FAILED: 'Update operation failed',
  DELETE_FAILED: 'Delete operation failed',
  DATABASE_ERROR: 'Database operation error'
};

const SUCCESS_MESSAGES = {
  CUSTOMER_REGISTERED: 'Customer registered successfully',
  CUSTOMER_UPDATED: 'Customer updated successfully',
  CUSTOMER_VERIFIED: 'Customer verified successfully',
  CUSTOMER_ACTIVATED: 'Customer activated successfully',
  CUSTOMER_DEACTIVATED: 'Customer deactivated successfully',
  CUSTOMER_DELETED: 'Customer deleted successfully',
  PROFILE_UPDATED: 'Profile updated successfully',
  PROFILE_DELETED: 'Profile deleted successfully',
  PHONE_VERIFIED: 'Phone verified successfully',
  EMAIL_VERIFIED: 'Email verified successfully',
  PREFERENCES_UPDATED: 'Preferences updated successfully'
};

const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503
};

module.exports = {
  VERIFICATION_STATUS,
  USER_ROLES,
  GENDER,
  NOTIFICATION_PREFERENCES,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  HTTP_STATUS
};
