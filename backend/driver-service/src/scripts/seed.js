const sequelize = require('../config/database');
const Driver = require('../models/driver.model');
const DriverLocation = require('../models/driverLocation.model');

const seedData = async () => {
  try {
    await sequelize.sync({ force: true });
    console.log('Database synced!');

    // Sample drivers data
    const drivers = [
      {
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Nguyễn Văn A',
        phone: '0912345678',
        vehicle_type: 'car',
        vehicle_plate: '51A-12345',
        status: 'ONLINE',
        rating: 4.8
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440001',
        name: 'Trần Thị B',
        phone: '0912345679',
        vehicle_type: 'bike',
        vehicle_plate: '51A-12346',
        status: 'ONLINE',
        rating: 4.5
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440002',
        name: 'Lê Văn C',
        phone: '0912345680',
        vehicle_type: 'premium',
        vehicle_plate: '51A-12347',
        status: 'BUSY',
        rating: 4.9
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440003',
        name: 'Phạm Thị D',
        phone: '0912345681',
        vehicle_type: 'suv',
        vehicle_plate: '51A-12348',
        status: 'OFFLINE',
        rating: 4.7
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440004',
        name: 'Hoàng Văn E',
        phone: '0912345682',
        vehicle_type: 'car',
        vehicle_plate: '51A-12349',
        status: 'ONLINE',
        rating: 4.6
      }
    ];

    // Create drivers
    for (const driverData of drivers) {
      await Driver.create(driverData);
    }
    console.log(`${drivers.length} drivers created!`);

    // Sample locations (Hồ Chí Minh City coordinates)
    const locations = [
      {
        driver_id: '550e8400-e29b-41d4-a716-446655440000',
        lat: 10.7769,
        lng: 106.7009
      },
      {
        driver_id: '550e8400-e29b-41d4-a716-446655440001',
        lat: 10.7812,
        lng: 106.6954
      },
      {
        driver_id: '550e8400-e29b-41d4-a716-446655440002',
        lat: 10.7639,
        lng: 106.6824
      },
      {
        driver_id: '550e8400-e29b-41d4-a716-446655440004',
        lat: 10.7889,
        lng: 106.7042
      }
    ];

    // Create locations
    for (const locationData of locations) {
      await DriverLocation.create(locationData);
    }
    console.log(`${locations.length} driver locations created!`);

    console.log('Seed data completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding data:', error);
    process.exit(1);
  }
};

seedData();