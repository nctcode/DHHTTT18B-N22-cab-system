import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, Car, MapPin, DollarSign, Activity, FileText, LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const nav = [
  { to: '/', icon: LayoutDashboard, label: 'Tổng quan' },
  { to: '/users', icon: Users, label: 'Người dùng' },
  { to: '/drivers', icon: Car, label: 'Tài xế' },
  { to: '/rides', icon: MapPin, label: 'Chuyến đi' },
  { to: '/pricing', icon: DollarSign, label: 'Giá & Surge' },
  { to: '/monitoring', icon: Activity, label: 'Giám sát' },
  { to: '/logs', icon: FileText, label: 'Nhật ký' },
];

export default function Sidebar() {
  const { logout } = useAuth();
  return (
    <aside className="fixed left-0 top-0 bottom-0 w-64 bg-sidebar-bg flex flex-col z-30">
      <div className="h-16 flex items-center gap-3 px-6 border-b border-white/5">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-bold text-lg">🚕</div>
        <div>
          <h1 className="text-white font-bold text-sm leading-tight">Cab Admin</h1>
          <p className="text-sidebar-text text-[10px]">Quản trị hệ thống</p>
        </div>
      </div>
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {nav.map(n => (
          <NavLink key={n.to} to={n.to} end={n.to === '/'} className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${isActive ? 'bg-sidebar-active text-sidebar-textActive' : 'text-sidebar-text hover:bg-sidebar-hover hover:text-white'}`
          }>
            <n.icon size={18} />
            {n.label}
          </NavLink>
        ))}
      </nav>
      <div className="p-3 border-t border-white/5">
        <button onClick={logout} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-400 hover:bg-red-500/10 w-full transition-all">
          <LogOut size={18} /> Đăng xuất
        </button>
      </div>
    </aside>
  );
}
