const paymentService = require('../services/payment.service');

const sendResponse = (res, statusCode, success, message, data = null) => {
  res.status(statusCode).json({
    success,
    message,
    data,
  });
};

const handleError = (res, error) => {
  console.error(error);
  if (error.message.includes('not found')) {
    return sendResponse(res, 404, false, error.message);
  }
  if (error.message.includes('Forbidden') || error.message.includes('Unauthorized') || error.message.includes('cannot create')) {
    return sendResponse(res, 403, false, error.message);
  }
  if (error.message.includes('Missing') || error.message.includes('exists') || error.message.includes('Invalid transition')) {
    return sendResponse(res, 400, false, error.message);
  }
  sendResponse(res, 500, false, error.message || 'Internal Server Error');
};

class PaymentController {
  async createPayment(req, res) {
    try {
      const data = {
        rideId: req.body.ride_id || req.body.rideId, // support both just in case
        passengerId: req.body.passenger_id || req.body.passengerId,
        amount: req.body.amount,
        method: req.body.payment_method || req.body.paymentMethod || req.body.method,
      };
      
      const payment = await paymentService.createPayment(data, req.user);
      sendResponse(res, 201, true, 'Payment created', payment);
    } catch (error) {
      handleError(res, error);
    }
  }

  async getPayment(req, res) {
    try {
      const payment = await paymentService.getPayment(req.params.id, req.user);
      sendResponse(res, 200, true, 'Payment details', payment);
    } catch (error) {
      handleError(res, error);
    }
  }

  async getByRide(req, res) {
    try {
      const payments = await paymentService.getByRide(req.params.rideId, req.user);
      sendResponse(res, 200, true, 'Ride payments', payments);
    } catch (error) {
      handleError(res, error);
    }
  }

  async getByPassenger(req, res) {
    try {
      const payments = await paymentService.getByPassenger(req.params.passengerId, req.user);
      sendResponse(res, 200, true, 'Passenger payments', payments);
    } catch (error) {
      handleError(res, error);
    }
  }

  async successPayment(req, res) {
    try {
      const payment = await paymentService.successPayment(req.params.id, req.user);
      sendResponse(res, 200, true, 'Payment succeeded', payment);
    } catch (error) {
      handleError(res, error);
    }
  }

  async failPayment(req, res) {
    try {
      const payment = await paymentService.failPayment(req.params.id, req.user);
      sendResponse(res, 200, true, 'Payment failed', payment);
    } catch (error) {
      handleError(res, error);
    }
  }

  async refundPayment(req, res) {
    try {
      const payment = await paymentService.refundPayment(req.params.id, req.user);
      sendResponse(res, 200, true, 'Payment refunded', payment);
    } catch (error) {
      handleError(res, error);
    }
  }

  async retryPayment(req, res) {
    try {
      const payment = await paymentService.retryPayment(req.params.rideId, req.user);
      sendResponse(res, 200, true, 'Payment retry initiated', payment);
    } catch (error) {
      handleError(res, error);
    }
  }
}

module.exports = new PaymentController();
