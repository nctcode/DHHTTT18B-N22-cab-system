const axios = require('axios');

async function testMCPContext() {
  const url = 'http://localhost:3000/api/mcp/context';
  const payload = {
    rideId: 'test-ride-123',
    pickup: { lat: 10.762622, lng: 106.660172 }, // Somewhere in HCMC
    drop: { lat: 10.823099, lng: 106.629664 }    // Somewhere else in HCMC
  };

  console.log('🚀 Sending request to MCP Context endpoint...');
  try {
    const response = await axios.post(url, payload);
    console.log('✅ Success!');
    console.log(JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error('❌ Error calling MCP Context:');
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error(JSON.stringify(error.response.data, null, 2));
    } else {
      console.error(error.message);
    }
  }
}

testMCPContext();
