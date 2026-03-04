// Seed Data for User Service
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seed() {
  try {
    console.log('🌱 Seeding User Service database...');

    // Create sample users
    console.log('👥 Creating sample users...');
    
    const passenger1 = await prisma.user.upsert({
      where: { id: 'user_passenger_001' },
      update: {},
      create: {
        id: 'user_passenger_001',
        fullName: 'Nguyễn Văn A',
        phone: '0901234567',
        email: 'nguyenvana@example.com',
        role: 'PASSENGER',
        avatarUrl: null,
        ratingAvg: 4.8,
        ratingCount: 25
      }
    });

    const passenger2 = await prisma.user.upsert({
      where: { id: 'user_passenger_002' },
      update: {},
      create: {
        id: 'user_passenger_002',
        fullName: 'Trần Thị B',
        phone: '0907654321',
        email: 'tranthib@example.com',
        role: 'PASSENGER',
        avatarUrl: null,
        ratingAvg: 4.9,
        ratingCount: 45
      }
    });

    const driver1 = await prisma.user.upsert({
      where: { id: 'user_driver_001' },
      update: {},
      create: {
        id: 'user_driver_001',
        fullName: 'Lê Văn C',
        phone: '0912345678',
        email: 'levanc@example.com',
        role: 'DRIVER',
        avatarUrl: null,
        ratingAvg: 4.7,
        ratingCount: 120
      }
    });

    const admin1 = await prisma.user.upsert({
      where: { id: 'user_admin_001' },
      update: {},
      create: {
        id: 'user_admin_001',
        fullName: 'Admin System',
        phone: '0900000000',
        email: 'admin@cabsystem.com',
        role: 'ADMIN',
        avatarUrl: null,
        ratingAvg: 5.0,
        ratingCount: 0
      }
    });

    console.log('📍 Creating sample addresses...');
    
    await prisma.userAddress.createMany({
      data: [
        {
          userId: passenger1.id,
          label: 'Nhà',
          address: '123 Nguyễn Huệ, Quận 1, TP.HCM',
          lat: 10.7769,
          lng: 106.7009,
          isDefault: true
        },
        {
          userId: passenger1.id,
          label: 'Công ty',
          address: '456 Lê Lợi, Quận 1, TP.HCM',
          lat: 10.7756,
          lng: 106.7019,
          isDefault: false
        },
        {
          userId: passenger2.id,
          label: 'Nhà',
          address: '789 Võ Văn Tần, Quận 3, TP.HCM',
          lat: 10.7823,
          lng: 106.6917,
          isDefault: true
        }
      ],
      skipDuplicates: true
    });

    console.log('✅ User Service seeding complete!');
    console.log(`   - ${4} users created (2 passengers, 1 driver, 1 admin)`);
    console.log(`   - ${3} addresses created`);

  } catch (error) {
    console.error('❌ Seeding error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

seed().catch(err => {
  console.error(err);
  process.exit(1);
});
