const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Driver = require('./driver.model');

const DriverLocation = sequelize.define('DriverLocation', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  driver_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: Driver,
      key: 'id'
    }
  },
  lat: {
    type: DataTypes.DECIMAL(10, 8),
    allowNull: false
  },
  lng: {
    type: DataTypes.DECIMAL(11, 8),
    allowNull: false
  },
  updated_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'driver_locations',
  timestamps: false,
  indexes: [
    {
      fields: ['driver_id']
    },
    {
      fields: ['updated_at']
    }
  ]
});

Driver.hasOne(DriverLocation, { foreignKey: 'driver_id', as: 'location' });
DriverLocation.belongsTo(Driver, { foreignKey: 'driver_id', as: 'driver' });

module.exports = DriverLocation;