const mongoose = require("mongoose");

const RideSchema = new mongoose.Schema({
  bookingId: { type: String, required: true },
  userId: { type: String, required: true },
  driverId: { type: String, default: null },

  status: {
    type: String,
    enum: ["CREATED", "STARTED", "COMPLETED", "CANCELLED"],
    default: "CREATED",
  },

  pickup: String,
  dropoff: String,

  createdAt: { type: Date, default: Date.now },
  startedAt: Date,
  completedAt: Date,
});

module.exports = mongoose.model("Ride", RideSchema);
