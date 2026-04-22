import { useEffect, useState } from 'react';
import { driversAPI, usersAPI, ridesAPI } from '../services/api';
import { Search, Eye, X } from 'lucide-react';

export default function DriversPage() {
  const [drivers, setDrivers] = useState([]);
  const [users, setUsers] = useState({});
  const [activeRides, setActiveRides] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('ALL');
  const [selected, setSelected] = useState(null);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [dRes, uRes, rRes] = await Promise.allSettled([driversAPI.getAll(), usersAPI.getAll(), ridesAPI.getAll()]);
      const dList = dRes.status === 'fulfilled' ? (dRes.value.data.data || dRes.value.data || []) : [];
      const uList = uRes.status === 'fulfilled' ? (uRes.value.data.data || uRes.value.data || []) : [];
      const rList = rRes.status === 'fulfilled' ? (rRes.value.data.data || rRes.value.data || []) : [];
      const uMap = {};
      (Array.isArray(uList) ? uList : []).forEach(u => { uMap[u.id] = u; });
      // Build map: driverId → active ride
      const rideMap = {};
      (Array.isArray(rList) ? rList : []).filter(r => ['ASSIGNED', 'ARRIVED', 'STARTED'].includes(r.status)).forEach(r => {
        if (r.driverId) rideMap[r.driverId] = r;
      });
      setDrivers(Array.isArray(dList) ? dList : []);
      setUsers(uMap);
      setActiveRides(rideMap);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const getDriverStatus = (d) => {
    if (activeRides[d.user_id] || activeRides[d.id]) return 'BUSY';
    if (d.is_available) return 'ONLINE';
    return 'OFFLINE';
  };

  const STATUS_CONFIG = {
    ONLINE: { label: 'Online', dot: 'bg-green-500', cls: 'bg-green-50 text-green-600' },
    BUSY: { label: 'Đang chạy', dot: 'bg-blue-500', cls: 'bg-blue-50 text-blue-600' },
    OFFLINE: { label: 'Offline', dot: 'bg-gray-400', cls: 'bg-gray-100 text-gray-500' },
  };

  const filtered = drivers.filter(d => {
    const user = users[d.user_id] || {};
    const matchSearch = (user.fullName || '').toLowerCase().includes(search.toLowerCase()) || (d.vehicle_plate || '').toLowerCase().includes(search.toLowerCase());
    const status = getDriverStatus(d);
    const matchFilter = filter === 'ALL' || filter === status;
    return matchSearch && matchFilter;
  });

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-500" /></div>;

  const onlineCount = drivers.filter(d => getDriverStatus(d) === 'ONLINE').length;
  const busyCount = drivers.filter(d => getDriverStatus(d) === 'BUSY').length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Quản lý tài xế</h1>
        <p className="text-sm text-gray-500 mt-1">{drivers.length} tài xế · {onlineCount} đang rảnh · {busyCount} đang chạy</p>
      </div>
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Tìm theo tên, biển số..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400" />
        </div>
        {['ALL', 'ONLINE', 'BUSY', 'OFFLINE'].map(s => (
          <button key={s} onClick={() => setFilter(s)} className={`px-4 py-2.5 rounded-xl text-sm font-medium transition ${filter === s ? 'bg-primary-500 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
            {s === 'ALL' ? 'Tất cả' : s === 'ONLINE' ? 'Online' : s === 'BUSY' ? 'Đang chạy' : 'Offline'}
          </button>
        ))}
      </div>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-50 text-left">
              <th className="px-5 py-3.5 font-semibold text-gray-600">Tài xế</th>
              <th className="px-5 py-3.5 font-semibold text-gray-600">Biển số</th>
              <th className="px-5 py-3.5 font-semibold text-gray-600">Loại xe</th>
              <th className="px-5 py-3.5 font-semibold text-gray-600">Trạng thái</th>
              <th className="px-5 py-3.5 font-semibold text-gray-600">Đánh giá</th>
              <th className="px-5 py-3.5 font-semibold text-gray-600">Vị trí</th>
              <th className="px-5 py-3.5 font-semibold text-gray-600">Thao tác</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(d => {
                const u = users[d.user_id] || {};
                const status = getDriverStatus(d);
                const cfg = STATUS_CONFIG[status];
                return (
                  <tr key={d.id} className="hover:bg-gray-50/50 transition">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white text-sm font-bold">{(u.fullName || '?')[0]}</div>
                        <div>
                          <p className="font-medium text-gray-800">{u.fullName || '---'}</p>
                          <p className="text-xs text-gray-400">{u.phone || '---'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 font-mono text-gray-700">{d.vehicle_plate}</td>
                    <td className="px-5 py-3.5"><span className="text-lg">{d.vehicle_type === 'BIKE' ? '🛵' : '🚗'}</span> {d.vehicle_type}</td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${cfg.cls}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                        {cfg.label}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-gray-600">⭐ {d.rating_avg?.toFixed(1) || '5.0'}</td>
                    <td className="px-5 py-3.5 text-xs text-gray-400">{d.current_lat?.toFixed(3)}, {d.current_lng?.toFixed(3)}</td>
                    <td className="px-5 py-3.5">
                      <button onClick={() => setSelected({ ...d, user: u, ride: activeRides[d.user_id] || activeRides[d.id] })} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition"><Eye size={16} /></button>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && <tr><td colSpan={7} className="text-center py-12 text-gray-400">Không tìm thấy tài xế</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
      {selected && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelected(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-800">Chi tiết tài xế</h3>
              <button onClick={() => setSelected(null)} className="p-1 rounded-lg hover:bg-gray-100"><X size={20} /></button>
            </div>
            <div className="space-y-3 text-sm">
              {[['Tên', selected.user?.fullName], ['SĐT', selected.user?.phone], ['Email', selected.user?.email], ['Xe', `${selected.vehicle_type} — ${selected.vehicle_plate}`], ['Đánh giá', `⭐ ${selected.rating_avg?.toFixed(1)}`], ['Trạng thái', STATUS_CONFIG[getDriverStatus(selected)]?.label], ['Tọa độ', `${selected.current_lat?.toFixed(5)}, ${selected.current_lng?.toFixed(5)}`]].map(([k, v]) => (
                <div key={k} className="flex justify-between py-2 border-b border-gray-50"><span className="text-gray-500">{k}</span><span className="font-medium text-gray-800">{v || '---'}</span></div>
              ))}
              {selected.ride && (
                <div className="mt-3 p-3 bg-blue-50 rounded-xl">
                  <p className="text-xs font-semibold text-blue-700 mb-1">🚗 Chuyến đi đang chạy</p>
                  <p className="text-xs text-blue-600">📍 {selected.ride.pickup?.address || '---'}</p>
                  <p className="text-xs text-blue-600">📌 {selected.ride.dropoff?.address || '---'}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
