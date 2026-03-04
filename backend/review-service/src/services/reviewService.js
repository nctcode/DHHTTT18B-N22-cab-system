const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const eventBus = require('../events/eventBus');
const { EVENTS } = require('../events/eventContracts');

class ReviewService {

  /**
   * Create a review for a completed ride.
   * Validates rating, ride eligibility, and prevents duplicates.
   */
  async createReview({ rideId, reviewerId, targetUserId, rating, comment }) {
    // 1. Validate rating range
    if (!rating || rating < 1 || rating > 5) {
      throw { status: 400, message: 'Rating must be between 1 and 5' };
    }

    if (!rideId || !targetUserId) {
      throw { status: 400, message: 'rideId and targetUserId are required' };
    }

    // 2. Validate ride via RideReadModel (no sync call to Ride Service)
    const ride = await prisma.rideReadModel.findUnique({ where: { rideId } });

    if (!ride) {
      throw { status: 404, message: 'Ride not found. It may not have been completed yet.' };
    }

    if (ride.status !== 'COMPLETED') {
      throw { status: 400, message: 'Can only review completed rides' };
    }

    // 3. Ensure reviewer is part of the ride
    if (reviewerId !== ride.passengerId && reviewerId !== ride.driverId) {
      throw { status: 403, message: 'You are not a participant of this ride' };
    }

    // 4. Create review (unique constraint prevents duplicates)
    try {
      const review = await prisma.review.create({
        data: {
          rideId,
          reviewerId,
          targetUserId,
          rating,
          comment: comment || null
        }
      });

      console.log(`[ReviewService] Review created: ${review.id} for ride ${rideId}`);

      // Calculate updated average rating for target user
      const allReviews = await prisma.review.findMany({
        where: { targetUserId },
        select: { rating: true }
      });
      const averageRating = allReviews.length > 0
        ? Math.round((allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length) * 10) / 10
        : rating;

      // 5. Emit ReviewCreated event (includes averageRating for direct update)
      eventBus.publish(EVENTS.REVIEW_CREATED, {
        reviewId: review.id,
        rideId: review.rideId,
        reviewerId: review.reviewerId,
        targetUserId: review.targetUserId,
        rating: review.rating,
        averageRating,
        totalReviews: allReviews.length,
        createdAt: review.createdAt
      });

      return review;

    } catch (error) {
      // Prisma unique constraint violation
      if (error.code === 'P2002') {
        throw { status: 409, message: 'You have already reviewed this ride' };
      }
      throw error;
    }
  }

  /**
   * Get all reviews for a specific ride
   */
  async getByRideId(rideId) {
    return prisma.review.findMany({
      where: { rideId },
      orderBy: { createdAt: 'desc' }
    });
  }

  /**
   * Get all reviews targeting a specific user
   */
  async getByUserId(userId) {
    const reviews = await prisma.review.findMany({
      where: { targetUserId: userId },
      orderBy: { createdAt: 'desc' }
    });

    // Calculate average rating
    const avgRating = reviews.length > 0
      ? Math.round((reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length) * 10) / 10
      : null;

    return { reviews, averageRating: avgRating, totalReviews: reviews.length };
  }

  /**
   * Check if a review exists for a ride by a specific reviewer
   */
  async checkReview(rideId, reviewerId) {
    const review = await prisma.review.findUnique({
      where: { rideId_reviewerId: { rideId, reviewerId } }
    });
    return {
      exists: !!review,
      reviewId: review?.id || null,
      rating: review?.rating || null
    };
  }
}

module.exports = new ReviewService();
