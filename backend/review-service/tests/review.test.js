const request = require("supertest");
const mongoose = require("mongoose");
const app = require("../src/app");
const Review = require("../src/models/Review");

// Mock MongoDB Atlas connection for testing
const TEST_MONGODB_URI =
  process.env.TEST_MONGODB_URI || "mongodb://localhost:27017/test_review_db";

describe("Review Service API Tests - MongoDB Atlas", () => {
  beforeAll(async () => {
    // Connect to test database
    await mongoose.connect(TEST_MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    // Clear database before each test
    await Review.deleteMany({});
  });

  describe("Health Check", () => {
    it("should return health status", async () => {
      const response = await request(app).get("/health").expect(200);

      expect(response.body.status).toBe("OK");
      expect(response.body.service).toBe("Review Service");
      expect(response.body.database).toBe("MongoDB Atlas");
    });
  });

  describe("POST /api/reviews", () => {
    it("should create a new review", async () => {
      const reviewData = {
        rideId: "11111111-1111-1111-1111-111111111111",
        userId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
        driverId: "dddddddd-dddd-dddd-dddd-dddddddddddd",
        rating: 5,
        comment: "Great service!",
      };

      const response = await request(app)
        .post("/api/reviews")
        .send(reviewData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe("Review created successfully");
      expect(response.body.data.rideId).toBe(reviewData.rideId);
      expect(response.body.data.rating).toBe(reviewData.rating);
      expect(response.body.data.id).toBeDefined();
    });

    it("should return 400 for duplicate rideId", async () => {
      const reviewData = {
        rideId: "22222222-2222-2222-2222-222222222222",
        userId: "user123",
        driverId: "driver456",
        rating: 4,
      };

      // Create first review
      await Review.create(reviewData);

      // Try to create duplicate
      const response = await request(app)
        .post("/api/reviews")
        .send(reviewData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe(
        "A review already exists for this ride",
      );
    });

    it("should return 400 for invalid rating", async () => {
      const reviewData = {
        rideId: "33333333-3333-3333-3333-333333333333",
        userId: "user123",
        driverId: "driver456",
        rating: 6, // Invalid: should be 1-5
        comment: "Test",
      };

      const response = await request(app)
        .post("/api/reviews")
        .send(reviewData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });
  });

  describe("GET /api/reviews/:id", () => {
    it("should get review by ID", async () => {
      // Create a test review
      const review = await Review.create({
        rideId: "44444444-4444-4444-4444-444444444444",
        userId: "user789",
        driverId: "driver012",
        rating: 5,
      });

      const response = await request(app)
        .get(`/api/reviews/${review._id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(review._id.toString());
      expect(response.body.data.rideId).toBe(
        "44444444-4444-4444-4444-444444444444",
      );
    });

    it("should return 404 for non-existent review", async () => {
      const response = await request(app)
        .get("/api/reviews/507f1f77bcf86cd799439011")
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("Review not found");
    });
  });

  describe("GET /api/reviews/driver/:driverId", () => {
    const driverId = "dddddddd-dddd-dddd-dddd-dddddddddddd";

    beforeEach(async () => {
      // Create test data
      await Review.create([
        {
          rideId: "1",
          userId: "user1",
          driverId: driverId,
          rating: 5,
          createdAt: new Date("2024-01-01"),
        },
        {
          rideId: "2",
          userId: "user2",
          driverId: driverId,
          rating: 4,
          createdAt: new Date("2024-01-02"),
        },
        {
          rideId: "3",
          userId: "user3",
          driverId: "other-driver",
          rating: 3,
        },
      ]);
    });

    it("should get reviews for a driver", async () => {
      const response = await request(app)
        .get(`/api/reviews/driver/${driverId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.reviews).toHaveLength(2);
      expect(response.body.pagination.total).toBe(2);
      response.body.reviews.forEach((review) => {
        expect(review.driverId).toBe(driverId);
      });
    });

    it("should support pagination", async () => {
      const response = await request(app)
        .get(`/api/reviews/driver/${driverId}`)
        .query({ page: 1, limit: 1 })
        .expect(200);

      expect(response.body.reviews).toHaveLength(1);
      expect(response.body.pagination.limit).toBe(1);
      expect(response.body.pagination.totalPages).toBe(2);
    });

    it("should sort by createdAt descending", async () => {
      const response = await request(app)
        .get(`/api/reviews/driver/${driverId}`)
        .expect(200);

      // Should be sorted by createdAt descending
      const dates = response.body.reviews.map((r) => new Date(r.createdAt));
      for (let i = 1; i < dates.length; i++) {
        expect(dates[i]).toBeLessThanOrEqual(dates[i - 1]);
      }
    });
  });

  describe("GET /api/reviews/driver/:driverId/average", () => {
    const driverId = "test-driver-avg";

    beforeEach(async () => {
      await Review.create([
        { rideId: "a1", userId: "u1", driverId, rating: 5 },
        { rideId: "a2", userId: "u2", driverId, rating: 4 },
        { rideId: "a3", userId: "u3", driverId, rating: 3 },
        { rideId: "a4", userId: "u4", driverId, rating: 5 },
        { rideId: "b1", userId: "u5", driverId: "other", rating: 1 },
      ]);
    });

    it("should calculate average rating correctly", async () => {
      const response = await request(app)
        .get(`/api/reviews/driver/${driverId}/average`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.driverId).toBe(driverId);
      expect(response.body.data.averageRating).toBe(4.25); // (5+4+3+5)/4 = 4.25
      expect(response.body.data.totalReviews).toBe(4);
      expect(response.body.data.ratingDistribution).toBeDefined();
    });

    it("should return 0 for driver with no reviews", async () => {
      const response = await request(app)
        .get("/api/reviews/driver/nonexistent-driver/average")
        .expect(200);

      expect(response.body.data.averageRating).toBe(0);
      expect(response.body.data.totalReviews).toBe(0);
    });
  });

  describe("DELETE /api/reviews/:id", () => {
    it("should delete a review", async () => {
      const review = await Review.create({
        rideId: "delete-test-ride",
        userId: "user-delete",
        driverId: "driver-delete",
        rating: 5,
      });

      const response = await request(app)
        .delete(`/api/reviews/${review._id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe("Review deleted successfully");

      // Verify deletion
      const deletedReview = await Review.findById(review._id);
      expect(deletedReview).toBeNull();
    });

    it("should return 404 for non-existent review", async () => {
      const response = await request(app)
        .delete("/api/reviews/507f1f77bcf86cd799439011")
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("Review not found");
    });
  });
});
