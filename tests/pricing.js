const axios = require('axios');
const CONFIG = {
    // Calling the API Gateway
    BASE_URL: 'http://localhost:3000/api/pricing',
    // Alternatively, calling the service directly if Gateway is not up:
    // BASE_URL: 'http://localhost:3007/pricing',
};
async function testPricing(payload, description) {
    console.log(`\n--- Test: ${description} ---`);
    console.log('Input:', JSON.stringify(payload, null, 2));
    try {
        const response = await axios.post(`${CONFIG.BASE_URL}/estimate`, payload);
        console.log('Status:', response.status);
        console.log('Output:', JSON.stringify(response.data.data, null, 2));
        
        const surge = response.data.data.surgeMultiplier;
        const totalFare = response.data.data.totalFare;
        const source = response.data.data.surgeSource;
        console.log(`\nResult Analysis:`);
        console.log(`- Surge Multiplier: ${surge} (Source: ${source})`);
        console.log(`- Total Fare: ${totalFare} VND`);
        
        if (surge >= 1.0) console.log('✅ Principle: Surge >= 1.0 OK');
        else console.log('❌ Principle: Surge < 1.0 FAIL');
        if (totalFare > 0) console.log('✅ Principle: Price > 0 OK');
        else console.log('❌ Principle: Price <= 0 FAIL');
    } catch (error) {
        console.error('Error:', error.response ? error.response.data : error.message);
    }
}
async function runTests() {
    // 1. Requirement Case: demand_index = 0
    await testPricing({
        distance_km: 5,
        vehicle_type: 'ECONOMY',
        demand_index: 0,
        supply_index: 1
    }, 'Off-peak (Demand = 0)');
    // 2. High Surge Case: demand_index = 2, supply_index = 1
    await testPricing({
        distance_km: 5,
        vehicle_type: 'ECONOMY',
        demand_index: 2,
        supply_index: 1
    }, 'High Surge (Demand = 2, Supply = 1)');
    // 3. Safety Case: supply_index = 0 (Should not divide by zero)
    await testPricing({
        distance_km: 5,
        vehicle_type: 'ECONOMY',
        demand_index: 1,
        supply_index: 0
    }, 'Safety (Supply = 0)');
    // 4. Default Case: No indexes (Should use AI/Redis)
    await testPricing({
        distance_km: 5,
        vehicle_type: 'ECONOMY'
    }, 'Default (No indexes provided)');
}
runTests();