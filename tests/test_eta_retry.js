const axios = require('axios');
const { exec } = require('child_process');
const util = require('util');

const execPromise = util.promisify(exec);

// API endpoint để lấy ETA (Gọi trực tiếp vào Ride Service, bypass Gateway Auth)
const API_URL = 'http://localhost:3005/rides/eta';

// Dữ liệu mẫu (Pickup: Bến Thành, Dropoff: Sân bay Tân Sơn Nhất)
const payload = {
  pickup: { lat: 10.762622, lng: 106.660172 },
  destination: { lat: 10.816494, lng: 106.666965 },
  timeOfDay: 14,
  dayOfWeek: 2
};

const axiosConfig = { 
  timeout: 25000,
  headers: {
    'x-user-id': 'test-user',
    'x-user-role': 'PASSENGER'
  }
};


async function checkETA(scenario) {
  console.log(`\n⏳ Đang gửi request lấy ETA (${scenario})...`);
  const startTime = Date.now();
  try {
    const res = await axios.post(API_URL, payload, axiosConfig);
    const duration = Date.now() - startTime;
    console.log(`✅ Kết quả trả về sau ${duration}ms:`);
    console.log(`   Nguồn dữ liệu (Source): ${res.data.data.source}`);
    console.log(`   Thời gian di chuyển (Duration): ${res.data.data.predictedTripDurationMinutes} phút`);
    return duration;
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`❌ Lỗi sau ${duration}ms:`, error.message);
    return duration;
  }
}

async function runTestCase() {
  console.log('==================================================');
  console.log('🔄 TEST CASE: AGENT RETRY KHI AI-ETA SERVICE LỖI');
  console.log('==================================================');

  // 1. Chạy thử khi service hoạt động bình thường
  console.log('\n[Phase 1] Trạng thái bình thường (Service ĐANG CHẠY)');
  console.log('Đảm bảo service cab-booking-ai-eta đang chạy...');
  await execPromise('docker start cab-booking-ai-eta').catch(() => {});
  await new Promise(r => setTimeout(r, 2000)); // Đợi khởi động
  const durationNormal = await checkETA('Normal');

  // 2. Tắt service để mô phỏng lỗi
  console.log('\n[Phase 2] Mô phỏng lỗi service (Service BỊ TẮT)');
  console.log('Đang tắt service cab-booking-ai-eta (docker stop)...');
  await execPromise('docker stop cab-booking-ai-eta').catch(e => console.log('Không thể stop container (có thể tên container khác):', e.message));
  
  // Gọi API - Kỳ vọng sẽ thấy delay khoảng ~6 giây do 3 lần retry (1s + 2s + 3s = 6s) trước khi Fallback
  console.log('Đã tắt service. Gửi request ngay bây giờ (Agent sẽ tự động Retry)...');
  const durationRetry = await checkETA('Retry & Fallback');

  console.log('\n──────────────────────────────────────────────────');
  console.log('📊 KẾT LUẬN TEST CASE:');
  console.log(`- Thời gian xử lý bình thường: ~${durationNormal}ms`);
  console.log(`- Thời gian xử lý khi lỗi (có Retry): ~${durationRetry}ms`);
  
  if (durationRetry > durationNormal + 3000) {
    console.log('\n🎉 TEST CASE PASSED!');
    console.log('   Hệ thống ĐÃ THỰC HIỆN RETRY (nhận biết qua thời gian delay) trước khi dùng Fallback.');
    console.log('   Agent không "fail ngay" mà đã cố gắng gọi lại service.');
  } else {
    console.log('\n❌ TEST CASE FAILED!');
    console.log('   Thời gian phản hồi quá nhanh, Agent có thể chưa thực hiện retry hoặc fallback xảy ra ngay lập tức.');
  }
  console.log('──────────────────────────────────────────────────');

  // Khôi phục lại trạng thái
  console.log('\nĐang khởi động lại service cab-booking-ai-eta...');
  await execPromise('docker start cab-booking-ai-eta').catch(() => {});
  console.log('Hoàn tất.');
}

runTestCase();
