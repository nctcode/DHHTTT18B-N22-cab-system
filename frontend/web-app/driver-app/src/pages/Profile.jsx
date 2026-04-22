import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import driverService from '../services/driverService';
import api from '../services/api';
import toast from 'react-hot-toast';

export default function Profile() {
    const navigate = useNavigate();
    const { user, logout } = useAuth();

    const [userProfile, setUserProfile] = useState(null);
    const [driverProfile, setDriverProfile] = useState(null);
    const [stats, setStats] = useState({ totalTrips: 0, totalEarnings: 0 });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadProfiles = async () => {
            // Fetch basic user profile for name and email
            try {
                const userRes = await api.get(`/api/users/${user.id}`);
                if (userRes.data?.data) {
                    setUserProfile(userRes.data.data);
                }
            } catch (err) {
                console.error("Error loading user profile", err);
            }

            // Fetch driver profile for vehicle info and rating
            try {
                const driverRes = await driverService.getMyProfile();
                const dProfile = driverRes?.data || driverRes;
                setDriverProfile(dProfile);
            } catch (err) {
                console.error("Error loading driver profile", err);
                toast.error('Không thể tải thông tin hồ sơ');
            }

            // Fetch ride history for stats — use user.id (auth userId), not driverProfile.id
            try {
                const ridesRes = await api.get(`/api/rides/driver/${user.id}`);
                const rides = ridesRes.data?.data || ridesRes.data || [];

                const completedRides = rides.filter(r => r.status === 'COMPLETED');
                const earnings = completedRides.reduce((sum, ride) => sum + (Number(ride.finalFare) || 0), 0);

                setStats({
                    totalTrips: completedRides.length,
                    totalEarnings: earnings
                });
            } catch (err) {
                console.error("Error loading ride stats", err);
            }

            setLoading(false);
        };

        if (user) {
            loadProfiles();
        }
    }, [user]);

    const handleLogout = async () => {
        if (driverProfile && driverProfile.is_available) {
            try {
                // Set offline before logging out
                await driverService.updateStatus(driverProfile.id, false);
            } catch (err) {
                console.error('Failed to set offline on logout', err);
            }
        }
        await logout();
        navigate('/login');
    };

    if (loading) {
        return (
            <div className="h-full w-full flex items-center justify-center bg-gray-50">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="min-h-full h-full bg-gray-50 flex flex-col overflow-y-auto box-border pb-10">
            {/* Header */}
            <div className="bg-primary pt-12 pb-24 px-6 relative shrink-0">
                <button
                    onClick={() => navigate(-1)}
                    className="absolute top-6 left-4 w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-colors"
                >
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                    </svg>
                </button>
                <h1 className="text-white text-xl font-bold text-center mt-2">Hồ sơ Tài xế</h1>
            </div>

            {/* Profile Card */}
            <div className="px-6 -mt-16 relative z-10 shrink-0 mb-6">
                <div className="bg-white rounded-3xl shadow-xl p-6 flex flex-col items-center border border-gray-100">
                    <div className="w-24 h-24 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full border-4 border-white shadow-md flex items-center justify-center overflow-hidden mb-4">
                        <span className="text-4xl">👨‍✈️</span>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800 text-center mb-1">
                        {userProfile?.fullName || 'Tài xế CabGo'}
                    </h2>
                    <p className="text-gray-500 text-sm mb-4">{userProfile?.email || user?.email}</p>

                    <div className="flex items-center gap-2 bg-yellow-50 px-4 py-1.5 rounded-full border border-yellow-100">
                        <span className="text-yellow-500 text-lg">⭐</span>
                        <span className="text-yellow-700 font-bold text-lg">{Number(driverProfile?.rating_avg || 5.0).toFixed(1)}</span>
                    </div>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="px-6 grid grid-cols-2 gap-4 mb-6 shrink-0">
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center">
                    <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center mb-2">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                    </div>
                    <p className="text-gray-400 text-xs font-medium uppercase tracking-wide mb-1">Tổng chuyến</p>
                    <p className="text-2xl font-bold text-gray-800">{stats.totalTrips}</p>
                </div>
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center">
                    <div className="w-10 h-10 rounded-full bg-green-50 text-green-500 flex items-center justify-center mb-2">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <p className="text-gray-400 text-xs font-medium uppercase tracking-wide mb-1">Tổng thu nhập</p>
                    <p className="text-lg font-bold text-gray-800">{stats.totalEarnings.toLocaleString('vi-VN')}₫</p>
                </div>
            </div>

            {/* Vehicle Details */}
            <div className="px-6 mb-8 shrink-0">
                <h3 className="text-gray-800 font-bold mb-3 px-1">Phương tiện</h3>
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-4 flex items-center justify-between border-b border-gray-50">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center text-xl">
                                {driverProfile?.vehicle_type === 'BIKE' ? '🏍️' : '🚗'}
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-800">Loại xe</p>
                                <p className="text-xs text-gray-500">Đã đăng ký</p>
                            </div>
                        </div>
                        <span className="px-3 py-1 bg-gray-100 text-gray-700 font-semibold rounded-lg text-sm">
                            {driverProfile?.vehicle_type || 'N/A'}
                        </span>
                    </div>
                    <div className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center text-gray-600">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-800">Biển số</p>
                                <p className="text-xs text-gray-500">Biển số xe hoạt động</p>
                            </div>
                        </div>
                        <span className="font-mono font-bold text-gray-800 tracking-wider">
                            {driverProfile?.vehicle_plate || 'N/A'}
                        </span>
                    </div>
                </div>
            </div>

            {/* Logout Button */}
            <div className="px-6 mt-auto shrink-0">
                <button
                    onClick={handleLogout}
                    className="w-full bg-red-50 hover:bg-red-100 text-red-600 font-bold py-4 rounded-2xl transition-colors shadow-sm flex items-center justify-center gap-2"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Đăng xuất
                </button>
            </div>
        </div>
    );
}
