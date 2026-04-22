import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { rideService } from '../services';

export default function RideHistory() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [rides, setRides] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchHistory();
    }, []);

    const fetchHistory = async () => {
        try {
            const response = await rideService.getRideHistory(user.id);
            // response = { success, data: rides[] }
            const data = response.data || response || [];
            const rideList = Array.isArray(data) ? data : [];
            setRides(rideList);
        } catch (error) {
            console.error('Failed to fetch history:', error);
            setRides([]);
        } finally {
            setLoading(false);
        }
    };

    const totalSpent = rides
        .filter(r => r.status === 'COMPLETED')
        .reduce((sum, r) => sum + (Number(r.finalFare) || 0), 0);

    if (loading) {
        return (
            <div className="min-h-full h-full flex items-center justify-center bg-gray-50 box-border">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="min-h-full h-full bg-gray-50 flex flex-col overflow-y-auto box-border">
            <div className="bg-white shadow-sm z-10 sticky top-0">
                <div className="flex items-center gap-4 p-4">
                    <button onClick={() => navigate(-1)} className="p-2">
                        <svg className="w-6 h-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <h1 className="text-lg font-bold">Lịch sử chuyến đi</h1>
                </div>

                {/* Summary */}
                <div className="px-4 pb-4">
                    <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl p-4 text-white">
                        <p className="text-sm text-white/70 mb-1">Tổng chi tiêu</p>
                        <p className="text-3xl font-extrabold">{totalSpent.toLocaleString('vi-VN')}₫</p>
                        <p className="text-sm text-white/70 mt-1">
                            {rides.filter(r => r.status === 'COMPLETED').length} chuyến hoàn thành
                        </p>
                    </div>
                </div>
            </div>

            <div className="flex-1 p-4 space-y-3">
                {rides.length === 0 ? (
                    <div className="text-center py-16">
                        <p className="text-4xl mb-3">🚕</p>
                        <p className="text-gray-400 font-medium">Chưa có chuyến đi nào</p>
                    </div>
                ) : (
                    rides.map((ride) => (
                        <div
                            key={ride._id || ride.id}
                            className="bg-white p-4 rounded-xl shadow-sm hover:shadow-md transition-shadow"
                        >
                            <div className="flex justify-between items-start mb-3">
                                <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                                    ride.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                                    ride.status === 'CANCELLED' || ride.status === 'CANCELLED_BY_DRIVER' ? 'bg-red-100 text-red-700' :
                                    'bg-blue-100 text-blue-700'
                                }`}>
                                    {ride.status === 'COMPLETED' ? 'Hoàn thành' :
                                     ride.status === 'CANCELLED' ? 'Đã hủy' :
                                     ride.status === 'CANCELLED_BY_DRIVER' ? 'Tài xế hủy' :
                                     ride.status}
                                </span>
                                <span className="text-xs text-gray-500">
                                    {new Date(ride.completedAt || ride.createdAt).toLocaleDateString('vi-VN', {
                                        day: '2-digit',
                                        month: '2-digit',
                                        year: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    })}
                                </span>
                            </div>

                            <div className="space-y-1.5 mb-3">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
                                    <p className="font-medium text-sm line-clamp-1">
                                        {ride.pickup?.address || 'Điểm đón'}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 bg-red-500 rounded-full flex-shrink-0"></div>
                                    <p className="font-medium text-sm line-clamp-1">
                                        {ride.dropoff?.address || 'Điểm đến'}
                                    </p>
                                </div>
                            </div>

                            {/* Review Rating */}
                            {ride.review?.rating && (
                                <div className="flex items-center gap-1.5 mb-3">
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

                            <div className="flex justify-between items-center border-t pt-3">
                                <span className="font-bold text-gray-800">
                                    {(Number(ride.finalFare) || 0).toLocaleString('vi-VN')}₫
                                </span>
                                <div className="flex items-center gap-2">
                                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                        ride.paymentMethod === 'CASH' ? 'bg-green-50 text-green-600' : 'bg-blue-50 text-blue-600'
                                    }`}>
                                        {ride.paymentMethod === 'CASH' ? 'Tiền mặt' : 'Thẻ'}
                                    </span>
                                    <span className="text-xs text-gray-400">
                                        {ride.vehicleType === 'BIKE' ? '🛵' : '🚗'} {ride.vehicleType || 'CAR'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
