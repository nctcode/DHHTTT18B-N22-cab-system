import { useEffect, useState } from 'react';
import { ridesAPI } from '../services/api';
import { Search, Eye, X } from 'lucide-react';

const STATUS_MAP = { COMPLETED: 'Hoàn thành', CANCELLED: 'Đã hủy', CANCELLED_BY_DRIVER: 'TX hủy', STARTED: 'Đang đi', ASSIGNED: 'Đã ghép', ARRIVED: 'Đã đến', CREATED: 'Mới tạo' };
const STATUS_COLOR = { COMPLETED: 'bg-green-50 text-green-600', CANCELLED: 'bg-red-50 text-red-600', CANCELLED_BY_DRIVER: 'bg-red-50 text-red-600', STARTED: 'bg-blue-50 text-blue-600', ASSIGNED: 'bg-yellow-50 text-yellow-600', ARRIVED: 'bg-violet-50 text-violet-600', CREATED: 'bg-gray-100 text-gray-600' };

export default function RidesPage() {
  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selected, setSelected] = useState(null);

  useEffect(() => { fetchRides(); }, []);

  const fetchRides = async () => {
    try {
      const r = await ridesAPI.getAll();
      setRides(Array.isArray(r.data.data) ? r.data.data : Array.isArray(r.data) ? r.data : []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const filtered = rides.filter(r => {
    const matchSearch = (r.pickup?.address || '').toLowerCase().includes(search.toLowerCase()) || (r.dropoff?.address || '').toLowerCase().includes(search.toLowerCase()) || (r.bookingId || '').includes(search);
    const matchStatus = statusFilter === 'ALL' || r.status === statusFilter;
    return matchSearch && matchStatus;
  });

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-500" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Quản lý chuyến đi</h1>
        <p className="text-sm text-gray-500 mt-1">{rides.length} chuyến đi</p>
      </div>
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Tìm theo địa chỉ, mã chuyến..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400" />
        </div>
        {['ALL', 'COMPLETED', 'STARTED', 'ASSIGNED', 'CANCELLED'].map(s => (
          <button key={s} onClick={() => setStatusFilter(s)} className={`px-3 py-2.5 rounded-xl text-xs font-medium transition ${statusFilter === s ? 'bg-primary-500 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
            {s === 'ALL' ? 'Tất cả' : STATUS_MAP[s] || s}
          </button>
        ))}
      </div>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-50 text-left">
              <th className="px-5 py-3.5 font-semibold text-gray-600">Mã chuyến</th>
              <th className="px-5 py-3.5 font-semibold text-gray-600">Điểm đón</th>
              <th className="px-5 py-3.5 font-semibold text-gray-600">Điểm đến</th>
              <th className="px-5 py-3.5 font-semibold text-gray-600">Trạng thái</th>
              <th className="px-5 py-3.5 font-semibold text-gray-600">Giá</th>
              <th className="px-5 py-3.5 font-semibold text-gray-600">Thanh toán</th>
              <th className="px-5 py-3.5 font-semibold text-gray-600">Thời gian</th>
              <th className="px-5 py-3.5 font-semibold text-gray-600">Thao tác</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.slice(0, 50).map(r => (
                <tr key={r._id || r.id} className="hover:bg-gray-50/50 transition">
                  <td className="px-5 py-3.5 font-mono text-xs text-gray-500">{(r.bookingId || r._id || '').slice(-8)}</td>
                  <td className="px-5 py-3.5 text-gray-700 max-w-[200px] truncate">{r.pickup?.address || '---'}</td>
                  <td className="px-5 py-3.5 text-gray-700 max-w-[200px] truncate">{r.dropoff?.address || '---'}</td>
                  <td className="px-5 py-3.5"><span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${STATUS_COLOR[r.status] || 'bg-gray-100 text-gray-600'}`}>{STATUS_MAP[r.status] || r.status}</span></td>
                  <td className="px-5 py-3.5 font-semibold text-gray-800">{r.finalFare ? `${Number(r.finalFare).toLocaleString('vi-VN')}₫` : '---'}</td>
                  <td className="px-5 py-3.5"><span className={`px-2 py-0.5 rounded text-xs ${r.paymentMethod === 'CASH' ? 'bg-green-50 text-green-600' : 'bg-blue-50 text-blue-600'}`}>{r.paymentMethod === 'CASH' ? 'Tiền mặt' : 'Thẻ'}</span></td>
                  <td className="px-5 py-3.5 text-xs text-gray-400">{new Date(r.createdAt).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</td>
                  <td className="px-5 py-3.5"><button onClick={() => setSelected(r)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition"><Eye size={16} /></button></td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={8} className="text-center py-12 text-gray-400">Không tìm thấy chuyến đi</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
      {selected && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelected(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-800">Chi tiết chuyến đi</h3>
              <button onClick={() => setSelected(null)} className="p-1 rounded-lg hover:bg-gray-100"><X size={20} /></button>
            </div>
            <div className="space-y-3 text-sm">
              {[['Mã chuyến', selected.bookingId], ['Trạng thái', STATUS_MAP[selected.status]], ['Điểm đón', selected.pickup?.address], ['Điểm đến', selected.dropoff?.address], ['Giá', selected.finalFare ? `${Number(selected.finalFare).toLocaleString('vi-VN')}₫` : '---'], ['Thanh toán', selected.paymentMethod], ['Khoảng cách', selected.actualDistanceKm ? `${selected.actualDistanceKm.toFixed(1)} km` : '---'], ['Thời gian', selected.actualDurationMin ? `${Math.round(selected.actualDurationMin)} phút` : '---'], ['Đánh giá', selected.review?.rating ? `⭐ ${selected.review.rating}` : 'Chưa đánh giá'], ['Tạo lúc', new Date(selected.createdAt).toLocaleString('vi-VN')]].map(([k, v]) => (
                <div key={k} className="flex justify-between py-2 border-b border-gray-50"><span className="text-gray-500">{k}</span><span className="font-medium text-gray-800">{v || '---'}</span></div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
