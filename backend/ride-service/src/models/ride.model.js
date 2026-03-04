const mongoose = require("mongoose");

const RideSchema = new mongoose.Schema({
  bookingId: { 
    type: String, 
    required: true,
    unique: true,
    index: true
  },
  passengerId: { 
    type: String, 
    required: true,
    index: true
  },
  driverId: { 
    type: String, 
    default: null,
    index: true
  },

  status: {
    type: String,
    enum: ["CREATED", "ASSIGNED", "ARRIVED", "STARTED", "COMPLETED", "CANCELLED", "CANCELLED_BY_DRIVER"],
    default: "CREATED",
    index: true
  },
  
  // Location Data (Denormalized for independence)
  pickup: {
    address: String,
    lat: Number,
    lng: Number
  },
  dropoff: {
    address: String,
    lat: Number,
    lng: Number
  },
  
  // Stage 1: Preview (Pickup -> Dropoff) - Calculated at booking
  previewRoute: {
    distanceKm: Number,
    durationMin: Number,
    polyline: [[Number]]
  },

  // Stage 2: Driver to Pickup (Driver Loc -> Pickup) - Calculated at acceptance
  driverToPickupRoute: {
    distanceKm: Number,
    durationMin: Number,
    polyline: [[Number]]
  },

  // Stage 3: Trip (Pickup -> Dropoff) - Calculated at start (re-calc or copy)
  tripRoute: {
    distanceKm: Number,
    durationMin: Number,
    polyline: [[Number]]
  },

  // Actual ride metrics
  actualDistanceKm: {
    type: Number,
    default: null
  },
  actualDurationMin: {
    type: Number,
    default: null
  },
  finalFare: {
    type: Number,
    default: null
  },
  paymentMethod: {
    type: String,
    enum: ['CASH', 'CARD'],
    default: 'CASH'
  },
  paymentStatus: {
    type: String,
    enum: ['UNPAID', 'PENDING', 'PAID', 'FAILED'],
    default: 'UNPAID'
  },

  // Timestamps
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  assignedAt: {
    type: Date,
    default: null
  },
  arrivedAt: {
    type: Date,
    default: null
  },
  startedAt: { 
    type: Date,
    default: null
  },
  completedAt: { 
    type: Date,
    default: null
  },
  cancelledAt: {
    type: Date,
    default: null
  }
}, { 
  _id: true, // explicit
  timestamps: false,
  versionKey: false,
  toJSON: {
    transform: (doc, ret) => {
      ret.id = ret._id;
      // delete ret._id; // Keep _id for frontend compatibility
      return ret;
    }
  }
});

module.exports = mongoose.model("Ride", RideSchema);
