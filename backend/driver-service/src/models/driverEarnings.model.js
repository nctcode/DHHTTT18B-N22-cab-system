const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Driver = require('./driver.model');

const DriverEarnings = sequelize.define('DriverEarnings', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  driverId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'driver_id',
    references: {
      model: Driver,
      key: 'id'
    }
  },
  rideId: {  // Soft reference to Ride Service (MongoDB)
    type: DataTypes.STRING(100),
    allowNull: false,
    field: 'ride_id'
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0
    }
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'created_at'
  }
}, {
  tableName: 'driver_earnings',
  timestamps: false
});

// Define associations
Driver.hasMany(DriverEarnings, { 
  foreignKey: 'driverId', 
  as: 'earnings' 
});

DriverEarnings.belongsTo(Driver, { 
  foreignKey: 'driverId', 
  as: 'driver' 
});

module.exports = DriverEarnings;
