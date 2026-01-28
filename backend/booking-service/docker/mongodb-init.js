// docker/mongodb-init.js
db = db.getSiblingDB('cab_booking');

// Create collections
db.createCollection('bookings');
db.createCollection('counters');

// Create indexes
db.bookings.createIndex({ bookingId: 1 }, { unique: true });
db.bookings.createIndex({ passengerId: 1, createdAt: -1 });
db.bookings.createIndex({ driverId: 1, createdAt: -1 });
db.bookings.createIndex({ status: 1, createdAt: -1 });
db.bookings.createIndex({ 
  'pickupLocation.coordinates': '2dsphere',
  status: 1 
});
db.bookings.createIndex({ createdAt: 1 }, { expireAfterSeconds: 2592000 }); // 30 days TTL

// Insert sample data for testing
if (process.env.NODE_ENV === 'development') {
  db.bookings.insertMany([
    {
      bookingId: 'BKGDEV001',
      passengerId: 'PASS001',
      pickupLocation: {
        address: 'IUH University',
        coordinates: { lat: 10.850000, lng: 106.770000 }
      },
      destination: {
        address: 'District 1',
        coordinates: { lat: 10.776900, lng: 106.700900 }
      },
      vehicleType: 'STANDARD',
      status: 'COMPLETED',
      fare: {
        baseFare: 10000,
        distanceFare: 25000,
        timeFare: 5000,
        surgeMultiplier: 1.0,
        totalFare: 40000,
        currency: 'VND'
      },
      payment: {
        method: 'CASH',
        status: 'PAID'
      },
      requestedAt: new Date('2024-01-15T08:30:00Z'),
      completedAt: new Date('2024-01-15T09:00:00Z')
    },
    {
      bookingId: 'BKGDEV002',
      passengerId: 'PASS002',
      pickupLocation: {
        address: 'District 7',
        coordinates: { lat: 10.732000, lng: 106.722000 }
      },
      destination: {
        address: 'District 2',
        coordinates: { lat: 10.787000, lng: 106.750000 }
      },
      vehicleType: 'PREMIUM',
      status: 'IN_PROGRESS',
      driverId: 'DRIVER001',
      estimatedDistance: 12.5,
      estimatedDuration: 25,
      fare: {
        baseFare: 15000,
        distanceFare: 30000,
        timeFare: 7500,
        surgeMultiplier: 1.2,
        totalFare: 63000,
        currency: 'VND'
      },
      requestedAt: new Date(),
      assignedAt: new Date()
    }
  ]);
  
  print('MongoDB initialized with sample data');
}