import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

// Mock history data for demo
const MOCK_HISTORY = [
    {
        id: 'ride-001',
        pickup: { address: '268 Lý Thường Kiệt, Q.10, TP.HCM' },
        dropoff: { address: 'Chợ Bến Thành, Q.1, TP.HCM' },
        earnings: 45000,
        vehicleType: 'BIKE',
        status: 'COMPLETED',
        date: '2026-02-14T10:30:00',
        distance: 3.2,
        duration: 12,
    },
    {
        id: 'ride-002',
        pickup: { address: 'ĐH Bách Khoa, Q. Thủ Đức' },
        dropoff: { address: 'Vincom Thủ Đức' },
        earnings: 28000,
        vehicleType: 'BIKE',
        status: 'COMPLETED',
        date: '2026-02-14T08:15:00',
        distance: 2.1,
        duration: 8,
    },
    {
        id: 'ride-003',
        pickup: { address: 'Sân bay Tân Sơn Nhất' },
        dropoff: { address: 'Bitexco Financial Tower, Q.1' },
        earnings: 120000,
        vehicleType: 'ECONOMY',
        status: 'COMPLETED',
        date: '2026-02-13T18:00:00',
        distance: 8.5,
        duration: 35,
    },
];

export default function RideHistory() {
    const navigate = useNavigate();
    const [history] = useState(MOCK_HISTORY);

    const totalEarnings = history.reduce((sum, r) => sum + r.earnings, 0);

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
                    <div key={ride.id} className="bg-white rounded-xl shadow-sm p-4 hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <span className="text-lg">{ride.vehicleType === 'BIKE' ? '🛵' : '🚗'}</span>
                                <span className="text-xs text-gray-400">
                                    {new Date(ride.date).toLocaleDateString('vi-VN', {
                                        day: '2-digit',
                                        month: '2-digit',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    })}
                                </span>
                            </div>
                            <span className="font-bold text-primary">
                                +{ride.earnings.toLocaleString('vi-VN')}₫
                            </span>
                        </div>

                        <div className="space-y-1.5">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                <p className="text-sm text-gray-600 truncate">{ride.pickup.address}</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                                <p className="text-sm text-gray-600 truncate">{ride.dropoff.address}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-50">
                            <span className="text-xs text-gray-400">{ride.distance} km</span>
                            <span className="text-xs text-gray-400">{ride.duration} phút</span>
                            <span className="ml-auto text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                                {ride.status === 'COMPLETED' ? 'Hoàn thành' : ride.status}
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
