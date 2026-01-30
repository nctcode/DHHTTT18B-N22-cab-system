// scripts/health-check.js
const axios = require('axios');
const { checkRedisHealth } = require('../src/config/redis');

async function healthCheck() {
  console.log('🚗 CAB Booking Service Health Check\n');
  
  const checks = [];
  
  // Check Booking Service
  try {
    const response = await axios.get('http://localhost:3002/health', { timeout: 5000 });
    checks.push({
      service: 'Booking Service',
      status: response.data.status === 'healthy' ? '✅ HEALTHY' : '❌ UNHEALTHY',
      details: response.data
    });
  } catch (error) {
    checks.push({
      service: 'Booking Service',
      status: '❌ UNREACHABLE',
      details: error.message
    });
  }
  
  // Check MongoDB (via service)
  try {
    const response = await axios.get('http://localhost:3002/health', { timeout: 5000 });
    checks.push({
      service: 'MongoDB',
      status: response.data.database === 'connected' ? '✅ CONNECTED' : '❌ DISCONNECTED',
      details: response.data
    });
  } catch (error) {
    checks.push({
      service: 'MongoDB',
      status: '❌ UNREACHABLE',
      details: error.message
    });
  }
  
  // Check Redis
  try {
    const redisHealth = await checkRedisHealth();
    checks.push({
      service: 'Redis',
      status: redisHealth.status === 'connected' ? '✅ CONNECTED' : '❌ DISCONNECTED',
      details: redisHealth
    });
  } catch (error) {
    checks.push({
      service: 'Redis',
      status: '❌ ERROR',
      details: error.message
    });
  }
  
  // Check RabbitMQ Management
  try {
    const response = await axios.get('http://localhost:15672/api/overview', {
      auth: { username: 'guest', password: 'guest' },
      timeout: 5000
    });
    checks.push({
      service: 'RabbitMQ',
      status: '✅ RUNNING',
      details: {
        version: response.data.rabbitmq_version,
        queues: response.data.queue_totals.queues
      }
    });
  } catch (error) {
    checks.push({
      service: 'RabbitMQ',
      status: '❌ UNREACHABLE',
      details: error.message
    });
  }
  
  // Display results
  console.log('='.repeat(60));
  checks.forEach(check => {
    console.log(`${check.service.padEnd(20)} ${check.status}`);
    if (check.details && Object.keys(check.details).length > 0) {
      console.log('  Details:', JSON.stringify(check.details, null, 2).split('\n').slice(0, 3).join('\n'));
    }
  });
  console.log('='.repeat(60));
  
  // Summary
  const healthyCount = checks.filter(c => c.status.includes('✅')).length;
  const totalCount = checks.length;
  
  console.log(`\n📊 Summary: ${healthyCount}/${totalCount} services healthy`);
  
  if (healthyCount === totalCount) {
    console.log('🎉 All systems are operational!');
    process.exit(0);
  } else {
    console.log('⚠️  Some services are having issues');
    process.exit(1);
  }
}

// Run health check
healthCheck().catch(error => {
  console.error('Health check failed:', error);
  process.exit(1);
});