const axios = require('axios');

const API_BASE = 'http://localhost:3001/api/auth';

async function testAuth() {
  try {
    console.log('=== Testing CAB Booking Auth Service ===\n');

    // 1. Test health
    console.log('1. Testing health endpoint...');
    const health = await axios.get('http://localhost:3001/health');
    console.log('Health:', health.data);
    
    // 2. Register
    console.log('\n2. Registering user...');
    const registerData = {
      email: "thuan29032004@gmail.com",
      password: "Password123",
      firstName: "Nguyen",
      lastName: "Thuan",
      phone: "0706417103",
      role: "CUSTOMER"
    };
    
    const registerRes = await axios.post(`${API_BASE}/register`, registerData);
    console.log('Register response:', JSON.stringify(registerRes.data, null, 2));
    
    const { accessToken, refreshToken } = registerRes.data.data.tokens;
    
    // 3. Get profile
    console.log('\n3. Getting profile...');
    const profileRes = await axios.get(`${API_BASE}/profile`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    console.log('Profile:', JSON.stringify(profileRes.data, null, 2));
    
    // 4. Refresh token
    console.log('\n4. Refreshing token...');
    const refreshRes = await axios.post(`${API_BASE}/refresh-token`, {
      refreshToken
    });
    console.log('New access token:', refreshRes.data.data.accessToken);
    
    // 5. Logout
    console.log('\n5. Logging out...');
    const logoutRes = await axios.post(`${API_BASE}/logout`, {
      refreshToken
    }, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    console.log('Logout:', logoutRes.data);
    
    console.log('\n✅ All tests passed!');
    
  } catch (error) {
    console.error('\n❌ Test failed:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else {
      console.error('Error:', error.message);
    }
  }
}

testAuth();