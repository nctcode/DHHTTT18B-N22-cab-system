const Review = require("../models/Review");
const logger = require("../utils/logger");

class ReviewService {
  // Create a new review
  async createReview(reviewData) {
    try {
      // Check if review already exists for this ride
      const existingReview = await Review.findOne({
        where: { rideId: reviewData.rideId },
      });

      if (existingReview) {
        throw new Error("A review already exists for this ride");
      }

      const review = await Review.create(reviewData);
      logger.info(`Review created: ${review.id}`);
      return review;
    } catch (error) {
      logger.error("Error creating review:", error);
      throw error;
    }
  }

  // Get review by ID
  async getReviewById(id) {
    try {
      const review = await Review.findByPk(id);
      if (!review) {
        throw new Error("Review not found");
      }
      return review;
    } catch (error) {
      logger.error(`Error getting review ${id}:`, error);
      throw error;
    }
  }

  // Get reviews by driver ID
  async getReviewsByDriver(driverId, page = 1, limit = 10) {
    try {
      const offset = (page - 1) * limit;

      const { count, rows } = await Review.findAndCountAll({
        where: { driverId },
        order: [["createdAt", "DESC"]],
        offset,
        limit,
      });

      return {
        reviews: rows,
        pagination: {
          total: count,
          page,
          limit,
          totalPages: Math.ceil(count / limit),
        },
      };
    } catch (error) {
      logger.error(`Error getting reviews for driver ${driverId}:`, error);
      throw error;
    }
  }

  // Get reviews by user ID
  async getReviewsByUser(userId, page = 1, limit = 10) {
    try {
      const offset = (page - 1) * limit;

      const { count, rows } = await Review.findAndCountAll({
        where: { userId },
        order: [["createdAt", "DESC"]],
        offset,
        limit,
      });

      return {
        reviews: rows,
        pagination: {
          total: count,
          page,
          limit,
          totalPages: Math.ceil(count / limit),
        },
      };
    } catch (error) {
      logger.error(`Error getting reviews for user ${userId}:`, error);
      throw error;
    }
  }

  // Get driver average rating
  async getDriverAverageRating(driverId) {
    try {
      const result = await Review.findAll({
        where: { driverId },
        attributes: [
          [sequelize.fn("AVG", sequelize.col("rating")), "averageRating"],
          [sequelize.fn("COUNT", sequelize.col("id")), "totalReviews"],
        ],
        raw: true,
      });

      return {
        driverId,
        averageRating: parseFloat(result[0]?.averageRating || 0).toFixed(1),
        totalReviews: parseInt(result[0]?.totalReviews || 0),
      };
    } catch (error) {
      logger.error(
        `Error calculating average rating for driver ${driverId}:`,
        error,
      );
      throw error;
    }
  }

  // Delete review (admin only)
  async deleteReview(id) {
    try {
      const review = await Review.findByPk(id);
      if (!review) {
        throw new Error("Review not found");
      }

      await review.destroy();
      logger.info(`Review deleted: ${id}`);
      return { success: true, message: "Review deleted successfully" };
    } catch (error) {
      logger.error(`Error deleting review ${id}:`, error);
      throw error;
    }
  }
}

module.exports = new ReviewService();
