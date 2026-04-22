import { useEffect, useState } from 'react';
import { usersAPI } from '../services/api';
import { Search, Ban, CheckCircle, Eye, X } from 'lucide-react';
import toast from 'react-hot-toast';

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('ALL');
  const [selected, setSelected] = useState(null);

  useEffect(() => { fetchUsers(); }, []);

  const fetchUsers = async () => {
    try {
      const r = await usersAPI.getAll();
      setUsers(Array.isArray(r.data.data) ? r.data.data : Array.isArray(r.data) ? r.data : []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const toggleStatus = async (user) => {
    const newStatus = user.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    try {
      await usersAPI.update(user.id, { status: newStatus });
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, status: newStatus } : u));
      toast.success(`${newStatus === 'ACTIVE' ? 'Mở khóa' : 'Khóa'} tài khoản thành công`);
    } catch (e) { toast.error('Thao tác thất bại'); }
  };

  const filtered = users.filter(u => {
    const matchSearch = (u.fullName || '').toLowerCase().includes(search.toLowerCase()) || (u.email || '').toLowerCase().includes(search.toLowerCase()) || (u.phone || '').includes(search);
    const matchFilter = filter === 'ALL' || u.status === filter;
    return matchSearch && matchFilter;
  });

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-500" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Quản lý người dùng</h1>
          <p className="text-sm text-gray-500 mt-1">{users.length} người dùng</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Tìm theo tên, email, SĐT..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400" />
        </div>
        {['ALL', 'ACTIVE', 'SUSPENDED'].map(s => (
          <button key={s} onClick={() => setFilter(s)} className={`px-4 py-2.5 rounded-xl text-sm font-medium transition ${filter === s ? 'bg-primary-500 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
            {s === 'ALL' ? 'Tất cả' : s === 'ACTIVE' ? 'Hoạt động' : 'Đã khóa'}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left">
                <th className="px-5 py-3.5 font-semibold text-gray-600">Người dùng</th>
                <th className="px-5 py-3.5 font-semibold text-gray-600">SĐT</th>
                <th className="px-5 py-3.5 font-semibold text-gray-600">Vai trò</th>
                <th className="px-5 py-3.5 font-semibold text-gray-600">Trạng thái</th>
                <th className="px-5 py-3.5 font-semibold text-gray-600">Đánh giá</th>
                <th className="px-5 py-3.5 font-semibold text-gray-600">Ngày tạo</th>
                <th className="px-5 py-3.5 font-semibold text-gray-600">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(u => (
                <tr key={u.id} className="hover:bg-gray-50/50 transition">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-sm font-bold">{(u.fullName || '?')[0]}</div>
                      <div>
                        <p className="font-medium text-gray-800">{u.fullName || '---'}</p>
                        <p className="text-xs text-gray-400">{u.email || '---'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-gray-600">{u.phone || '---'}</td>
                  <td className="px-5 py-3.5"><span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${u.role === 'ADMIN' ? 'bg-purple-50 text-purple-600' : u.role === 'DRIVER' ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-600'}`}>{u.role === 'PASSENGER' ? 'Hành khách' : u.role === 'DRIVER' ? 'Tài xế' : 'Admin'}</span></td>
                  <td className="px-5 py-3.5"><span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${u.status === 'ACTIVE' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>{u.status === 'ACTIVE' ? 'Hoạt động' : 'Đã khóa'}</span></td>
                  <td className="px-5 py-3.5 text-gray-600">⭐ {u.ratingAvg?.toFixed(1) || '5.0'}</td>
                  <td className="px-5 py-3.5 text-gray-400 text-xs">{u.createdAt ? new Date(u.createdAt).toLocaleDateString('vi-VN') : '---'}</td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-1">
                      <button onClick={() => setSelected(u)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition" title="Xem chi tiết"><Eye size={16} /></button>
                      <button onClick={() => toggleStatus(u)} className={`p-1.5 rounded-lg transition ${u.status === 'ACTIVE' ? 'hover:bg-red-50 text-red-400' : 'hover:bg-green-50 text-green-500'}`} title={u.status === 'ACTIVE' ? 'Khóa' : 'Mở khóa'}>
                        {u.status === 'ACTIVE' ? <Ban size={16} /> : <CheckCircle size={16} />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={7} className="text-center py-12 text-gray-400">Không tìm thấy người dùng</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {selected && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelected(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-800">Chi tiết người dùng</h3>
              <button onClick={() => setSelected(null)} className="p-1 rounded-lg hover:bg-gray-100"><X size={20} /></button>
            </div>
            <div className="space-y-3 text-sm">
              {[['ID', selected.id], ['Tên', selected.fullName], ['Email', selected.email], ['SĐT', selected.phone], ['Vai trò', selected.role], ['Trạng thái', selected.status], ['Đánh giá', `⭐ ${selected.ratingAvg}`]].map(([k, v]) => (
                <div key={k} className="flex justify-between py-2 border-b border-gray-50"><span className="text-gray-500">{k}</span><span className="font-medium text-gray-800">{v || '---'}</span></div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
