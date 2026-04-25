import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

export default function RideHistory() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchHistory = async () => {
            if (!user?.id) return;
            try {
                const res = await api.get(`/api/rides/driver/${user.id}`);
                const rides = res.data?.data || res.data || [];
                // Filter only completed rides and sort by most recent
                const completed = rides
                    .filter(r => r.status === 'COMPLETED')
                    .sort((a, b) => new Date(b.completedAt || b.createdAt) - new Date(a.completedAt || a.createdAt));
                setHistory(completed);
            } catch (error) {
                console.error('Failed to fetch ride history:', error);
                setHistory([]);
            } finally {
                setLoading(false);
            }
        };
        fetchHistory();
    }, [user]);

    const totalEarnings = history.reduce((sum, r) => sum + (Number(r.finalFare) || 0), 0);

    if (loading) {
        return (
            <div className="min-h-full h-full flex items-center justify-center bg-gray-50 box-border">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="min-h-full h-full bg-gray-50 overflow-y-auto box-border">
            {/* Header */}
            <div className="bg-white shadow-sm sticky top-0 z-10">
                <div className="flex items-center gap-3 px-4 py-4">
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors"
                    >
                        <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <h1 className="text-lg font-bold text-gray-800">Lịch sử chuyến đi</h1>
                </div>

                {/* Summary */}
                <div className="px-4 pb-4">
                    <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl p-4 text-white">
                        <p className="text-sm text-white/70 mb-1">Tổng thu nhập</p>
                        <p className="text-3xl font-extrabold">{totalEarnings.toLocaleString('vi-VN')}₫</p>
                        <p className="text-sm text-white/70 mt-1">{history.length} chuyến hoàn thành</p>
                    </div>
                </div>
            </div>

            {/* Ride List */}
            <div className="px-4 py-4 space-y-3">
                {history.map((ride) => (
                    <div key={ride._id || ride.id} className="bg-white rounded-xl shadow-sm p-4 hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <span className="text-lg">{ride.vehicleType === 'BIKE' ? '🛵' : '🚗'}</span>
                                <span className="text-xs text-gray-400">
                                    {new Date(ride.completedAt || ride.createdAt).toLocaleDateString('vi-VN', {
                                        day: '2-digit',
                                        month: '2-digit',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    })}
                                </span>
                            </div>
                            <span className="font-bold text-primary">
                                +{(Number(ride.finalFare) || 0).toLocaleString('vi-VN')}₫
                            </span>
                        </div>

                        {/* Mã chuyến đi */}
                        <div className="mb-2">
                            <span className="text-xs text-gray-400">Mã chuyến: </span>
                            <span className="text-xs font-mono text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                                {ride.bookingId || ride._id || ride.id}
                            </span>
                        </div>

                        <div className="space-y-1.5">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                <p className="text-sm text-gray-600 truncate">{ride.pickup?.address || 'Điểm đón'}</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                                <p className="text-sm text-gray-600 truncate">{ride.dropoff?.address || 'Điểm đến'}</p>
                            </div>
                        </div>

                        {/* Review Rating from Passenger */}
                        {ride.review?.rating && (
                            <div className="flex items-center gap-1.5 mt-2">
                                <span className="text-xs text-gray-500">Đánh giá:</span>
                                <div className="flex items-center gap-0.5">
                                    {[1, 2, 3, 4, 5].map(star => (
                                        <span key={star} className={`text-sm ${star <= ride.review.rating ? 'text-yellow-400' : 'text-gray-200'}`}>★</span>
                                    ))}
                                </div>
                                {ride.review.comment && (
                                    <span className="text-xs text-gray-400 truncate ml-1">"{ride.review.comment}"</span>
                                )}
                            </div>
                        )}

                        <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-50">
                            <span className="text-xs text-gray-400">
                                {ride.actualDistanceKm
                                    ? `${parseFloat(ride.actualDistanceKm).toFixed(1)} km`
                                    : ride.previewRoute?.distanceKm
                                        ? `${parseFloat(ride.previewRoute.distanceKm).toFixed(1)} km`
                                        : '--- km'}
                            </span>
                            <span className="text-xs text-gray-400">
                                {ride.actualDurationMin
                                    ? `${Math.round(ride.actualDurationMin)} phút`
                                    : '---'}
                            </span>
                            <span className={`ml-auto text-xs font-medium px-2 py-0.5 rounded-full ${
                                ride.paymentStatus === 'PAID'
                                    ? 'text-green-600 bg-green-50'
                                    : 'text-yellow-600 bg-yellow-50'
                            }`}>
                                {ride.paymentStatus === 'PAID' ? 'Đã thanh toán' : ride.paymentMethod || 'CASH'}
                            </span>
                        </div>
                    </div>
                ))}

                {history.length === 0 && (
                    <div className="text-center py-16">
                        <p className="text-4xl mb-3">🚗</p>
                        <p className="text-gray-400 font-medium">Chưa có chuyến nào</p>
                    </div>
                )}
            </div>
        </div>
    );
}
