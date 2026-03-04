const express = require("express");
const { body } = require("express-validator");
const ctrl = require("../controllers/ride.controller");
const router = express.Router();

router.post(
  "/",
  [
    body("bookingId").notEmpty().withMessage("bookingId is required"),
    body("passengerId").notEmpty().withMessage("passengerId is required"),
    body("paymentMethod").optional().isIn(['CASH', 'WALLET', 'CARD']).withMessage("paymentMethod must be CASH, WALLET, or CARD"),
  ],
  ctrl.createRide
);

router.get("/:id", ctrl.getRideById);
router.get("/passenger/:passengerId", ctrl.getByPassenger);
router.get("/driver/:driverId", ctrl.getByDriver);

router.patch(
  "/:id/assign",
  [body("driverId").notEmpty().withMessage("driverId is required")],
  ctrl.assignDriver
);

router.patch("/:id/start", ctrl.startRide);

// Stage 3: Driver arrived at pickup (no route calc, status → ARRIVED)
router.patch("/:id/arrive", ctrl.arriveRide);

router.patch(
  "/:id/complete",
  [
    body("actualDistanceKm").isFloat({ min: 0 }).withMessage("actualDistanceKm must be positive"),
    body("actualDurationMin").isFloat({ min: 0 }).withMessage("actualDurationMin must be positive"),
  ],
  ctrl.completeRide
);

router.patch("/:id/cancel", ctrl.cancelRide);
router.patch("/:id/driver-cancel", ctrl.driverCancelRide);
router.patch("/:id/confirm-cash-payment", ctrl.confirmCashPayment);

// Dev / Simulation
router.patch("/:id/simulate-wallet", ctrl.simulateWalletPayment);

// AI ETA Prediction
router.post("/eta", ctrl.getETA);
router.post("/route", ctrl.getRoute);

module.exports = router;

