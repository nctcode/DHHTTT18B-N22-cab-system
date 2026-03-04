const io = require('socket.io-client');
const axios = require('axios');

// CONFIG
const API_URL = 'http://localhost:3000'; // Gateway URL
const AUTH_URL = 'http://localhost:3001'; // Auth Service URL (assuming port 3001 based on typical microservices)
// NOTE: Verify Auth Service Port from docker-compose if needed. Usually Gateway handles auth routes too.
// Let's assume Gateway proxies /api/auth to Auth Service.
const GATEWAY_AUTH_URL = 'http://localhost:3000/api/auth'; 

const DRIVER_EMAIL = 'taixe1@gmail.com'; 
const DRIVER_PASSWORD = '123456'; 

// RIDE ID to simulate joining
const RIDE_ID = process.argv[2]; 

if (!RIDE_ID) {
    console.error('Please provide a RIDE_ID as an argument.');
    console.log('Usage: node simulateDriver.js <rideId>');
    process.exit(1);
}

// SIMULATION PATH (Hanoi example)
const PATH = [
    { lat: 21.028511, lng: 105.854444 }, // Hoan Kiem Lake
    { lat: 21.029000, lng: 105.855000 },
    { lat: 21.030000, lng: 105.856000 },
    { lat: 21.031000, lng: 105.857000 },
    { lat: 21.032000, lng: 105.858000 },
];

async function start() {
    try {
        // 1. Login to get Token
        console.log('🔑 Logging in as driver...');
        
        // Attempt login via Gateway (standard route)
        // If this fails, user might need to check running services or port mapping.
        console.log(`POST ${GATEWAY_AUTH_URL}/login`);
        
        const loginRes = await axios.post(`${GATEWAY_AUTH_URL}/login`, {
            email: 'taixe1@gmail.com',
            password: '123456',
            role: 'DRIVER' 
        });

        const token = loginRes.data.accessToken || loginRes.data.token;
        // Check token and log User ID
        if (!token) throw new Error('No token returned from login');
        
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            console.log('✅ Logged in! User ID:', payload.id || payload.userId);
        } catch (e) {
            console.log('✅ Logged in! (Could not decode ID)');
        }
        console.log('Token snippet:', token.substring(0, 20) + '...');

        // 2. Connect to Socket
        const socket = io(API_URL, {
            auth: { token }
        });

        socket.on('connect', () => {
            console.log('✅ Socket Connected:', socket.id);
            
            // 3. Join Ride Room (simulate driver app logic)
            socket.emit('join:ride', RIDE_ID);
            console.log(`📡 Joined ride room: ${RIDE_ID}`);

            // 4. Start Emitting Locations
            let step = 0;
            setInterval(() => {
                if (step >= PATH.length) {
                    step = 0; // Loop or stop
                    // console.log('End of path, restarting...');
                }

                const loc = PATH[step];
                const event = {
                    lat: loc.lat,
                    lng: loc.lng,
                    bearing: 0,
                    speed: 30,
                    rideId: RIDE_ID
                };

                // Emit event
                socket.emit('driver.location', event);
                console.log(`📍 Sent location: [${loc.lat}, ${loc.lng}]`);

                step++;
            }, 3000); // Every 3 seconds
        });

        socket.on('disconnect', () => {
            console.log('❌ Disconnected');
        });

        socket.on('connect_error', (err) => {
            console.error('Socket Error:', err.message);
        });

    } catch (error) {
        console.error('❌ Error:', error?.response?.data || error.message);
    }
}

start();
