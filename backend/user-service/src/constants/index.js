const ERROR_MESSAGES = {
  USER_NOT_FOUND: 'User not found',
  INVALID_PHONE: 'Invalid phone number format',
  USER_ALREADY_EXISTS: 'User already exists with this phone number',
  REGISTRATION_FAILED: 'User registration failed',
  UPDATE_FAILED: 'Update operation failed',
  DELETE_FAILED: 'Delete operation failed',
  DATABASE_ERROR: 'Database operation error',
  UNAUTHORIZED: 'Unauthorized access',
  FORBIDDEN: 'Insufficient permissions'
};

const SUCCESS_MESSAGES = {
  USER_REGISTERED: 'User registered successfully',
  USER_UPDATED: 'User updated successfully',
  USER_DELETED: 'User deleted successfully'
};

const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_SERVER_ERROR: 500
};

module.exports = {
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  HTTP_STATUS
};