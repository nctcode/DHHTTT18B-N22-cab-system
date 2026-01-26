const express = require("express");
const ctrl = require("../controllers/ride.controller");

const router = express.Router();

router.post("/", ctrl.createRide);
router.get("/:id", ctrl.getRideById);

router.put("/:id/assign-driver", ctrl.assignDriver);
router.put("/:id/start", ctrl.startRide);
router.put("/:id/complete", ctrl.completeRide);
router.put("/:id/cancel", ctrl.cancelRide);

router.get("/user/:userId", ctrl.getByUser);
router.get("/driver/:driverId", ctrl.getByDriver);

module.exports = router;
