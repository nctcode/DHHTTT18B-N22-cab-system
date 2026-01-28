require("dotenv").config();
const { connectDB } = require("../config/database");
const Review = require("../models/Review");
const logger = require("../utils/logger");

const sampleReviews = [
  {
    rideId: "11111111-1111-1111-1111-111111111111",
    userId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    driverId: "dddddddd-dddd-dddd-dddd-dddddddddddd",
    rating: 5,
    comment: "Excellent driver! Very professional and safe.",
  },
  {
    rideId: "22222222-2222-2222-2222-222222222222",
    userId: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
    driverId: "dddddddd-dddd-dddd-dddd-dddddddddddd",
    rating: 4,
    comment: "Good service, clean car.",
  },
  {
    rideId: "33333333-3333-3333-3333-333333333333",
    userId: "cccccccc-cccc-cccc-cccc-cccccccccccc",
    driverId: "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee",
    rating: 3,
    comment: "Average experience, arrived a bit late.",
  },
  {
    rideId: "44444444-4444-4444-4444-444444444444",
    userId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    driverId: "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee",
    rating: 5,
    comment: "Perfect ride, highly recommended!",
  },
  {
    rideId: "55555555-5555-5555-5555-555555555555",
    userId: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
    driverId: "ffffffff-ffff-ffff-ffff-ffffffffffff",
    rating: 2,
    comment: "Car was not clean, driver seemed inexperienced.",
  },
  {
    rideId: "66666666-6666-6666-6666-666666666666",
    userId: "cccccccc-cccc-cccc-cccc-cccccccccccc",
    driverId: "dddddddd-dddd-dddd-dddd-dddddddddddd",
    rating: 5,
    comment: "Best driver ever! Will definitely book again.",
  },
  {
    rideId: "77777777-7777-7777-7777-777777777777",
    userId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    driverId: "ffffffff-ffff-ffff-ffff-ffffffffffff",
    rating: 4,
    comment: "Prompt and courteous service.",
  },
  {
    rideId: "88888888-8888-8888-8888-888888888888",
    userId: "dddddddd-dddd-dddd-dddd-dddddddddddd",
    driverId: "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee",
    rating: 1,
    comment: "Terrible experience. Driver was rude.",
  },
  {
    rideId: "99999999-9999-9999-9999-999999999999",
    userId: "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee",
    driverId: "ffffffff-ffff-ffff-ffff-ffffffffffff",
    rating: 3,
    comment: "It was okay. Nothing special.",
  },
  {
    rideId: "10101010-1010-1010-1010-101010101010",
    userId: "ffffffff-ffff-ffff-ffff-ffffffffffff",
    driverId: "dddddddd-dddd-dddd-dddd-dddddddddddd",
    rating: 5,
    comment: "Very safe driver, especially in bad weather.",
  },
];

async function seedDatabase() {
  try {
    logger.info("🔗 Connecting to MongoDB Atlas...");
    await connectDB();

    logger.info("🧹 Clearing existing reviews...");
    const deleteResult = await Review.deleteMany({});
    logger.info(`Deleted ${deleteResult.deletedCount} existing reviews`);

    logger.info("🌱 Seeding sample reviews...");
    const insertResult = await Review.insertMany(sampleReviews);
    logger.info(`✅ Successfully seeded ${insertResult.length} reviews`);

    // Get statistics
    const totalReviews = await Review.countDocuments();

    // Get driver statistics using aggregation
    const driverStats = await Review.aggregate([
      {
        $group: {
          _id: "$driverId",
          averageRating: { $avg: "$rating" },
          totalReviews: { $sum: 1 },
          ratings: { $push: "$rating" },
        },
      },
      { $sort: { averageRating: -1 } },
    ]);

    // Get user statistics
    const userStats = await Review.aggregate([
      {
        $group: {
          _id: "$userId",
          totalReviews: { $sum: 1 },
        },
      },
      { $sort: { totalReviews: -1 } },
    ]);

    // Display summary
    logger.info("\n📊 SEEDING SUMMARY");
    logger.info("=".repeat(50));
    logger.info(`Total Reviews: ${totalReviews}`);
    logger.info(`Sample Users: ${userStats.length}`);
    logger.info(`Sample Drivers: ${driverStats.length}`);

    logger.info("\n🏆 DRIVER RATINGS:");
    driverStats.forEach((stat, index) => {
      logger.info(`${index + 1}. Driver ${stat._id}:`);
      logger.info(`   Average: ${stat.averageRating.toFixed(2)} ⭐`);
      logger.info(`   Reviews: ${stat.totalReviews}`);

      // Calculate rating distribution
      const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      stat.ratings.forEach((rating) => {
        if (rating >= 1 && rating <= 5) distribution[rating]++;
      });

      logger.info(
        `   Distribution: ${Object.values(distribution).join(" | ")}`,
      );
    });

    logger.info("\n👤 USER ACTIVITY:");
    userStats.forEach((stat, index) => {
      logger.info(
        `${index + 1}. User ${stat._id}: ${stat.totalReviews} reviews`,
      );
    });

    logger.info("\n🎯 SAMPLE REVIEW IDs (for testing):");
    insertResult.slice(0, 3).forEach((review, index) => {
      logger.info(`${index + 1}. Review ID: ${review._id}`);
      logger.info(`   Ride: ${review.rideId}`);
      logger.info(`   User: ${review.userId}`);
      logger.info(`   Driver: ${review.driverId}`);
      logger.info(`   Rating: ${review.rating} ⭐`);
    });

    logger.info("\n🚀 Ready to test!");
    logger.info("Test endpoints:");
    logger.info("  Health: GET http://localhost:3006/health");
    logger.info("  Create: POST http://localhost:3006/api/reviews");
    logger.info(
      "  Driver reviews: GET http://localhost:3006/api/reviews/driver/dddddddd-dddd-dddd-dddd-dddddddddddd",
    );

    process.exit(0);
  } catch (error) {
    logger.error("❌ Error seeding database:", error);

    if (error.name === "MongoServerError" && error.code === 11000) {
      logger.error(
        "Duplicate key error. Some rideIds already exist in database.",
      );
    } else if (error.name === "MongoNetworkError") {
      logger.error("Network error. Please check:");
      logger.error("1. MongoDB Atlas connection string");
      logger.error("2. Internet connection");
      logger.error("3. IP whitelist in Atlas dashboard");
    }

    process.exit(1);
  }
}

seedDatabase();
