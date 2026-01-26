const Joi = require("joi");

const reviewSchema = Joi.object({
  rideId: Joi.string().uuid().required().messages({
    "string.guid": "Ride ID must be a valid UUID",
    "any.required": "Ride ID is required",
  }),
  userId: Joi.string().uuid().required().messages({
    "string.guid": "User ID must be a valid UUID",
    "any.required": "User ID is required",
  }),
  driverId: Joi.string().uuid().required().messages({
    "string.guid": "Driver ID must be a valid UUID",
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
  return reviewSchema.validate(data, { abortEarly: false });
}

module.exports = { validateReview };
