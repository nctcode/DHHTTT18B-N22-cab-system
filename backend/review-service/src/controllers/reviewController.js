const reviewService = require("../services/reviewService");
const { validateReview } = require("../utils/validation");
const logger = require("../utils/logger");

class ReviewController {
  // POST /api/reviews
  async createReview(req, res, next) {
    try {
      // Validate request body
      const { error, value } = validateReview(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          message: "Validation error",
          errors: error.details.map((detail) => detail.message),
        });
      }

      const review = await reviewService.createReview(value);

      res.status(201).json({
        success: true,
        message: "Review created successfully",
        data: review,
      });
    } catch (error) {
      logger.error("Create review error:", error);
      next(error);
    }
  }

  // GET /api/reviews/:id
  async getReview(req, res, next) {
    try {
      const { id } = req.params;
      const review = await reviewService.getReviewById(id);

      res.status(200).json({
        success: true,
        data: review,
      });
    } catch (error) {
      logger.error(`Get review ${req.params.id} error:`, error);
      next(error);
    }
  }

  // GET /api/reviews/driver/:driverId
  async getDriverReviews(req, res, next) {
    try {
      const { driverId } = req.params;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;

      const result = await reviewService.getReviewsByDriver(
        driverId,
        page,
        limit,
      );

      res.status(200).json({
        success: true,
        ...result,
      });
    } catch (error) {
      logger.error(`Get driver reviews ${req.params.driverId} error:`, error);
      next(error);
    }
  }

  // GET /api/reviews/user/:userId
  async getUserReviews(req, res, next) {
    try {
      const { userId } = req.params;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;

      const result = await reviewService.getReviewsByUser(userId, page, limit);

      res.status(200).json({
        success: true,
        ...result,
      });
    } catch (error) {
      logger.error(`Get user reviews ${req.params.userId} error:`, error);
      next(error);
    }
  }

  // GET /api/reviews/driver/:driverId/average
  async getDriverAverageRating(req, res, next) {
    try {
      const { driverId } = req.params;
      const result = await reviewService.getDriverAverageRating(driverId);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      logger.error(`Get driver average ${req.params.driverId} error:`, error);
      next(error);
    }
  }

  // DELETE /api/reviews/:id
  async deleteReview(req, res, next) {
    try {
      // Note: Add admin authentication middleware in production
      const { id } = req.params;
      const result = await reviewService.deleteReview(id);

      res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      logger.error(`Delete review ${req.params.id} error:`, error);
      next(error);
    }
  }
}

module.exports = new ReviewController();
