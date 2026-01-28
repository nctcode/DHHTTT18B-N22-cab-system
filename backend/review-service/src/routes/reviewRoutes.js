const express = require("express");
const reviewController = require("../controllers/reviewController");

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Reviews
 *   description: Review management endpoints
 */

/**
 * @swagger
 * /api/reviews:
 *   post:
 *     summary: Create a new review
 *     tags: [Reviews]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - rideId
 *               - userId
 *               - driverId
 *               - rating
 *             properties:
 *               rideId:
 *                 type: string
 *                 example: "11111111-1111-1111-1111-111111111111"
 *               userId:
 *                 type: string
 *                 example: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"
 *               driverId:
 *                 type: string
 *                 example: "dddddddd-dddd-dddd-dddd-dddddddddddd"
 *               rating:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *                 example: 5
 *               comment:
 *                 type: string
 *                 example: "Excellent service!"
 *     responses:
 *       201:
 *         description: Review created successfully
 *       400:
 *         description: Validation error or duplicate review
 */
router.post("/", reviewController.createReview);

/**
 * @swagger
 * /api/reviews/{id}:
 *   get:
 *     summary: Get review by ID
 *     tags: [Reviews]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         example: "abc123"
 *     responses:
 *       200:
 *         description: Review details
 *       404:
 *         description: Review not found
 */
router.get("/:id", reviewController.getReview);

/**
 * @swagger
 * /api/reviews/driver/{driverId}:
 *   get:
 *     summary: Get reviews by driver ID
 *     tags: [Reviews]
 *     parameters:
 *       - in: path
 *         name: driverId
 *         required: true
 *         schema:
 *           type: string
 *         example: "dddddddd-dddd-dddd-dddd-dddddddddddd"
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: List of reviews with pagination
 */
router.get("/driver/:driverId", reviewController.getDriverReviews);

/**
 * @swagger
 * /api/reviews/user/{userId}:
 *   get:
 *     summary: Get reviews by user ID
 *     tags: [Reviews]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         example: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: List of reviews with pagination
 */
router.get("/user/:userId", reviewController.getUserReviews);

/**
 * @swagger
 * /api/reviews/driver/{driverId}/average:
 *   get:
 *     summary: Get driver average rating
 *     tags: [Reviews]
 *     parameters:
 *       - in: path
 *         name: driverId
 *         required: true
 *         schema:
 *           type: string
 *         example: "dddddddd-dddd-dddd-dddd-dddddddddddd"
 *     responses:
 *       200:
 *         description: Driver average rating and total reviews
 */
router.get(
  "/driver/:driverId/average",
  reviewController.getDriverAverageRating,
);

/**
 * @swagger
 * /api/reviews/check:
 *   get:
 *     summary: Check if user has reviewed a ride
 *     tags: [Reviews]
 *     parameters:
 *       - in: query
 *         name: rideId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Check result
 */
router.get("/check", reviewController.checkUserReview);

/**
 * @swagger
 * /api/reviews/{id}:
 *   delete:
 *     summary: Delete a review (Admin only)
 *     tags: [Reviews]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Review deleted successfully
 *       404:
 *         description: Review not found
 */
router.delete("/:id", reviewController.deleteReview);

module.exports = router;
