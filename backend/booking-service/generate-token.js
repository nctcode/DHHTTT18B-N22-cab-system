// generate-token.js
const jwt = require('jsonwebtoken');

// Token cho passenger
const passengerToken = jwt.sign(
  {
    userId: 'PASS001',
    userType: 'passenger',
    role: 'user',
    permissions: ['booking:create', 'booking:view']
  },
  '123', // JWT_SECRET từ .env
  { expiresIn: '24h' }
);

// Token cho driver
const driverToken = jwt.sign(
  {
    userId: 'DRIVER001',
    userType: 'driver',
    role: 'user',
    permissions: ['booking:accept', 'booking:view']
  },
  '123',
  { expiresIn: '24h' }
);

console.log('=== TEST TOKENS ===');
console.log('\n🔑 PASSENGER TOKEN:');
console.log(passengerToken);
console.log('\n🚗 DRIVER TOKEN:');
console.log(driverToken);
console.log('\n📋 How to use:');
console.log('curl -H "Authorization: Bearer TOKEN_HERE" http://localhost:3002/api/...');