const mongoose = require('mongoose');

const LocationSchema = new mongoose.Schema({
  lat: { type: Number, required: true },
  lng: { type: Number, required: true },
  address: { type: String, required: true }
}, { _id: false });

const CandidateDriverSchema = new mongoose.Schema({
  driverId: { type: String, required: true },   // prisma driver UUID
  userId: { type: String, required: true },      // auth user UUID (for socket room)
  distance: Number,
  rating: Number,
  vehicleType: String,
  vehiclePlate: String,
  status: {
    type: String,
    enum: ['PENDING', 'OFFERED', 'ACCEPTED', 'REJECTED', 'TIMEOUT', 'CANCELLED'],
    default: 'PENDING'
  }
}, { _id: false });

const BookingSchema = new mongoose.Schema({
  passengerId: { 
    type: String, 
    required: true,
    index: true 
  },
  pickup: { 
    type: LocationSchema, 
    required: true 
  },
  dropoff: { 
    type: LocationSchema, 
    required: true 
  },
  vehicleType: { 
    type: String, 
    required: true,
    enum: ['BIKE', 'CAR', 'PREMIUM', 'ECONOMY', 'SUV'] 
  },
  estimatedPrice: { 
    type: Number, 
    required: true 
  },
  status: { 
    type: String, 
    enum: ['PENDING', 'SEARCHING', 'MATCHED', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_DRIVER_FOUND'], 
    default: 'PENDING',
    index: true
  },
  paymentMethod: {
    type: String,
    enum: ['CASH', 'WALLET', 'CARD'],
    default: 'CASH'
  },
  paymentStatus: {
    type: String,
    enum: ['UNPAID', 'PENDING', 'PAID', 'FAILED'],
    default: 'UNPAID'
  },
  // Sequential matching fields
  assignedDriverId: { type: String, default: null },
  driverUserId: { type: String, default: null },
  matchScore: Number,
  matchConfidence: Number,
  candidateDrivers: [CandidateDriverSchema],
  currentOfferIndex: { type: Number, default: -1 },
  offerExpiresAt: Date,
  route: {
    distanceKm: Number,
    durationMin: Number,
    polyline: [[Number]]
  }
}, {
  timestamps: true,
  versionKey: false
});

module.exports = mongoose.model('Booking', BookingSchema);