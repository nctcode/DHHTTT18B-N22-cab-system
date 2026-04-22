import { useState } from 'react';
import { Search, Filter } from 'lucide-react';

// Sample audit log data (in production, this would come from an API)
const SAMPLE_LOGS = [
  { id: 1, timestamp: new Date().toISOString(), action: 'LOGIN', user: 'admin@cab.vn', service: 'auth-service', detail: 'Đăng nhập thành công' },
  { id: 2, timestamp: new Date(Date.now() - 60000).toISOString(), action: 'RIDE_CREATED', user: 'passenger@test.vn', service: 'booking-service', detail: 'Tạo chuyến đi mới' },
  { id: 3, timestamp: new Date(Date.now() - 120000).toISOString(), action: 'PAYMENT_SUCCESS', user: 'system', service: 'payment-service', detail: 'Thanh toán thành công' },
  { id: 4, timestamp: new Date(Date.now() - 180000).toISOString(), action: 'DRIVER_ASSIGNED', user: 'system', service: 'ride-service', detail: 'Ghép tài xế cho chuyến đi' },
  { id: 5, timestamp: new Date(Date.now() - 300000).toISOString(), action: 'REVIEW_CREATED', user: 'passenger@test.vn', service: 'review-service', detail: 'Đánh giá tài xế 5 sao' },
  { id: 6, timestamp: new Date(Date.now() - 600000).toISOString(), action: 'USER_BLOCKED', user: 'admin@cab.vn', service: 'user-service', detail: 'Khóa tài khoản vi phạm' },
  { id: 7, timestamp: new Date(Date.now() - 900000).toISOString(), action: 'PRICE_UPDATED', user: 'admin@cab.vn', service: 'pricing-service', detail: 'Cập nhật giá cước CAR' },
  { id: 8, timestamp: new Date(Date.now() - 1800000).toISOString(), action: 'SURGE_ACTIVATED', user: 'admin@cab.vn', service: 'pricing-service', detail: 'Bật surge Quận 1: x1.5' },
  { id: 9, timestamp: new Date(Date.now() - 3600000).toISOString(), action: 'RIDE_COMPLETED', user: 'system', service: 'ride-service', detail: 'Chuyến đi hoàn thành' },
  { id: 10, timestamp: new Date(Date.now() - 7200000).toISOString(), action: 'DRIVER_REGISTERED', user: 'driver@test.vn', service: 'driver-service', detail: 'Đăng ký tài xế mới' },
];

const ACTION_COLORS = {
  LOGIN: 'bg-blue-50 text-blue-600', RIDE_CREATED: 'bg-green-50 text-green-600', PAYMENT_SUCCESS: 'bg-emerald-50 text-emerald-600',
  DRIVER_ASSIGNED: 'bg-violet-50 text-violet-600', REVIEW_CREATED: 'bg-yellow-50 text-yellow-600', USER_BLOCKED: 'bg-red-50 text-red-600',
  PRICE_UPDATED: 'bg-orange-50 text-orange-600', SURGE_ACTIVATED: 'bg-pink-50 text-pink-600', RIDE_COMPLETED: 'bg-teal-50 text-teal-600',
  DRIVER_REGISTERED: 'bg-cyan-50 text-cyan-600',
};

const SERVICES = ['Tất cả', 'auth-service', 'booking-service', 'ride-service', 'payment-service', 'review-service', 'user-service', 'driver-service', 'pricing-service'];

export default function LogsPage() {
  const [search, setSearch] = useState('');
  const [serviceFilter, setServiceFilter] = useState('Tất cả');

  const filtered = SAMPLE_LOGS.filter(l => {
    const matchSearch = l.action.toLowerCase().includes(search.toLowerCase()) || l.detail.toLowerCase().includes(search.toLowerCase()) || l.user.toLowerCase().includes(search.toLowerCase());
    const matchService = serviceFilter === 'Tất cả' || l.service === serviceFilter;
    return matchSearch && matchService;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Nhật ký hệ thống</h1>
        <p className="text-sm text-gray-500 mt-1">Theo dõi các sự kiện và hành động trong hệ thống</p>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Tìm theo hành động, người dùng..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400" />
        </div>
        <div className="flex items-center gap-1.5">
          <Filter size={16} className="text-gray-400" />
          <select value={serviceFilter} onChange={e => setServiceFilter(e.target.value)}
            className="px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400">
            {SERVICES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="bg-gray-50 text-left">
            <th className="px-5 py-3.5 font-semibold text-gray-600">Thời gian</th>
            <th className="px-5 py-3.5 font-semibold text-gray-600">Hành động</th>
            <th className="px-5 py-3.5 font-semibold text-gray-600">Người dùng</th>
            <th className="px-5 py-3.5 font-semibold text-gray-600">Service</th>
            <th className="px-5 py-3.5 font-semibold text-gray-600">Chi tiết</th>
          </tr></thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.map(l => (
              <tr key={l.id} className="hover:bg-gray-50/50 transition">
                <td className="px-5 py-3.5 text-xs text-gray-500 whitespace-nowrap">{new Date(l.timestamp).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })}</td>
                <td className="px-5 py-3.5"><span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${ACTION_COLORS[l.action] || 'bg-gray-100 text-gray-600'}`}>{l.action}</span></td>
                <td className="px-5 py-3.5 text-gray-700">{l.user}</td>
                <td className="px-5 py-3.5"><span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs font-mono">{l.service}</span></td>
                <td className="px-5 py-3.5 text-gray-600">{l.detail}</td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={5} className="text-center py-12 text-gray-400">Không tìm thấy nhật ký</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
