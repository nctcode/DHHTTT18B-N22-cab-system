const Joi = require('joi');

const bookingCreateSchema = Joi.object({
  pickupLocation: Joi.object({
    address: Joi.string().required(),
    coordinates: Joi.object({
      lat: Joi.number().min(-90).max(90).required(),
      lng: Joi.number().min(-180).max(180).required()
    }).required()
  }).required(),
  destination: Joi.object({
    address: Joi.string().required(),
    coordinates: Joi.object({
      lat: Joi.number().min(-90).max(90).required(),
      lng: Joi.number().min(-180).max(180).required()
    }).required()
  }).required(),
  vehicleType: Joi.string().valid('STANDARD', 'PREMIUM', 'LUXURY', 'BIKE').required(),
  scheduleTime: Joi.date().greater('now').optional(),
  notes: Joi.string().optional()
});

const driverAssignmentSchema = Joi.object({
  driverId: Joi.string().required(),
  driverLocation: Joi.object({
    lat: Joi.number().min(-90).max(90).required(),
    lng: Joi.number().min(-180).max(180).required()
  }).required()
});

const statusUpdateSchema = Joi.object({
  status: Joi.string().valid(
    'PENDING', 'ASSIGNED', 'ARRIVING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_DRIVER', 'TIMEOUT'
  ).required(),
  metadata: Joi.object().optional()
});

const validateBookingCreate = async (data) => {
  return await bookingCreateSchema.validateAsync(data);
};

const validateDriverAssignment = async (data) => {
  return await driverAssignmentSchema.validateAsync(data);
};

const validateStatusUpdate = async (data) => {
  return await statusUpdateSchema.validateAsync(data);
};

module.exports = {
  validateBookingCreate,
  validateDriverAssignment,
  validateStatusUpdate
};