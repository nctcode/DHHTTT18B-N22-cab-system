const Joi = require('joi');

// Schema validation cho Driver - FIXED FOR VIETNAMESE LICENSE PLATES
const driverSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  phone: Joi.string().pattern(/^[0-9]{10,15}$/).required(),
  vehicle_type: Joi.string().valid('car', 'bike', 'premium', 'suv').default('car'),
  vehicle_plate: Joi.string()
    .pattern(/^[0-9]{2}[A-Z]{1,2}-[0-9]{4,6}$|^[A-Z]{1,2}[0-9]{4,5}$/i)
    .required()
    .messages({
      'string.pattern.base': 'Biển số xe không hợp lệ. Ví dụ: 51A-12345 hoặc A1-23456'
    }),
  status: Joi.string().valid('ONLINE', 'OFFLINE', 'BUSY').default('OFFLINE'),
  rating: Joi.number().min(0).max(5).default(5.0)
});

// Schema validation cho Status
const statusSchema = Joi.object({
  status: Joi.string().valid('ONLINE', 'OFFLINE', 'BUSY').required()
});

// Schema validation cho Location
const locationSchema = Joi.object({
  driverId: Joi.string().uuid().required(),
  lat: Joi.number().min(-90).max(90).required(),
  lng: Joi.number().min(-180).max(180).required()
});

// Schema validation cho Coordinates
const coordinatesSchema = Joi.object({
  lat: Joi.number().min(-90).max(90).required(),
  lng: Joi.number().min(-180).max(180).required(),
  radius: Joi.number().min(0.1).max(100).default(5),
  limit: Joi.number().min(1).max(100).default(10)
});

// Middleware validation functions
const validateDriver = (req, res, next) => {
  const { error } = driverSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ 
      success: false, 
      message: error.details[0].message 
    });
  }
  next();
};

const validateStatus = (req, res, next) => {
  const { error } = statusSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ 
      success: false, 
      message: error.details[0].message 
    });
  }
  next();
};

const validateLocation = (req, res, next) => {
  const { error } = locationSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ 
      success: false, 
      message: error.details[0].message 
    });
  }
  next();
};

const validateCoordinates = (req, res, next) => {
  const { error } = coordinatesSchema.validate(req.query);
  if (error) {
    return res.status(400).json({ 
      success: false, 
      message: error.details[0].message 
    });
  }
  next();
};

// Helper function để trả về validation result
const validationResult = (req) => {
  // Đơn giản hóa - trong thực tế có thể sử dụng express-validator
  return {
    isEmpty: () => true
  };
};

module.exports = {
  validateDriver,
  validateStatus,
  validateLocation,
  validateCoordinates,
  validationResult
};