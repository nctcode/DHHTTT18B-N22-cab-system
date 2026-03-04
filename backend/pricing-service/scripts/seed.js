/**
 * Seed script for Pricing Service
 * Populates pricing_rules and surge_zones with real HCM City data.
 *
 * Uses Prisma-compatible column names:
 *   pricing_rules: id, vehicle_type, base_fare, price_per_km, price_per_min
 *   surge_zones:   id, area_name, multiplier, active
 *
 * Run: node scripts/seed.js
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seed() {
  console.log('🌱 Seeding Pricing Service database...');

  // ── 1. Pricing Rules (matching frontend vehicle types) ──
  const rules = [
    { vehicle_type: 'ECONOMY',  base_fare: 12000, price_per_km: 4500,  price_per_min: 300 },
    { vehicle_type: 'PREMIUM',  base_fare: 20000, price_per_km: 7000,  price_per_min: 500 },
    { vehicle_type: 'SUV',      base_fare: 25000, price_per_km: 8500,  price_per_min: 600 },
    { vehicle_type: 'BIKE',     base_fare: 8000,  price_per_km: 3000,  price_per_min: 200 },
    { vehicle_type: 'CAR',      base_fare: 15000, price_per_km: 5500,  price_per_min: 400 },
  ];

  for (const rule of rules) {
    await prisma.pricingRule.upsert({
      where: { id: `rule-${rule.vehicle_type}` },
      create: { id: `rule-${rule.vehicle_type}`, ...rule },
      update: rule,
    });
  }
  console.log(`   ✅ ${rules.length} pricing rules upserted`);

  // ── 2. Surge Zones (real HCM City areas) ──
  const zones = [
    { id: 'zone-tansonnhat',   area_name: 'Sân bay Tân Sơn Nhất',       multiplier: 1.5, active: true },
    { id: 'zone-district1',    area_name: 'Quận 1 - Trung tâm',         multiplier: 1.3, active: true },
    { id: 'zone-benthanh',     area_name: 'Chợ Bến Thành',              multiplier: 1.4, active: true },
    { id: 'zone-thuduc',       area_name: 'TP Thủ Đức - Khu CNC',       multiplier: 1.2, active: true },
    { id: 'zone-district7',    area_name: 'Quận 7 - Phú Mỹ Hưng',      multiplier: 1.2, active: true },
    { id: 'zone-binhtan',      area_name: 'Quận Bình Tân',              multiplier: 1.1, active: true },
    { id: 'zone-govap',        area_name: 'Quận Gò Vấp',               multiplier: 1.1, active: true },
    { id: 'zone-district3',    area_name: 'Quận 3 - Trung tâm',        multiplier: 1.3, active: true },
  ];

  for (const zone of zones) {
    await prisma.surgeZone.upsert({
      where: { id: zone.id },
      create: zone,
      update: { area_name: zone.area_name, multiplier: zone.multiplier, active: zone.active },
    });
  }
  console.log(`   ✅ ${zones.length} surge zones upserted`);

  const ruleCount = await prisma.pricingRule.count();
  const zoneCount = await prisma.surgeZone.count({ where: { active: true } });
  console.log(`\n📊 Final state: ${ruleCount} pricing rules, ${zoneCount} active surge zones`);
  console.log('🎉 Seeding complete!');
}

seed()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
