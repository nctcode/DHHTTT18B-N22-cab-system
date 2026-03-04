// src/server.js
require('dotenv').config();
const app = require('./app');
const { connectRedis } = require('./config/redis');
const SurgeScheduler = require('./scheduler/surgeScheduler');
const eventBus = require('./events/eventBus');
const { EVENTS } = require('./events/eventContracts');
const { PrismaClient } = require('@prisma/client');

const PORT = process.env.PORT || 3006;
const prisma = new PrismaClient();

// ─── Auto-seed if tables are empty ───
async function autoSeed() {
  try {
    const ruleCount = await prisma.pricingRule.count();
    const zoneCount = await prisma.surgeZone.count();

    if (ruleCount === 0 || zoneCount === 0) {
      console.log('🌱 Empty database detected — auto-seeding...');

      if (ruleCount === 0) {
        const rules = [
          { id: 'rule-ECONOMY', vehicle_type: 'ECONOMY', base_fare: 12000, price_per_km: 4500,  price_per_min: 300 },
          { id: 'rule-PREMIUM', vehicle_type: 'PREMIUM', base_fare: 20000, price_per_km: 7000,  price_per_min: 500 },
          { id: 'rule-SUV',     vehicle_type: 'SUV',     base_fare: 25000, price_per_km: 8500,  price_per_min: 600 },
          { id: 'rule-BIKE',    vehicle_type: 'BIKE',    base_fare: 8000,  price_per_km: 3000,  price_per_min: 200 },
          { id: 'rule-CAR',     vehicle_type: 'CAR',     base_fare: 15000, price_per_km: 5500,  price_per_min: 400 },
        ];
        await prisma.pricingRule.createMany({ data: rules });
        console.log(`   ✅ ${rules.length} pricing rules created`);
      }

      if (zoneCount === 0) {
        const zones = [
          { id: 'zone-tansonnhat', area_name: 'Sân bay Tân Sơn Nhất',  multiplier: 1.5, active: true },
          { id: 'zone-district1',  area_name: 'Quận 1 - Trung tâm',    multiplier: 1.3, active: true },
          { id: 'zone-benthanh',   area_name: 'Chợ Bến Thành',         multiplier: 1.4, active: true },
          { id: 'zone-thuduc',     area_name: 'TP Thủ Đức - Khu CNC',  multiplier: 1.2, active: true },
          { id: 'zone-district7',  area_name: 'Quận 7 - Phú Mỹ Hưng',  multiplier: 1.2, active: true },
          { id: 'zone-binhtan',    area_name: 'Quận Bình Tân',         multiplier: 1.1, active: true },
          { id: 'zone-govap',      area_name: 'Quận Gò Vấp',          multiplier: 1.1, active: true },
          { id: 'zone-district3',  area_name: 'Quận 3 - Trung tâm',    multiplier: 1.3, active: true },
        ];
        await prisma.surgeZone.createMany({ data: zones });
        console.log(`   ✅ ${zones.length} surge zones created`);
      }

      console.log('🎉 Auto-seed complete!');
    } else {
      console.log(`📊 Database has ${ruleCount} rules, ${zoneCount} zones — skipping seed`);
    }
  } catch (err) {
    console.warn('⚠️ Auto-seed failed (non-critical):', err.message);
  }
}

// ─── Event Subscribers (Mock consumers) ───

// Mock Ride Service subscriber
eventBus.subscribe(EVENTS.SURGE_PRICE_UPDATED, (payload) => {
  console.log(`[Mock RideService] Received SurgePriceUpdated: zone=${payload.zoneId}, multiplier=${payload.multiplier}x, v${payload.version}`);
});

// Mock Dashboard subscriber
eventBus.subscribe(EVENTS.SURGE_PRICE_UPDATED, (payload) => {
  console.log(`[Mock Dashboard] Surge update for "${payload.areaName}": ${payload.multiplier}x`);
});

const startServer = async () => {
  try {
    // Start HTTP server first
    const server = app.listen(PORT, () => {
      console.log(`🚕 Pricing Service running on port ${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/health`);
    });

    // Auto-seed database
    await autoSeed();

    // Connect Redis in background
    if (process.env.REDIS_ENABLED !== 'false') {
      setTimeout(async () => {
        try {
          const redisClient = await connectRedis();
          if (redisClient) {
            console.log('✅ Redis connected - starting surge scheduler');
            // Start surge scheduler (every 2 minutes)
            const scheduler = new SurgeScheduler(
              parseInt(process.env.SURGE_INTERVAL_MS) || 120000
            );
            scheduler.start();
          } else {
            console.log('🧠 Running with in-memory fallback (Redis unavailable)');
          }
        } catch (error) {
          console.log('🧠 Running with in-memory fallback due to Redis connection failure');
        }
      }, 1000);
    } else {
      console.log('🧠 Redis disabled, surge scheduler using in-memory fallback');
      const scheduler = new SurgeScheduler(
        parseInt(process.env.SURGE_INTERVAL_MS) || 120000
      );
      scheduler.start();
    }

    // Graceful shutdown
    process.on('SIGTERM', () => {
      console.log('SIGTERM received: closing HTTP server');
      server.close(() => {
        prisma.$disconnect();
        console.log('HTTP server closed');
        process.exit(0);
      });
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();