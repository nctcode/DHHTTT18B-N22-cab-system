const validation = require('../utils/validation');

const validateBooking = async (req, res, next) => {
  try {
    await validation.validateBookingCreate(req.body);
    next();
  } catch (error) {
    return res.status(400).json({
      success: false,
      error: error.details ? error.details[0].message : error.message
    });
  }
};

const validateDriverAssignment = async (req, res, next) => {
  try {
    await validation.validateDriverAssignment(req.body);
    next();
  } catch (error) {
    return res.status(400).json({
      success: false,
      error: error.details ? error.details[0].message : error.message
    });
  }
};

const validateStatusUpdate = async (req, res, next) => {
  try {
    await validation.validateStatusUpdate(req.body);
    next();
  } catch (error) {
    return res.status(400).json({
      success: false,
      error: error.details ? error.details[0].message : error.message
    });
  }
};

module.exports = {
  validateBooking,
  validateDriverAssignment,
  validateStatusUpdate
};