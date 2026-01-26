const Ride = require("../models/ride.model");

// POST /rides
exports.createRide = async (req, res) => {
  const ride = await Ride.create(req.body);
  res.status(201).json(ride);
};

// GET /rides/:id
exports.getRideById = async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({
      message: "Invalid ride id",
    });
  }

  const ride = await Ride.findById(id);
  if (!ride) {
    return res.status(404).json({ message: "Ride not found" });
  }

  res.json(ride);
};

// PUT /rides/:id/assign-driver
exports.assignDriver = async (req, res) => {
  const ride = await Ride.findByIdAndUpdate(
    req.params.id,
    { driverId: req.body.driverId },
    { new: true },
  );
  res.json(ride);
};

// PUT /rides/:id/start
exports.startRide = async (req, res) => {
  const ride = await Ride.findByIdAndUpdate(
    req.params.id,
    { status: "STARTED", startedAt: new Date() },
    { new: true },
  );
  res.json(ride);
};

// PUT /rides/:id/complete
exports.completeRide = async (req, res) => {
  const ride = await Ride.findByIdAndUpdate(
    req.params.id,
    { status: "COMPLETED", completedAt: new Date() },
    { new: true },
  );
  res.json(ride);
};

// PUT /rides/:id/cancel
exports.cancelRide = async (req, res) => {
  const ride = await Ride.findByIdAndUpdate(
    req.params.id,
    { status: "CANCELLED" },
    { new: true },
  );
  res.json(ride);
};

// GET /rides/user/:userId
exports.getByUser = async (req, res) => {
  const rides = await Ride.find({ userId: req.params.userId });
  res.json(rides);
};

// GET /rides/driver/:driverId
exports.getByDriver = async (req, res) => {
  const rides = await Ride.find({ driverId: req.params.driverId });
  res.json(rides);
};
