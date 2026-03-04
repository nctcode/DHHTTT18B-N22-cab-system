const eventBus = require('./events/eventBus');
const { EVENTS } = require('./events/eventContracts');

// Usage: node src/test-saga.js

async function testSaga() {
  console.log('=== STARTING SAGA TEST ===');
  
  // 1. Simulate RideFinished
  const ridePayload = {
    rideId: `ride_${Date.now()}`,
    passengerId: `passenger_${Date.now()}`,
    driverId: `driver_${Date.now()}`,
    amount: 100000,
    method: 'MOMO'
  };
  
  console.log('Testing Step 1: RideFinished');
  eventBus.publish(EVENTS.RIDE_FINISHED, ridePayload);

  // Wait for Charge Processing
  setTimeout(() => {
    // 2. Simulate Wallet Credited (External System Response)
    // We assume the payment ID is generated sequentially or we catch it from logs.
    // For test simplicity, we mock generic wallet response or assume Saga internals work.
    // But since eventBus is shared instance in process, we can listen!
    
    // We can't easily listen here because the script will exit.
    // Ideally this is run inside the server or a test runner.
    // For manual dispatch check:
    console.log('Test dispatch sent. Check server logs for Saga progress.');
  }, 2000);
}

// To verify Wallet/Compensation, we can publish Wallet events manually too.

module.exports = { testSaga };
