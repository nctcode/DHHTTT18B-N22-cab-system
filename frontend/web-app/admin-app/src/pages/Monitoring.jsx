import { useEffect, useState, useRef } from 'react';
import { driversAPI, usersAPI, ridesAPI } from '../services/api';
import { RefreshCw } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

export default function MonitoringPage() {
  const [drivers, setDrivers] = useState([]);
  const [rides, setRides] = useState([]);
  const [users, setUsers] = useState({});
  const [activeRideMap, setActiveRideMap] = useState({});
  const [loading, setLoading] = useState(true);
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markersRef = useRef([]);

  useEffect(() => { fetchData(); const interval = setInterval(fetchData, 15000); return () => clearInterval(interval); }, []);

  const fetchData = async () => {
    try {
      const [dRes, rRes, uRes] = await Promise.allSettled([driversAPI.getAll(), ridesAPI.getAll(), usersAPI.getAll()]);
      const dList = dRes.status === 'fulfilled' ? (dRes.value.data.data || dRes.value.data || []) : [];
      const rList = rRes.status === 'fulfilled' ? (rRes.value.data.data || rRes.value.data || []) : [];
      const uList = uRes.status === 'fulfilled' ? (uRes.value.data.data || uRes.value.data || []) : [];
      const uMap = {}; (Array.isArray(uList) ? uList : []).forEach(u => { uMap[u.id] = u; });
      const activeRides = (Array.isArray(rList) ? rList : []).filter(r => ['STARTED', 'ASSIGNED', 'ARRIVED'].includes(r.status));
      const rideMap = {};
      activeRides.forEach(r => { if (r.driverId) rideMap[r.driverId] = r; });
      setDrivers(Array.isArray(dList) ? dList : []);
      setRides(activeRides);
      setUsers(uMap);
      setActiveRideMap(rideMap);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  // A driver is "active" if they are available OR on a ride
  const isDriverActive = (d) => d.is_available || activeRideMap[d.user_id] || activeRideMap[d.id];
  const getDriverStatus = (d) => {
    if (activeRideMap[d.user_id] || activeRideMap[d.id]) return 'BUSY';
    if (d.is_available) return 'ONLINE';
    return 'OFFLINE';
  };

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;
    import('leaflet').then(L => {
      const map = L.map(mapRef.current).setView([10.8231, 106.6297], 13);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap' }).addTo(map);
      mapInstance.current = map;
    });
  }, [loading]);

  useEffect(() => {
    if (!mapInstance.current) return;
    import('leaflet').then(L => {
      markersRef.current.forEach(m => m.remove());
      markersRef.current = [];
      // Show ALL active drivers: available + on-ride
      const activeDrivers = drivers.filter(d => isDriverActive(d) && d.current_lat && d.current_lng);
      activeDrivers.forEach(d => {
        const u = users[d.user_id] || {};
        const status = getDriverStatus(d);
        const color = status === 'BUSY' ? '#3b82f6' : '#22c55e';
        const icon = L.divIcon({
          html: `<div style="background:${color};color:white;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:16px;border:2px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3)">${d.vehicle_type === 'BIKE' ? '🛵' : '🚗'}</div>`,
          className: '', iconSize: [32, 32], iconAnchor: [16, 16]
        });
        const marker = L.marker([d.current_lat, d.current_lng], { icon }).addTo(mapInstance.current);
        const statusLabel = status === 'BUSY' ? '🔵 Đang chạy' : '🟢 Rảnh';
        marker.bindPopup(`<b>${u.fullName || 'Tài xế'}</b><br/>${d.vehicle_plate}<br/>⭐ ${d.rating_avg?.toFixed(1)}<br/>${statusLabel}`);
        markersRef.current.push(marker);
      });
    });
  }, [drivers, users, activeRideMap]);

  const onlineCount = drivers.filter(d => d.is_available).length;
  const busyCount = drivers.filter(d => activeRideMap[d.user_id] || activeRideMap[d.id]).length;

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-500" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Giám sát thời gian thực</h1>
          <p className="text-sm text-gray-500 mt-1">{onlineCount} rảnh · {busyCount} đang chạy · {rides.length} chuyến · Cập nhật mỗi 15s</p>
        </div>
        <button onClick={fetchData} className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50 transition">
          <RefreshCw size={16} /> Làm mới
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        <div className="xl:col-span-3 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden" style={{ height: '600px' }}>
          <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
        </div>
        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <h3 className="font-semibold text-gray-800 mb-3">Chuyến đi đang chạy</h3>
            <div className="space-y-2 max-h-[250px] overflow-y-auto">
              {rides.length === 0 && <p className="text-center text-gray-400 text-sm py-4">Không có chuyến nào</p>}
              {rides.map(r => (
                <div key={r._id || r.id} className="p-3 bg-gray-50 rounded-xl text-xs">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono text-gray-500">{(r.bookingId || '').slice(-6)}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${r.status === 'STARTED' ? 'bg-blue-100 text-blue-600' : 'bg-yellow-100 text-yellow-600'}`}>{r.status === 'STARTED' ? 'Đang đi' : r.status === 'ARRIVED' ? 'Đã đến' : 'Đã ghép'}</span>
                  </div>
                  <p className="text-gray-600 truncate">📍 {r.pickup?.address || '---'}</p>
                  <p className="text-gray-600 truncate">📌 {r.dropoff?.address || '---'}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <h3 className="font-semibold text-gray-800 mb-3">Tài xế đang hoạt động</h3>
            <div className="space-y-2 max-h-[250px] overflow-y-auto">
              {drivers.filter(d => isDriverActive(d)).map(d => {
                const u = users[d.user_id] || {};
                const status = getDriverStatus(d);
                return (
                  <div key={d.id} className="flex items-center gap-2 p-2 rounded-xl hover:bg-gray-50 transition">
                    <div className={`w-8 h-8 rounded-full ${status === 'BUSY' ? 'bg-blue-100' : 'bg-emerald-100'} flex items-center justify-center text-sm`}>{d.vehicle_type === 'BIKE' ? '🛵' : '🚗'}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{u.fullName || '---'}</p>
                      <p className="text-xs text-gray-400">{d.vehicle_plate} · ⭐{d.rating_avg?.toFixed(1)}</p>
                    </div>
                    <span className={`w-2 h-2 rounded-full ${status === 'BUSY' ? 'bg-blue-500' : 'bg-green-500'}`} />
                  </div>
                );
              })}
              {drivers.filter(d => isDriverActive(d)).length === 0 && <p className="text-center text-gray-400 text-sm py-4">Không có tài xế</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
