const Joi = require("joi");

const reviewSchema = Joi.object({
  rideId: Joi.string().required().messages({
    "string.empty": "Ride ID is required",
    "any.required": "Ride ID is required",
  }),
  userId: Joi.string().required().messages({
    "string.empty": "User ID is required",
    "any.required": "User ID is required",
  }),
  driverId: Joi.string().required().messages({
    "string.empty": "Driver ID is required",
    "any.required": "Driver ID is required",
  }),
  rating: Joi.number().integer().min(1).max(5).required().messages({
    "number.base": "Rating must be a number",
    "number.integer": "Rating must be an integer",
    "number.min": "Rating must be at least 1",
    "number.max": "Rating cannot exceed 5",
    "any.required": "Rating is required",
  }),
  comment: Joi.string().max(500).optional().allow("").messages({
    "string.max": "Comment cannot exceed 500 characters",
  }),
});

function validateReview(data) {
  return reviewSchema.validate(data, {
    abortEarly: false,
    stripUnknown: true,
  });
}

// Validation for query parameters
const paginationSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
});

function validatePagination(data) {
  return paginationSchema.validate(data, { abortEarly: false });
}

module.exports = {
  validateReview,
  validatePagination,
};
