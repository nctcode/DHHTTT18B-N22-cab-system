const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  bookingId: {
    type: String,
    required: true,
    unique: true,
    default: () => `BKG${Date.now()}${Math.floor(Math.random() * 1000)}`
  },
  passengerId: {
    type: String,
    required: true,
    index: true
  },
  driverId: {
    type: String,
    index: true
  },
  // pickupLocation: {
  //   address: String,
  //   coordinates: {
  //     type: [Number],  // [longitude, latitude]
  //     required: true,
  //     validate: {
  //       validator: function(coords) {
  //         return Array.isArray(coords) && 
  //               coords.length === 2 &&
  //               coords[0] >= -180 && coords[0] <= 180 &&  // longitude
  //               coords[1] >= -90 && coords[1] <= 90;      // latitude
  //       },
  //       message: 'Coordinates must be [longitude, latitude] array'
  //     }
  //   }
  // },
  // destination: {
  //   address: String,
  //   coordinates: {
  //     type: [Number],  // [longitude, latitude]
  //     required: true,
  //     validate: {
  //       validator: function(coords) {
  //         return Array.isArray(coords) && 
  //               coords.length === 2 &&
  //               coords[0] >= -180 && coords[0] <= 180 &&
  //               coords[1] >= -90 && coords[1] <= 90;
  //       },
  //       message: 'Coordinates must be [longitude, latitude] array'
  //     }
  //   }
  // },
  // Trong booking.model.js
pickupLocation: {
  address: String,
  coordinates: mongoose.Schema.Types.Mixed
},
destination: {
  address: String,
  coordinates: mongoose.Schema.Types.Mixed
},
  status: {
    type: String,
    enum: [
      'PENDING',          // Đang tìm tài xế
      'ASSIGNED',         // Đã có tài xế
      'ARRIVING',         // Tài xế đang đến
      'IN_PROGRESS',      // Đang di chuyển
      'COMPLETED',        // Hoàn thành
      'CANCELLED',        // Đã hủy
      'NO_DRIVER',        // Không có tài xế
      'TIMEOUT'           // Quá thời gian chờ
    ],
    default: 'PENDING',
    index: true
  },
  vehicleType: {
    type: String,
    enum: ['STANDARD', 'PREMIUM', 'LUXURY', 'BIKE'],
    default: 'STANDARD'
  },
  estimatedDistance: Number, // km
  estimatedDuration: Number, // phút
  actualDistance: Number,
  actualDuration: Number,
  fare: {
    baseFare: Number,
    distanceFare: Number,
    timeFare: Number,
    surgeMultiplier: {
      type: Number,
      default: 1.0
    },
    totalFare: Number,
    currency: {
      type: String,
      default: 'VND'
    }
  },
  payment: {
    method: {
      type: String,
      enum: ['CASH', 'CARD', 'WALLET', 'BANKING'],
      default: 'CASH'
    },
    status: {
      type: String,
      enum: ['PENDING', 'PAID', 'FAILED', 'REFUNDED'],
      default: 'PENDING'
    },
    transactionId: String
  },
  scheduleTime: Date,
  requestedAt: {
    type: Date,
    default: Date.now
  },
  assignedAt: Date,
  startedAt: Date,
  completedAt: Date,
  cancelledAt: Date,
  cancelledBy: {
    type: String,
    enum: ['PASSENGER', 'DRIVER', 'SYSTEM']
  },
  cancellationReason: String,
  rating: {
    driverRating: Number,
    passengerRating: Number,
    feedback: String
  },
  metadata: {
    aiScore: Number,      // Điểm từ AI matching
    priority: Number,     // Độ ưu tiên
    notes: String         // Ghi chú đặc biệt
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
bookingSchema.index({ status: 1, createdAt: -1 });
bookingSchema.index({ passengerId: 1, createdAt: -1 });
bookingSchema.index({ driverId: 1, createdAt: -1 });
bookingSchema.index({ 
  'pickupLocation.coordinates': '2dsphere',
  status: 1 
});
bookingSchema.index({ createdAt: 1 }, { expireAfterSeconds: 2592000 }); // Tự động xóa sau 30 ngày

// Virtuals
bookingSchema.virtual('isActive').get(function() {
  return ['PENDING', 'ASSIGNED', 'ARRIVING', 'IN_PROGRESS'].includes(this.status);
});

bookingSchema.virtual('duration').get(function() {
  if (this.startedAt && this.completedAt) {
    return Math.round((this.completedAt - this.startedAt) / 60000); // phút
  }
  return null;
});

// Methods
bookingSchema.methods.cancel = function(by, reason) {
  this.status = 'CANCELLED';
  this.cancelledAt = new Date();
  this.cancelledBy = by;
  this.cancellationReason = reason;
  return this.save();
};

bookingSchema.methods.complete = function(paymentData) {
  this.status = 'COMPLETED';
  this.completedAt = new Date();
  this.payment = { ...this.payment, ...paymentData };
  return this.save();
};

// Statics
bookingSchema.statics.findNearbyBookings = async function(coordinates, maxDistance = 5000) {
  return this.find({
    'pickupLocation.coordinates': {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [coordinates.lng, coordinates.lat]
        },
        $maxDistance: maxDistance
      }
    },
    status: 'PENDING'
  });
};

bookingSchema.statics.getUserStats = async function(userId, userType) {
  const matchStage = userType === 'passenger' 
    ? { passengerId: userId }
    : { driverId: userId };
    
  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalBookings: { $sum: 1 },
        completedBookings: { 
          $sum: { $cond: [{ $eq: ['$status', 'COMPLETED'] }, 1, 0] }
        },
        cancelledBookings: {
          $sum: { $cond: [{ $eq: ['$status', 'CANCELLED'] }, 1, 0] }
        },
        totalEarned: {
          $sum: { $cond: [{ $eq: ['$status', 'COMPLETED'] }, '$fare.totalFare', 0] }
        },
        avgRating: {
          $avg: userType === 'driver' ? '$rating.driverRating' : '$rating.passengerRating'
        }
      }
    }
  ]);
};

module.exports = mongoose.model('Booking', bookingSchema);