const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");

const reviewSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      default: () => uuidv4(),
    },
    rideId: {
      type: String,
      required: [true, "Ride ID is required"],
      unique: true,
      trim: true,
      index: true,
    },
    userId: {
      type: String,
      required: [true, "User ID is required"],
      trim: true,
      index: true,
    },
    driverId: {
      type: String,
      required: [true, "Driver ID is required"],
      trim: true,
      index: true,
    },
    rating: {
      type: Number,
      required: [true, "Rating is required"],
      min: [1, "Rating must be at least 1"],
      max: [5, "Rating cannot exceed 5"],
      index: true,
    },
    comment: {
      type: String,
      maxlength: [500, "Comment cannot exceed 500 characters"],
      trim: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: false,
    versionKey: false,
    toJSON: {
      virtuals: false,
      transform: function (doc, ret) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
    toObject: {
      virtuals: false,
      transform: function (doc, ret) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  },
);

// Compound indexes for better query performance
reviewSchema.index({ driverId: 1, createdAt: -1 });
reviewSchema.index({ userId: 1, createdAt: -1 });
reviewSchema.index({ driverId: 1, rating: 1 });
reviewSchema.index({ createdAt: -1 });

// Pre-save middleware to ensure rideId uniqueness
reviewSchema.pre("save", async function (next) {
  if (this.isModified("rideId")) {
    const existingReview = await mongoose.model("Review").findOne({
      rideId: this.rideId,
      _id: { $ne: this._id },
    });

    if (existingReview) {
      const error = new Error("A review already exists for this ride");
      error.status = 400;
      return next(error);
    }
  }
  next();
});

const Review = mongoose.model("Review", reviewSchema, "reviews");
module.exports = Review;
