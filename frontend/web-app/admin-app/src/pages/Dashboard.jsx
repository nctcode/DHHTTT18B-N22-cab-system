import { useEffect, useState } from 'react';
import { Users, Car, MapPin, DollarSign, TrendingUp } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import StatsCard from '../components/StatsCard';
import { usersAPI, driversAPI, ridesAPI } from '../services/api';

const PIE_COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#64748b'];

export default function Dashboard() {
  const [stats, setStats] = useState({ users: 0, drivers: 0, activeDrivers: 0, rides: [], revenue: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    try {
      const [usersRes, driversRes, ridesRes] = await Promise.allSettled([usersAPI.getAll(), driversAPI.getAll(), ridesAPI.getAll()]);
      const users = usersRes.status === 'fulfilled' ? (usersRes.value.data.data || usersRes.value.data || []) : [];
      const drivers = driversRes.status === 'fulfilled' ? (driversRes.value.data.data || driversRes.value.data || []) : [];
      const rides = ridesRes.status === 'fulfilled' ? (ridesRes.value.data.data || ridesRes.value.data || []) : [];
      const userList = Array.isArray(users) ? users : [];
      const driverList = Array.isArray(drivers) ? drivers : [];
      const rideList = Array.isArray(rides) ? rides : [];
      const activeDrivers = driverList.filter(d => d.is_available).length;
      const busyDrivers = rideList.filter(r => ['ASSIGNED', 'ARRIVED', 'STARTED'].includes(r.status) && r.driverId).length;
      const completedRides = rideList.filter(r => r.status === 'COMPLETED');
      const revenue = completedRides.reduce((s, r) => s + (Number(r.finalFare) || 0), 0);
      setStats({ users: userList.length, drivers: driverList.length, activeDrivers, busyDrivers, rides: rideList, revenue });
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const completedToday = stats.rides.filter(r => r.status === 'COMPLETED' && r.completedAt && new Date(r.completedAt).toDateString() === new Date().toDateString()).length;
  const ongoingRides = stats.rides.filter(r => ['CREATED', 'ASSIGNED', 'ARRIVED', 'STARTED'].includes(r.status)).length;

  // Chart data
  const statusCounts = {};
  stats.rides.forEach(r => { statusCounts[r.status] = (statusCounts[r.status] || 0) + 1; });
  const pieData = Object.entries(statusCounts).map(([name, value]) => ({ name: name === 'COMPLETED' ? 'Hoàn thành' : name === 'CANCELLED' ? 'Đã hủy' : name === 'STARTED' ? 'Đang đi' : name === 'ASSIGNED' ? 'Đã ghép' : name === 'CREATED' ? 'Mới tạo' : name, value }));

  // Revenue by day (last 7 days)
  const revByDay = {};
  for (let i = 6; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); revByDay[d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })] = 0; }
  stats.rides.filter(r => r.status === 'COMPLETED' && r.completedAt).forEach(r => {
    const d = new Date(r.completedAt).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
    if (d in revByDay) revByDay[d] += Number(r.finalFare) || 0;
  });
  const barData = Object.entries(revByDay).map(([name, revenue]) => ({ name, revenue: Math.round(revenue) }));

  // Rides by day
  const ridesByDay = {};
  for (let i = 6; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); ridesByDay[d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })] = 0; }
  stats.rides.forEach(r => {
    const d = new Date(r.createdAt).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
    if (d in ridesByDay) ridesByDay[d]++;
  });
  const lineData = Object.entries(ridesByDay).map(([name, rides]) => ({ name, rides }));

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-500" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Tổng quan</h1>
        <p className="text-sm text-gray-500 mt-1">Dữ liệu thời gian thực từ hệ thống</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
        <StatsCard title="Người dùng" value={stats.users} icon={Users} color="blue" />
        <StatsCard title="Tài xế online" value={stats.activeDrivers} icon={Car} color="green" sub={`${stats.drivers} tổng`} />
        <StatsCard title="Đang chạy" value={ongoingRides} icon={MapPin} color="purple" />
        <StatsCard title="Hoàn thành hôm nay" value={completedToday} icon={TrendingUp} color="orange" />
        <StatsCard title="Doanh thu" value={`${(stats.revenue / 1000).toFixed(0)}K₫`} icon={DollarSign} color="rose" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h3 className="font-semibold text-gray-800 mb-4">Chuyến đi 7 ngày qua</h3>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={lineData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#94a3b8' }} />
              <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} />
              <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '13px' }} />
              <Line type="monotone" dataKey="rides" stroke="#3b82f6" strokeWidth={2.5} dot={{ fill: '#3b82f6', r: 4 }} name="Chuyến" />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h3 className="font-semibold text-gray-800 mb-4">Trạng thái chuyến đi</h3>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={3} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} style={{ fontSize: '11px' }}>
                {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <h3 className="font-semibold text-gray-800 mb-4">Doanh thu 7 ngày qua (₫)</h3>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={barData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#94a3b8' }} />
            <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} tickFormatter={v => `${(v/1000).toFixed(0)}K`} />
            <Tooltip formatter={v => [`${v.toLocaleString('vi-VN')}₫`, 'Doanh thu']} contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '13px' }} />
            <Bar dataKey="revenue" fill="url(#revenueGrad)" radius={[6, 6, 0, 0]} name="Doanh thu" />
            <defs>
              <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" />
                <stop offset="100%" stopColor="#6366f1" />
              </linearGradient>
            </defs>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
