import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Button from '../components/Button';

export default function Profile() {
    const navigate = useNavigate();
    const { user, logout } = useAuth();

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    return (
        <div className="min-h-full h-full bg-gray-50 overflow-y-auto box-border">
            {/* Header */}
            <div className="bg-primary text-white p-6 pb-12">
                <button onClick={() => navigate(-1)} className="mb-4 text-2xl">
                    ←
                </button>
                <div className="flex items-center">
                    <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center text-primary text-3xl font-bold mr-4">
                        {user?.name?.charAt(0) || 'U'}
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold">{user?.name || 'Người dùng'}</h1>
                        <p className="opacity-90">{user?.email}</p>
                    </div>
                </div>
            </div>

            {/* Menu */}
            <div className="px-6 -mt-6">
                <div className="bg-white rounded-xl shadow-lg p-6 space-y-4">
                    <button className="w-full flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg">
                        <span>📱 SĐT: {user?.phone || 'Chưa cập nhật'}</span>
                    </button>
                    <button className="w-full flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg">
                        <span>🎫 Vai trò: {user?.role === 'PASSENGER' ? 'Hành khách' : user?.role || 'Hành khách'}</span>
                    </button>
                    <button
                        onClick={() => navigate('/wallet')}
                        className="w-full flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg"
                    >
                        <span>💰 Ví CabGo</span>
                        <span>→</span>
                    </button>
                    <button
                        onClick={() => navigate('/history')}
                        className="w-full flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg"
                    >
                        <span>📋 Lịch sử chuyến đi</span>
                        <span>→</span>
                    </button>
                </div>

                <Button variant="danger" onClick={handleLogout} className="w-full mt-6">
                    Đăng xuất
                </Button>
            </div>
        </div>
    );
}
