const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const seedData = async () => {
  try {
    // Clear existing data
    await prisma.driver.deleteMany({});
    console.log('Cleared existing drivers!');

    // Sample drivers data matching Prisma schema
    // Locations are around Hồ Chí Minh City
    const drivers = [
      {
        id: '550e8400-e29b-41d4-a716-446655440000',
        user_id: 'user-uuid-0001',
        vehicle_type: 'car',
        vehicle_plate: '51A-12345',
        is_available: true,
        current_lat: 10.7769,
        current_lng: 106.7009,
        rating_avg: 4.8,
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440001',
        user_id: 'user-uuid-0002',
        vehicle_type: 'bike',
        vehicle_plate: '51A-12346',
        is_available: true,
        current_lat: 10.7812,
        current_lng: 106.6954,
        rating_avg: 4.5,
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440002',
        user_id: 'user-uuid-0003',
        vehicle_type: 'premium',
        vehicle_plate: '51A-12347',
        is_available: false,
        current_lat: 10.7639,
        current_lng: 106.6824,
        rating_avg: 4.9,
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440003',
        user_id: 'user-uuid-0004',
        vehicle_type: 'suv',
        vehicle_plate: '51A-12348',
        is_available: false,
        current_lat: 10.7721,
        current_lng: 106.6980,
        rating_avg: 4.7,
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440004',
        user_id: 'user-uuid-0005',
        vehicle_type: 'car',
        vehicle_plate: '51A-12349',
        is_available: true,
        current_lat: 10.7889,
        current_lng: 106.7042,
        rating_avg: 4.6,
      },
    ];

    // Create drivers
    for (const driverData of drivers) {
      await prisma.driver.create({ data: driverData });
    }
    console.log(`${drivers.length} drivers seeded successfully!`);

    process.exit(0);
  } catch (error) {
    console.error('Error seeding data:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
};

seedData();