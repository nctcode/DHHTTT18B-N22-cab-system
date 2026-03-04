const reviewService = require('../services/reviewService');

const sendResponse = (res, statusCode, success, message, data = null) => {
  res.status(statusCode).json({ success, message, data });
};

class ReviewController {

  /**
   * POST /reviews
   * Headers: x-user-id, x-user-role
   */
  async createReview(req, res) {
    try {
      const reviewerId = req.headers['x-user-id'];
      if (!reviewerId) return sendResponse(res, 401, false, 'Missing x-user-id header');

      const { rideId, targetUserId, rating, comment } = req.body;

      const review = await reviewService.createReview({
        rideId, reviewerId, targetUserId, rating, comment
      });

      sendResponse(res, 201, true, 'Review created', review);
    } catch (error) {
      const status = error.status || 500;
      const message = error.message || 'Internal Server Error';
      console.error('[ReviewController]', message);
      sendResponse(res, status, false, message);
    }
  }

  /**
   * GET /reviews/ride/:rideId
   */
  async getByRide(req, res) {
    try {
      const reviews = await reviewService.getByRideId(req.params.rideId);
      sendResponse(res, 200, true, 'Ride reviews', reviews);
    } catch (error) {
      console.error('[ReviewController]', error.message);
      sendResponse(res, 500, false, error.message);
    }
  }

  /**
   * GET /reviews/user/:userId
   */
  async getByUser(req, res) {
    try {
      const result = await reviewService.getByUserId(req.params.userId);
      sendResponse(res, 200, true, 'User reviews', result);
    } catch (error) {
      console.error('[ReviewController]', error.message);
      sendResponse(res, 500, false, error.message);
    }
  }

  /**
   * GET /reviews/check?rideId=xxx
   * Uses x-user-id from header as reviewerId
   */
  async checkReview(req, res) {
    try {
      const reviewerId = req.headers['x-user-id'];
      if (!reviewerId) return sendResponse(res, 401, false, 'Missing x-user-id header');

      const { rideId } = req.query;
      if (!rideId) return sendResponse(res, 400, false, 'rideId query param required');

      const result = await reviewService.checkReview(rideId, reviewerId);
      sendResponse(res, 200, true, 'Review check', result);
    } catch (error) {
      console.error('[ReviewController]', error.message);
      sendResponse(res, 500, false, error.message);
    }
  }
}

module.exports = new ReviewController();
