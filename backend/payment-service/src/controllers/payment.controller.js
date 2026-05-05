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

  const message = error?.message || 'Internal Server Error';
  const normalized = message.toLowerCase();

  if (error?.statusCode && Number.isInteger(error.statusCode)) {
    return sendResponse(res, error.statusCode, false, message);
  }

  if (normalized.includes('not found')) {
    return sendResponse(res, 404, false, message);
  }
  if (normalized.includes('forbidden') || normalized.includes('unauthorized') || normalized.includes('can only create payment for yourself') || normalized.includes('cannot create')) {
    return sendResponse(res, 403, false, message);
  }
  if (normalized.includes('missing') || normalized.includes('exists') || normalized.includes('invalid transition') || normalized.includes('invalid')) {
    return sendResponse(res, 400, false, message);
  }

  return sendResponse(res, 500, false, message);
};

class PaymentController {
  async createPayment(req, res) {
    try {
      const data = {
        rideId: req.body.ride_id || req.body.rideId, // support both just in case
        passengerId: req.body.passenger_id || req.body.passengerId,
        amount: req.body.amount,
        method: req.body.payment_method || req.body.paymentMethod || req.body.method,
        bookingId: req.body.booking_id || req.body.bookingId,
        fraudScore: req.body.fraud_score ?? req.body.fraudScore,
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
