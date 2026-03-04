import { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import api from '../services/api';
import rideService from '../services/rideService';
import toast from 'react-hot-toast';
import socketService from '../services/socketService';

export default function Completed() {
    const navigate = useNavigate();
    const { id } = useParams();
    const location = useLocation();
    const { ride: initialRide, bookingId, elapsedTime, distance } = location.state || {};
    const [ride, setRide] = useState(initialRide || null);
    const [isConfirming, setIsConfirming] = useState(false);

    const rideId = id || bookingId;

    useEffect(() => {
        const handlePaymentCompleted = (data) => {
            if (data.rideId === rideId || data.ride_id === rideId) {
                console.log('✓ Payment completed:', data);
                setRide(prev => prev ? { ...prev, paymentStatus: 'PAID' } : prev);
                if (data.paymentMethod !== 'CASH') {
                    toast.success(`Khách hàng đã thanh toán qua ${data.paymentMethod === 'CARD' ? 'Thẻ' : 'Ví'} thành công!`);
                }
            }
        };

        const handlePaymentFailed = (data) => {
            if (data.rideId === rideId || data.ride_id === rideId) {
                console.log('✗ Wallet payment failed:', data);
                setRide(prev => prev ? { ...prev, paymentStatus: 'FAILED' } : prev);
                toast.error('Thanh toán qua ví thất bại!');
            }
        };



        socketService.socket?.on('ride.payment.completed', handlePaymentCompleted);
        socketService.socket?.on('ride:paymentCompleted', handlePaymentCompleted);
        socketService.socket?.on('ride.payment.failed', handlePaymentFailed);
        socketService.socket?.on('ride:paymentFailed', handlePaymentFailed);

        return () => {
            socketService.socket?.off('ride.payment.completed', handlePaymentCompleted);
            socketService.socket?.off('ride:paymentCompleted', handlePaymentCompleted);
            socketService.socket?.off('ride.payment.failed', handlePaymentFailed);
            socketService.socket?.off('ride:paymentFailed', handlePaymentFailed);
        };
    }, [rideId]);

    // Polling fallback for payment status
    useEffect(() => {
        if (!rideId || !ride) return;

        // Only poll if payment is still pending
        if (ride.paymentStatus === 'PENDING' || ride.paymentStatus === 'UNPAID') {
            const pollInterval = setInterval(async () => {
                try {
                    const response = await api.get(`/api/rides/${rideId}`);
                    const updatedRide = response.data?.data || response.data;
                    if (updatedRide && updatedRide.paymentStatus !== ride.paymentStatus) {
                        setRide(updatedRide);
                        if (updatedRide.paymentStatus === 'SUCCESS' || updatedRide.paymentStatus === 'PAID') {
                            toast.success('Thanh toán hoàn tất!');
                        }
                    }
                } catch (error) {
                    console.log('Polling error (non-critical):', error.message);
                }
            }, 3000); // Poll every 3 seconds

            return () => clearInterval(pollInterval);
        }
    }, [rideId, ride]);

    // Actual final fare calculated by backend, fallback to estimated
    const earnings = ride?.finalFare || ride?.estimatedPrice || 0;
    const paymentMethod = ride?.paymentMethod || 'CASH';
    const paymentStatus = ride?.paymentStatus || 'UNPAID';

    const formatTime = (seconds) => {
        if (!seconds) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const handleConfirmCash = async () => {
        setIsConfirming(true);
        try {
            const response = await api.patch(`/api/rides/${rideId}/confirm-cash-payment`);
            toast.success('Đã xác nhận thu tiền mặt');
            setRide(response.data?.data || response.data || ride);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Lỗi xác nhận');
        } finally {
            setIsConfirming(false);
        }
    };



    return (
        <div className="min-h-full h-full bg-gradient-to-br from-emerald-50 via-white to-teal-50 flex flex-col items-center justify-center px-6 overflow-y-auto box-border">
            {/* Success Animation */}
            <div className="relative mb-6">
                <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center animate-bounce">
                    <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center text-white text-3xl shadow-lg shadow-primary/30">
                        ✓
                    </div>
                </div>
                <div className="absolute inset-0 w-24 h-24 bg-primary/20 rounded-full animate-pulse-ring"></div>
            </div>

            <h1 className="text-2xl font-extrabold text-gray-900 mb-1">Chuyến đi hoàn thành!</h1>
            <p className="text-gray-400 text-sm mb-6">Chuyến #{rideId?.slice(-6) || '---'}</p>

            {/* Earnings Card */}
            <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-6 mb-6">
                <div className="flex justify-between items-center mb-1">
                    <p className="text-sm text-gray-400 font-medium">Thu nhập chuyến này</p>
                    <span className={`px-2 py-1 text-xs font-bold rounded-lg ${paymentMethod === 'CASH' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                        }`}>
                        {paymentMethod}
                    </span>
                </div>

                <p className="text-center text-4xl font-extrabold text-primary mb-2">
                    {Number(earnings).toLocaleString('vi-VN')}₫
                </p>

                {/* Status indicator */}
                <div className="flex justify-center mb-6">
                    <div className={`px-3 py-1 rounded-full text-xs font-medium border ${paymentStatus === 'PAID' ? 'bg-green-50 text-green-600 border-green-200' :
                        paymentStatus === 'PENDING' ? 'bg-yellow-50 text-yellow-600 border-yellow-200' :
                            paymentStatus === 'FAILED' ? 'bg-red-50 text-red-600 border-red-200' :
                                'bg-orange-50 text-orange-600 border-orange-200'
                        }`}>
                        {paymentStatus === 'PAID' ? 'Đã thanh toán / Xác nhận' :
                            paymentStatus === 'PENDING' ? 'Đang chờ xử lý...' :
                                paymentStatus === 'FAILED' ? 'Thanh toán thất bại' :
                                    'Chưa xác nhận'}
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                    <div className="text-center bg-gray-50 rounded-xl p-3">
                        <p className="text-xs text-gray-400">Khoảng cách</p>
                        <p className="font-bold text-gray-800">
                            {(() => {
                                const d = distance || ride?.actualDistanceKm || ride?.distanceKm || ride?.previewRoute?.distanceKm || ride?.tripRoute?.distanceKm;
                                return d !== undefined && d !== null && parseFloat(d) > 0
                                    ? `${parseFloat(d).toFixed(2)} km`
                                    : '--- km';
                            })()}
                        </p>
                    </div>
                    <div className="text-center bg-gray-50 rounded-xl p-3">
                        <p className="text-xs text-gray-400">Thời gian</p>
                        <p className="font-bold text-gray-800">{formatTime(elapsedTime)}</p>
                    </div>
                    <div className="text-center bg-gray-50 rounded-xl p-3">
                        <p className="text-xs text-gray-400">Loại xe</p>
                        <p className="font-bold text-gray-800">{ride?.vehicleType || 'CAR'}</p>
                    </div>
                </div>
            </div>

            {/* Actions */}
            <div className="w-full max-w-sm space-y-3 mt-4">
                {paymentMethod === 'CASH' && paymentStatus !== 'PAID' && (
                    <button
                        onClick={handleConfirmCash}
                        disabled={isConfirming}
                        className="w-full py-4 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 transition-colors shadow-lg disabled:opacity-70"
                    >
                        {isConfirming ? 'Đang xử lý...' : `Xác nhận đã thu ${Number(earnings).toLocaleString('vi-VN')}₫`}
                    </button>
                )}

                {(paymentMethod === 'WALLET' || paymentMethod === 'CARD') && paymentStatus !== 'PAID' && (
                    <div className="w-full py-4 bg-blue-50 text-blue-600 font-medium rounded-xl border border-blue-100 flex items-center justify-center gap-2">
                        <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                        Chờ khách hàng thanh toán...
                    </div>
                )}

                <button
                    onClick={() => navigate('/dashboard')}
                    disabled={paymentMethod === 'CASH' && paymentStatus === 'UNPAID'}
                    className={`w-full py-4 font-bold rounded-xl transition-colors shadow-lg ${paymentMethod === 'CASH' && paymentStatus === 'UNPAID'
                        ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                        : 'bg-primary text-white hover:bg-green-600 shadow-green-500/30'
                        }`}
                >
                    Tiếp tục nhận chuyến
                </button>
            </div>
        </div >
    );
}
