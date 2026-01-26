require("dotenv").config();
const { sequelize } = require("../config/database");
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
];

async function seedDatabase() {
  try {
    await sequelize.authenticate();
    logger.info("Connected to database for seeding");

    // Sync models
    await sequelize.sync({ force: true });
    logger.info("Database schema created");

    // Insert sample data
    for (const reviewData of sampleReviews) {
      await Review.create(reviewData);
    }

    logger.info(`✅ Successfully seeded ${sampleReviews.length} reviews`);

    // Display summary
    const totalReviews = await Review.count();
    const driverAverages = await Review.findAll({
      attributes: [
        "driverId",
        [sequelize.fn("AVG", sequelize.col("rating")), "avgRating"],
        [sequelize.fn("COUNT", sequelize.col("id")), "total"],
      ],
      group: ["driverId"],
    });

    logger.info("\n📊 Seeding Summary:");
    logger.info(`Total reviews: ${totalReviews}`);
    logger.info("\nDriver Statistics:");
    driverAverages.forEach((driver) => {
      logger.info(
        `Driver ${driver.driverId}: ${parseFloat(driver.dataValues.avgRating).toFixed(1)} stars (${driver.dataValues.total} reviews)`,
      );
    });

    process.exit(0);
  } catch (error) {
    logger.error("Error seeding database:", error);
    process.exit(1);
  }
}

seedDatabase();
