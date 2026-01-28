const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Driver = sequelize.define('Driver', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
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
  vehicle_type: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'car'
  },
  vehicle_plate: {
    type: DataTypes.STRING(20),
    allowNull: false,
    unique: true
  },
  status: {
    type: DataTypes.ENUM('ONLINE', 'OFFLINE', 'BUSY'),
    defaultValue: 'OFFLINE'
  },
  rating: {
    type: DataTypes.FLOAT,
    defaultValue: 5.0,
    validate: {
      min: 0,
      max: 5
    }
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'drivers',
  timestamps: false
});

module.exports = Driver;