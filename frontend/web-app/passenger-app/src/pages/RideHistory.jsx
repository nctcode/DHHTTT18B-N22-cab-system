import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { rideService } from '../services';
import LoadingSpinner from '../components/LoadingSpinner';

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
            const data = await rideService.getRideHistory(user.id);
            setRides(data.rides || []);
        } catch (error) {
            console.error('Failed to fetch history:', error);
            setRides([]);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-full h-full flex items-center justify-center bg-gray-50 box-border">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="min-h-full h-full bg-gray-50 flex flex-col overflow-y-auto box-border">
            <div className="bg-white p-4 shadow-sm z-10 sticky top-0 flex items-center gap-4">
                <button onClick={() => navigate('/profile')} className="p-2">
                    <svg className="w-6 h-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                </button>
                <h1 className="text-lg font-bold">Lịch sử chuyến đi</h1>
            </div>

            <div className="flex-1 p-4 space-y-4">
                {rides.length === 0 ? (
                    <div className="text-center text-gray-500 mt-10">
                        <p>Chưa có chuyến đi nào</p>
                    </div>
                ) : (
                    rides.map((ride) => (
                        <div
                            key={ride.id}
                            onClick={() => navigate(`/ride/${ride.id}`)}
                            className="bg-white p-4 rounded-xl shadow-sm active:scale-[0.98] transition-transform"
                        >
                            <div className="flex justify-between items-start mb-2">
                                <span className={`text-xs px-2 py-1 rounded-full font-medium ${ride.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                                    ride.status === 'CANCELLED' ? 'bg-red-100 text-red-700' :
                                        'bg-blue-100 text-blue-700'
                                    }`}>
                                    {ride.status}
                                </span>
                                <span className="text-xs text-gray-500">
                                    {new Date(ride.createdAt).toLocaleDateString()}
                                </span>
                            </div>

                            <div className="space-y-1 mb-3">
                                <p className="font-medium text-sm line-clamp-1">📍 {ride.pickupLocation || 'Điểm đón'}</p>
                                <p className="font-medium text-sm line-clamp-1">📌 {ride.dropoffLocation || 'Điểm đến'}</p>
                            </div>

                            <div className="flex justify-between items-center border-t pt-3">
                                <span className="font-bold text-gray-800">
                                    {(ride.finalFare || 0).toLocaleString('vi-VN')}₫
                                </span>
                                <span className="text-xs text-gray-500">
                                    {ride.vehicleType || 'Car'}
                                </span>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
