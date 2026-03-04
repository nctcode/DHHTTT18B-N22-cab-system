/**
 * Mock script to simulate demand/supply metrics being pushed to Redis
 * 
 * Usage: node scripts/simulate-metrics.js
 * 
 * This simulates ride requests and driver availability in different zones.
 */

const BASE_URL = process.env.PRICING_URL || 'http://localhost:3006';

async function simulateMetrics() {
  console.log('=== Simulating Demand/Supply Metrics ===');
  
  const zones = [
    { id: 'zone-district-1', name: 'District 1 (High demand)' },
    { id: 'zone-district-7', name: 'District 7 (Normal)' },
    { id: 'zone-airport', name: 'Airport (Peak)' }
  ];

  for (const zone of zones) {
    // Simulate high demand for District 1
    const demandCount = zone.id === 'zone-district-1' ? 15 : zone.id === 'zone-airport' ? 10 : 3;
    const supplyCount = zone.id === 'zone-district-1' ? 4 : zone.id === 'zone-airport' ? 3 : 5;

    console.log(`\nZone: ${zone.name}`);
    console.log(`  Pushing ${demandCount} demand events...`);
    
    for (let i = 0; i < demandCount; i++) {
      try {
        await fetch(`${BASE_URL}/pricing/metrics/demand`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ zoneId: zone.id })
        });
      } catch (e) { /* ignore */ }
    }

    console.log(`  Pushing ${supplyCount} supply events...`);
    for (let i = 0; i < supplyCount; i++) {
      try {
        await fetch(`${BASE_URL}/pricing/metrics/supply`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ zoneId: zone.id })
        });
      } catch (e) { /* ignore */ }
    }
  }

  console.log('\n=== Metrics Published! ===');
  console.log('Wait for the surge scheduler to pick them up (next cycle).');
  
  // Test estimate
  console.log('\n=== Testing Fare Estimate ===');
  try {
    const resp = await fetch(`${BASE_URL}/pricing/estimate?zoneId=zone-district-1&distance_km=5&duration_min=15&vehicle_type=CAR`);
    const data = await resp.json();
    console.log('Estimate response:', JSON.stringify(data, null, 2));
  } catch (e) {
    console.log('Estimate request failed:', e.message);
  }
}

simulateMetrics();
