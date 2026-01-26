const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");
const { v4: uuidv4 } = require("uuid");

const Review = sequelize.define(
  "Review",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: () => uuidv4(),
      primaryKey: true,
    },
    rideId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "ride_id",
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "user_id",
    },
    driverId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "driver_id",
    },
    rating: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 1,
        max: 5,
      },
    },
    comment: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: "created_at",
    },
  },
  {
    tableName: "reviews",
    timestamps: false,
    indexes: [
      {
        fields: ["ride_id"],
        unique: true,
      },
      {
        fields: ["user_id"],
      },
      {
        fields: ["driver_id"],
      },
      {
        fields: ["created_at"],
      },
    ],
  },
);

module.exports = Review;
