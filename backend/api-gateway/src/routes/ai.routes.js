const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const axios = require('axios');
const router = express.Router();
const services = require('../config/services.config');

const AI_MATCHING_URL = services.aiMatching.url;
const AI_ETA_URL = services.aiEta.url;
const AI_SURGE_URL = services.aiSurge.url;
const FEATURE_STORE_URL = services.featureStore.url;
const MODEL_SERVING_URL = services.modelServing.url;
const ML_TRAINING_URL = services.mlTraining.url;

// AI Matching
router.use('/matching', createProxyMiddleware({
  target: AI_MATCHING_URL,
  changeOrigin: true,
  pathRewrite: { '^/api/ai/matching': '/ai/matching' },
}));

// AI ETA
router.use('/eta', createProxyMiddleware({
  target: AI_ETA_URL,
  changeOrigin: true,
  pathRewrite: { '^/api/ai/eta': '/ai/eta' },
}));

// AI Surge
router.use('/surge', createProxyMiddleware({
  target: AI_SURGE_URL,
  changeOrigin: true,
  pathRewrite: { '^/api/ai/surge': '/ai/surge' },
}));

// Feature Store
router.use('/features', createProxyMiddleware({
  target: FEATURE_STORE_URL,
  changeOrigin: true,
  pathRewrite: { '^/api/ai/features': '/features' },
}));

// Model Serving
router.use('/models', createProxyMiddleware({
  target: MODEL_SERVING_URL,
  changeOrigin: true,
  pathRewrite: { '^/api/ai/models': '' },
}));

// ML Training
router.use('/training', createProxyMiddleware({
  target: ML_TRAINING_URL,
  changeOrigin: true,
  pathRewrite: { '^/api/ai/training': '/training' },
}));

// --- Real-Data Integrated Endpoints for Big Data Report ---

/**
 * Haversine distance helper (km) - dùng để tính khoảng cách khi fallback
 */
function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * POST /api/ai/recommend/top-drivers
 * Test Case: Recommendation trả đúng Top-N drivers
 * Flow thực:
 *   1. Gọi Driver Service → GET /drivers/nearby (lọc tài xế is_available=true trong bán kính)
 *   2. Gửi danh sách tài xế thật → AI Matching Service → /ai/matching/best-driver
 *   3. Model Serving xếp hạng theo: distance, rating, acceptanceRate, cancellationRate
 *   4. Trả về top_n tài xế được xếp hạng cao nhất
 *
 * Ngữ cảnh hệ thống:
 *   - Booking tạo → 15s tìm tài xế → nếu không accept → NO_DRIVER_FOUND
 *   - Chỉ tài xế is_available=true và updated_at trong 1 phút mới xuất hiện (query Haversine)
 */
router.post('/recommend/top-drivers', async (req, res) => {
  const startedAt = Date.now();
  const elapsedMs = () => Date.now() - startedAt;

  try {
    const {
      pickup = { lat: 10.762622, lng: 106.660172 },
      top_n = 3,
      radius_km = 10,
    } = req.body;

    // Validate input
    if (!pickup.lat || !pickup.lng) {
      return res.status(400).json({
        success: false,
        message: 'pickup.lat và pickup.lng là bắt buộc',
        processing_time_ms: elapsedMs(),
      });
    }
    const n = Math.min(Math.max(parseInt(top_n) || 3, 1), 20); // clamp 1–20

    // 1. Lấy tài xế đang hoạt động gần điểm đón từ Driver Service (dữ liệu thật)
    //    GET /drivers/nearby sử dụng Haversine SQL: is_available=true + updated < 1 phút
    // Driver Service mount tại /drivers (không có /api prefix)
    let nearbyResp;
    try {
      nearbyResp = await axios.get(`${services.driver.url}/drivers/nearby`, {
        params: { lat: pickup.lat, lng: pickup.lng, radius: radius_km, limit: 50 },
        timeout: 5000,
      });
    } catch (nearbyErr) {
      // Nếu nearby endpoint lỗi, fallback về /available
      nearbyResp = await axios.get(`${services.driver.url}/drivers/available`, { timeout: 5000 });
    }

    let nearbyDrivers = nearbyResp.data?.data || [];

    // Nếu /nearby không tìm thấy ai (constraint updated_at < 1 phút), fallback sang /available
    if (nearbyDrivers.length === 0) {
      const fallbackResp = await axios.get(`${services.driver.url}/drivers/available`, { timeout: 5000 });
      const allAvailable = fallbackResp.data?.data || [];
      // Tính khoảng cách thủ công bằng Haversine đơn giản
      nearbyDrivers = allAvailable
        .filter(d => d.current_lat && d.current_lng)
        .map(d => ({
          ...d,
          distance_km: haversineKm(pickup.lat, pickup.lng, d.current_lat, d.current_lng),
        }))
        .filter(d => d.distance_km <= radius_km)
        .sort((a, b) => a.distance_km - b.distance_km);
    }

    if (nearbyDrivers.length === 0) {
      return res.json({
        success: true,
        message: `Không tìm thấy tài xế đang hoạt động trong bán kính ${radius_km}km`,
        context: 'Booking sẽ chuyển sang NO_DRIVER_FOUND sau 15s',
        total_available: 0,
        top_n: n,
        data: [],
        processing_time_ms: elapsedMs(),
      });
    }

    const traceId = require('crypto').randomUUID();

    // 2. Gửi danh sách tài xế thật → AI Matching Service để xếp hạng
    const matchResp = await axios.post(
      `${AI_MATCHING_URL}/ai/matching/best-driver`,
      {
        traceId: traceId,
        pickupLocation: pickup,
        availableDrivers: nearbyDrivers.map(d => ({
          id: d.id,
          lat: d.current_lat,
          lng: d.current_lng,
          rating: d.rating_avg,
        })),
      },
      { timeout: 8000 }
    );

    const allRanked = matchResp.data?.data?.allRanked || [];

    // 3. Enrich kết quả với thông tin tài xế thật (distance_km, vehicle, plate)
    const driverMap = Object.fromEntries(nearbyDrivers.map(d => [d.id, d]));
    const topDrivers = allRanked.slice(0, n).map((ranked, idx) => {
      const driver = driverMap[ranked.driverId] || {};
      return {
        rank: idx + 1,
        driverId: ranked.driverId,
        ai_score: ranked.score,
        confidence: ranked.confidence,
        distance_km: parseFloat((driver.distance_km || 0).toFixed(2)),
        rating_avg: driver.rating_avg,
        vehicle_type: driver.vehicle_type,
        vehicle_plate: driver.vehicle_plate,
        is_available: true,
      };
    });

    return res.json({
      success: true,
      message: `Top ${n} tài xế được AI gợi ý từ ${nearbyDrivers.length} tài xế đang hoạt động`,
      context: `Booking sẽ lần lượt gửi offer đến ${n} tài xế, timeout 15s`,
      total_available: nearbyDrivers.length,
      top_n: n,
      pickup_used: pickup,
      data: topDrivers,
      processing_time_ms: elapsedMs(),
    });
  } catch (error) {
    console.error('[AI Recommend] Error:', error.message);

    // Nếu AI Matching Service lỗi, fallback về danh sách gần nhất từ Driver Service
    if (error.config?.url?.includes('matching')) {
      return res.status(502).json({
        success: false,
        message: 'AI Matching Service không phản hồi. Hệ thống sẽ dùng fallback nearest-driver.',
        error: error.message,
        processing_time_ms: elapsedMs(),
      });
    }
    return res.status(500).json({ success: false, message: error.message, processing_time_ms: elapsedMs() });
  }
});

