const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Driver = sequelize.define('Driver', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {  // Soft reference to User Service
    type: DataTypes.UUID,
    allowNull: true,  // Nullable for migration compatibility
    unique: true,
    field: 'user_id'
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  phone: {
    type: DataTypes.STRING(20),
    allowNull: false,
    unique: true
  },
  licenseNumber: {
    type: DataTypes.STRING(50),
    allowNull: true,  // Nullable initially
    unique: true,
    field: 'license_number'
  },
  vehicleType: {
    type: DataTypes.ENUM('BIKE', 'CAR'),
    allowNull: false,
    defaultValue: 'CAR',
    field: 'vehicle_type'
  },
  vehiclePlate: {
    type: DataTypes.STRING(20),
    allowNull: false,
    unique: true,
    field: 'vehicle_plate'
  },
  status: {
    type: DataTypes.ENUM('ONLINE', 'OFFLINE', 'BUSY'),
    defaultValue: 'OFFLINE'
  },
  ratingAvg: {
    type: DataTypes.FLOAT,
    defaultValue: 5.0,
    field: 'rating_avg',
    validate: {
      min: 0,
      max: 5
    }
  },
  verified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  walletBalance: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0.00,
    allowNull: false,
    field: 'wallet_balance',
    validate: {
      min: 0
    }
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'created_at'
  },
  updatedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'updated_at'
  }
}, {
  tableName: 'drivers',
  timestamps: false  // We handle timestamps manually
});

module.exports = Driver;