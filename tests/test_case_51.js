const { Client } = require('pg');
const axios = require('axios');

// ==== CẤU HÌNH ====
// Database kết nối từ bên ngoài localhost (cổng 5433 được map trong docker-compose cho postgres-driver)
const DB_URL = 'postgresql://postgres:Thuan2903@localhost:5433/driver_db';
const GATEWAY_URL = 'http://localhost:3000';

// Tọa độ điểm đón của Hành Khách
const PASSENGER_LAT = 10.8221109;
const PASSENGER_LNG = 106.6867795;

// Hàm hỗ trợ tính toán vĩ độ dựa trên khoảng cách (1 độ Vĩ = ~111 km)
// Nên: 1 km = 1 / 111 = 0.009009 độ
const kmToDegrees = (km) => km / 111;

async function runTestCase51() {
  console.log('==================================================');
  console.log('🚕 TEST CASE 51: CHỌN DRIVER GẦN NHẤT (AI MATCHING)');
  console.log('==================================================\n');

  const client = new Client({ connectionString: DB_URL });
  
  try {
    await client.connect();
    
    // 1. Lấy 3 tài xế ngẫu nhiên trong DB (yêu cầu bạn đã tạo ít nhất 3 tài xế)
    const res = await client.query('SELECT id, user_id, vehicle_plate FROM drivers LIMIT 3');
    const drivers = res.rows;

    if (drivers.length < 3) {
      console.error('❌ Lỗi: Cần ít nhất 3 tài khoản Driver trong hệ thống để chạy test này.');
      console.error(`   Hiện tại chỉ có ${drivers.length} tài xế trong bảng 'driver'.`);
      return;
    }

    const [d1, d2, d3] = drivers;

    console.log('📍 Thiết lập tọa độ giả lập cho 3 tài xế:');
    
    // D1: Cách 5km
    const d1_lat = PASSENGER_LAT + kmToDegrees(5);
    await client.query(`UPDATE drivers SET current_lat = $1, current_lng = $2, is_available = true, updated_at = NOW() WHERE id = $3`, [d1_lat, PASSENGER_LNG, d1.id]);
    console.log(`   - Driver 1 (${d1.vehicle_plate}): Cách 5km (Lat: ${d1_lat})`);

    // D2: Cách 2km (Gần nhất)
    const d2_lat = PASSENGER_LAT + kmToDegrees(2);
    await client.query(`UPDATE drivers SET current_lat = $1, current_lng = $2, is_available = true, updated_at = NOW() WHERE id = $3`, [d2_lat, PASSENGER_LNG, d2.id]);
    console.log(`   - Driver 2 (${d2.vehicle_plate}): Cách 2km (Lat: ${d2_lat}) -> KỲ VỌNG ĐƯỢC CHỌN`);

    // D3: Cách 3km
    const d3_lat = PASSENGER_LAT + kmToDegrees(3);
    await client.query(`UPDATE drivers SET current_lat = $1, current_lng = $2, is_available = true, updated_at = NOW() WHERE id = $3`, [d3_lat, PASSENGER_LNG, d3.id]);
    console.log(`   - Driver 3 (${d3.vehicle_plate}): Cách 3km (Lat: ${d3_lat})`);

    console.log('\n⏳ Gửi request tìm tài xế qua API AI Matching...');

    // 2. Gọi API AI Recommendation từ Gateway
    const response = await axios.post(`${GATEWAY_URL}/api/ai/recommend/top-drivers`, {
      pickup: { lat: PASSENGER_LAT, lng: PASSENGER_LNG },
      top_n: 3,
      radius_km: 10
    });

    const recommendedDrivers = response.data.data;

    console.log('\n✅ KẾT QUẢ TỪ AI MATCHING:');
    if (!recommendedDrivers || recommendedDrivers.length === 0) {
      console.log('   Không tìm thấy tài xế nào.');
    } else {
      recommendedDrivers.forEach((driver, index) => {
        const isTop = index === 0;
        const isExpected = (isTop && driver.driverId === d2.id);
        console.log(`   #${index + 1}: driverId=${driver.driverId} | Plate=${driver.vehicle_plate} | Cách ${driver.distance_km?.toFixed(2)} km${isExpected ? '  <-- CHỌN ĐÚNG D2 (GẦN NHẤT) 🎯' : ''}`);
      });

      const topDriverId = recommendedDrivers[0].driverId;

      console.log('\n──────────────────────────────────────────────────');
      if (topDriverId === d2.id) {
        console.log('🎉 KẾT LUẬN: TEST CASE 51 ✅ PASSED!');
        console.log('   Agent chọn D2 (2km) - Gần nhất, không chọn ngẫu nhiên.');
      } else {
        const chosen = recommendedDrivers[0];
        console.log(`❌ KẾT LUẬN: TEST CASE FAILED!`);
        console.log(`   Agent chọn ${chosen.vehicle_plate} (${chosen.distance_km?.toFixed(2)}km) thay vì D2 (${d2.vehicle_plate}, 2km).`);
      }
      console.log('──────────────────────────────────────────────────');
    }

  } catch (error) {
    console.error('\n❌ Lỗi khi chạy test:', error.message);
  } finally {
    await client.end();
  }
}

runTestCase51();