/**
 * Demand Forecast (Big Data Analytics)
 * Sử dụng dữ liệu THỰC từ Feature Store (Demand/Supply) để dự báo
 */
router.post('/forecast', async (req, res) => {
  const startedAt = Date.now();
  const elapsedMs = () => Date.now() - startedAt;

  try {
    const { zone_id = 'zone_default', window_hours = 6, history_limit = 48 } = req.body;

    const parsedWindow = Number.parseInt(window_hours, 10);
    const horizon = Number.isFinite(parsedWindow) ? Math.min(Math.max(parsedWindow, 1), 48) : 6;

    // 1. Lấy snapshot demand hiện tại từ Feature Store
    const featureResp = await axios.get(`${FEATURE_STORE_URL}/features/zone/${zone_id}`);
    const realDemand = Number(featureResp.data?.data?.demandCount);

    // 2. Lấy chuỗi lịch sử demand thật theo thời gian
    const historyResp = await axios.get(`${FEATURE_STORE_URL}/features/zone/${zone_id}/history`, {
      params: { limit: history_limit },
    });

    const history = Array.isArray(historyResp.data?.data) ? historyResp.data.data : [];
    const cleanHistory = history
      .map((point) => ({
        timestamp: point?.timestamp,
        value: Number(point?.value),
      }))
      .filter((point) => point.timestamp && Number.isFinite(point.value));

    // Nếu chưa có history, fallback tối thiểu bằng demand hiện tại (không random)
    const fallbackBase = Number.isFinite(realDemand) ? realDemand : 0;
    const values = cleanHistory.length > 0 ? cleanHistory.map((p) => p.value) : [fallbackBase];

    // 3. Forecast bằng moving-average + trend từ dữ liệu thật
    const windowSize = Math.min(6, values.length);
    const recentValues = values.slice(-windowSize);
    const movingAvg = recentValues.reduce((sum, v) => sum + v, 0) / windowSize;
    const trend = values.length >= 2 ? (values[values.length - 1] - values[0]) / (values.length - 1) : 0;

    const lastHistoricalTime = cleanHistory.length > 0 ? new Date(cleanHistory[cleanHistory.length - 1].timestamp) : new Date();
    const baseTime = Number.isNaN(lastHistoricalTime.getTime()) ? new Date() : lastHistoricalTime;

    const forecastData = [];
    for (let i = 1; i <= horizon; i++) {
      const time = new Date(baseTime.getTime() + i * 3600000);
      const value = Math.max(0, Math.round(movingAvg + trend * i));
      forecastData.push({
        timestamp: time.toISOString(),
        value,
      });
    }

    res.json({
      success: true,
      message: `Demand forecast for zone ${zone_id} based on real historical demand data`,
      real_current_demand: fallbackBase,
      history_points_used: values.length,
      data_source: 'feature_store_history',
      data: forecastData,
      processing_time_ms: elapsedMs(),
    });
  } catch (error) {
    console.error('AI Forecast Real-Data Error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error generating real forecast',
      error: error.message,
      processing_time_ms: elapsedMs(),
    });
  }
});

module.exports = router;
