const Review = require("../models/Review");
const logger = require("../utils/logger");

class ReviewService {
  /**
   * Create a new review
   * @param {Object} reviewData - Review data
   * @returns {Promise<Object>} Created review
   */
  async createReview(reviewData) {
    try {
      const review = new Review(reviewData);
      await review.save();

      logger.info(`Review created: ${review._id} for ride: ${review.rideId}`);
      return review.toObject();
    } catch (error) {
      if (error.code === 11000) {
        // MongoDB duplicate key error
        throw new Error("A review already exists for this ride");
      }
      logger.error("Error creating review:", error);
      throw error;
    }
  }

  /**
   * Get review by ID
   * @param {String} id - Review ID
   * @returns {Promise<Object>} Review data
   */
  async getReviewById(id) {
    try {
      const review = await Review.findById(id);
      if (!review) {
        throw new Error("Review not found");
      }
      return review.toObject();
    } catch (error) {
      logger.error(`Error getting review ${id}:`, error);
      throw error;
    }
  }

  /**
   * Get reviews by driver ID with pagination
   * @param {String} driverId - Driver ID
   * @param {Number} page - Page number (default: 1)
   * @param {Number} limit - Items per page (default: 10)
   * @returns {Promise<Object>} Reviews and pagination info
   */
  async getReviewsByDriver(driverId, page = 1, limit = 10) {
    try {
      const skip = (page - 1) * limit;

      const [reviews, total] = await Promise.all([
        Review.find({ driverId })
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        Review.countDocuments({ driverId }),
      ]);

      return {
        reviews,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error(`Error getting reviews for driver ${driverId}:`, error);
      throw error;
    }
  }

  /**
   * Get reviews by user ID with pagination
   * @param {String} userId - User ID
   * @param {Number} page - Page number (default: 1)
   * @param {Number} limit - Items per page (default: 10)
   * @returns {Promise<Object>} Reviews and pagination info
   */
  async getReviewsByUser(userId, page = 1, limit = 10) {
    try {
      const skip = (page - 1) * limit;

      const [reviews, total] = await Promise.all([
        Review.find({ userId })
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        Review.countDocuments({ userId }),
      ]);

      return {
        reviews,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error(`Error getting reviews for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Get driver average rating and total reviews
   * @param {String} driverId - Driver ID
   * @returns {Promise<Object>} Average rating and total reviews
   */
  async getDriverAverageRating(driverId) {
    try {
      const result = await Review.aggregate([
        { $match: { driverId } },
        {
          $group: {
            _id: null,
            averageRating: { $avg: "$rating" },
            totalReviews: { $sum: 1 },
            ratingDistribution: {
              $push: "$rating",
            },
          },
        },
      ]);

      const data = result[0] || { averageRating: 0, totalReviews: 0 };

      // Calculate rating distribution
      const ratingDistribution = {
        1: 0,
        2: 0,
        3: 0,
        4: 0,
        5: 0,
      };

      if (data.ratingDistribution) {
        data.ratingDistribution.forEach((rating) => {
          if (rating >= 1 && rating <= 5) {
            ratingDistribution[rating]++;
          }
        });
      }

      return {
        driverId,
        averageRating: data.averageRating
          ? parseFloat(data.averageRating.toFixed(2))
          : 0,
        totalReviews: data.totalReviews || 0,
        ratingDistribution,
      };
    } catch (error) {
      logger.error(
        `Error calculating average rating for driver ${driverId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Delete review by ID
   * @param {String} id - Review ID
   * @returns {Promise<Object>} Success message
   */
  async deleteReview(id) {
    try {
      const result = await Review.findByIdAndDelete(id);
      if (!result) {
        throw new Error("Review not found");
      }

      logger.info(`Review deleted: ${id}`);
      return { success: true, message: "Review deleted successfully" };
    } catch (error) {
      logger.error(`Error deleting review ${id}:`, error);
      throw error;
    }
  }

  /**
   * Check if user has reviewed a ride
   * @param {String} rideId - Ride ID
   * @param {String} userId - User ID
   * @returns {Promise<Boolean>} True if reviewed
   */
  async hasUserReviewedRide(rideId, userId) {
    try {
      const review = await Review.findOne({ rideId, userId });
      return !!review;
    } catch (error) {
      logger.error(
        `Error checking review for ride ${rideId} by user ${userId}:`,
        error,
      );
      throw error;
    }
  }
}

module.exports = new ReviewService();
