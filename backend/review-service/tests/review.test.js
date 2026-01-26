const request = require("supertest");
const app = require("../src/app");
const Review = require("../src/models/Review");
const { sequelize } = require("../src/config/database");

describe("Review Service API Tests", () => {
  beforeAll(async () => {
    await sequelize.authenticate();
    await Review.sync({ force: true });
  });

  afterAll(async () => {
    await sequelize.close();
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
      expect(response.body.data.rideId).toBe(reviewData.rideId);
      expect(response.body.data.rating).toBe(reviewData.rating);
    });

    it("should return 400 for invalid data", async () => {
      const invalidData = {
        rideId: "invalid-uuid",
        userId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
        driverId: "dddddddd-dddd-dddd-dddd-dddddddddddd",
        rating: 6, // Invalid rating
        comment: "Test",
      };

      const response = await request(app)
        .post("/api/reviews")
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });
  });

  describe("GET /api/reviews/:id", () => {
    let reviewId;

    beforeAll(async () => {
      const review = await Review.create({
        rideId: "22222222-2222-2222-2222-222222222222",
        userId: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
        driverId: "dddddddd-dddd-dddd-dddd-dddddddddddd",
        rating: 4,
        comment: "Test review",
      });
      reviewId = review.id;
    });

    it("should get review by ID", async () => {
      const response = await request(app)
        .get(`/api/reviews/${reviewId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(reviewId);
    });

    it("should return 404 for non-existent review", async () => {
      const response = await request(app)
        .get("/api/reviews/99999999-9999-9999-9999-999999999999")
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe("GET /api/reviews/driver/:driverId", () => {
    const driverId = "dddddddd-dddd-dddd-dddd-dddddddddddd";

    beforeAll(async () => {
      await Review.bulkCreate([
        {
          rideId: "33333333-3333-3333-3333-333333333333",
          userId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
          driverId: driverId,
          rating: 5,
        },
        {
          rideId: "44444444-4444-4444-4444-444444444444",
          userId: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
          driverId: driverId,
          rating: 4,
        },
      ]);
    });

    it("should get reviews for a driver", async () => {
      const response = await request(app)
        .get(`/api/reviews/driver/${driverId}`)
        .query({ page: 1, limit: 10 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.reviews).toBeInstanceOf(Array);
      expect(response.body.pagination).toBeDefined();
      expect(response.body.reviews.length).toBeGreaterThan(0);
      response.body.reviews.forEach((review) => {
        expect(review.driverId).toBe(driverId);
      });
    });

    it("should support pagination", async () => {
      const response = await request(app)
        .get(`/api/reviews/driver/${driverId}`)
        .query({ page: 1, limit: 1 })
        .expect(200);

      expect(response.body.reviews.length).toBe(1);
      expect(response.body.pagination.limit).toBe(1);
    });
  });
});
