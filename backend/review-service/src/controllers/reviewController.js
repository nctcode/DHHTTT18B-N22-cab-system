const reviewService = require("../services/reviewService");
const { validateReview } = require("../utils/validation");
const logger = require("../utils/logger");

class ReviewController {
  /**
   * Create a new review
   */
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
      if (error.message === "A review already exists for this ride") {
        return res.status(400).json({
          success: false,
          message: error.message,
        });
      }
      logger.error("Create review error:", error);
      next(error);
    }
  }

  /**
   * Get review by ID
   */
  async getReview(req, res, next) {
    try {
      const { id } = req.params;
      const review = await reviewService.getReviewById(id);

      res.status(200).json({
        success: true,
        data: review,
      });
    } catch (error) {
      if (error.message === "Review not found") {
        return res.status(404).json({
          success: false,
          message: error.message,
        });
      }
      logger.error(`Get review ${req.params.id} error:`, error);
      next(error);
    }
  }

  /**
   * Get reviews by driver ID
   */
  async getDriverReviews(req, res, next) {
    try {
      const { driverId } = req.params;
      const page = Math.max(1, parseInt(req.query.page) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 10));

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

  /**
   * Get reviews by user ID
   */
  async getUserReviews(req, res, next) {
    try {
      const { userId } = req.params;
      const page = Math.max(1, parseInt(req.query.page) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 10));

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

  /**
   * Get driver average rating
   */
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

  /**
   * Delete review
   */
  async deleteReview(req, res, next) {
    try {
      const { id } = req.params;
      const result = await reviewService.deleteReview(id);

      res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      if (error.message === "Review not found") {
        return res.status(404).json({
          success: false,
          message: error.message,
        });
      }
      logger.error(`Delete review ${req.params.id} error:`, error);
      next(error);
    }
  }

  /**
   * Check if user has reviewed a ride
   */
  async checkUserReview(req, res, next) {
    try {
      const { rideId, userId } = req.query;

      if (!rideId || !userId) {
        return res.status(400).json({
          success: false,
          message: "rideId and userId are required",
        });
      }

      const hasReviewed = await reviewService.hasUserReviewedRide(
        rideId,
        userId,
      );

      res.status(200).json({
        success: true,
        data: { hasReviewed },
      });
    } catch (error) {
      logger.error("Check user review error:", error);
      next(error);
    }
  }
}

module.exports = new ReviewController();
