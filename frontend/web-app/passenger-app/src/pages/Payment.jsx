import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { bookingService, rideService } from '../services';
import socketService from '../services/socketService';
import toast from 'react-hot-toast';
import Button from '../components/Button';
import api from '../services/api';

export default function Payment() {
    const { rideId } = useParams();
    const navigate = useNavigate();
    const [fetching, setFetching] = useState(true);
    const [ride, setRide] = useState(null);
    const [rollbackInfo, setRollbackInfo] = useState(null);
    const [isRetrying, setIsRetrying] = useState(false);
    const [isSimulatingRollback, setIsSimulatingRollback] = useState(false);

    const enableRollbackDemo = import.meta.env.DEV;

    // Join ride room for real-time socket events
    useEffect(() => {
        // Ensure active ride is cleared since the ride is technically completed
        localStorage.removeItem('activeRideId');

        const token = localStorage.getItem('accessToken');
        if (token) {
            const socket = socketService.connect(token);
            if (socket.connected) {
                socketService.joinRide(rideId);
            } else {
                socket.on('connect', () => {
                    socketService.joinRide(rideId);
                });
            }
        }

        return () => {
            socketService.leaveRide(rideId);
        };
    }, [rideId]);

    useEffect(() => {
        const fetchRide = async () => {
            try {
                const response = await rideService.getRide(rideId);
                const data = response.data || response.ride || response;
                setRide(data);

                if (data?.status === 'FAILED') {
                    setRollbackInfo((prev) => prev || {
                        bookingId: data?.bookingId || null,
                        status: 'FAILED',
                        reason: data?.failureReason || 'Payment transaction failed',
                        verified: true,
                        receivedAt: new Date().toISOString(),
                    });
                }

                // If digital payment and success, redirect to rating
                if ((data.paymentMethod === 'WALLET' || data.paymentMethod === 'CARD') && data.paymentStatus === 'PAID') {
                    setTimeout(() => {
                        toast.success('Thanh toán thành công!');
                        navigate('/rating/' + rideId);
                    }, 500);
                }
                // If CASH and driver has confirmed, redirect to rating
                else if (data.paymentMethod === 'CASH' && data.paymentStatus === 'PAID') {
                    setTimeout(() => {
                        toast.success('Tài xế đã xác nhận!');
                        navigate('/rating/' + rideId);
                    }, 500);
                }
            } catch (error) {
                console.error('Failed to load ride:', error);
                toast.error('Không thể tải chi tiết chuyến đi');
            } finally {
                setFetching(false);
            }
        };

        fetchRide();
        const pollInterval = setInterval(fetchRide, 3000); // Poll every 3s

        return () => clearInterval(pollInterval);
    }, [rideId, navigate]);

    useEffect(() => {
        const currentBookingId = ride?.bookingId;

        // Listen for digital payment completion
        const handlePaymentCompleted = (data) => {
            console.log('📩 Received payment completed event:', data);
            if (data.rideId === rideId || data.ride_id === rideId) {
                console.log('✓ Payment completed:', data);
                setRide(prev => prev ? { ...prev, paymentStatus: 'PAID' } : prev);
                toast.success('Thanh toán thành công!');
                setTimeout(() => navigate('/rating/' + rideId), 1500);
            }
        };

        // Listen for ride payment failure (before compensation completes)
        const handlePaymentFailed = (data) => {
            if (data.rideId === rideId || data.ride_id === rideId) {
                console.log('✗ Payment failed:', data);
                setRide(prev => prev ? { ...prev, paymentStatus: 'FAILED' } : prev);
                toast.error('Thanh toán thất bại. Đang rollback chuyến đi...');
            }
        };

        // Listen for booking compensation result (official rollback proof)
        const handleBookingPaymentFailed = async (data) => {
            if (currentBookingId && data?.bookingId && data.bookingId !== currentBookingId) {
                return;
            }

            const reason = data?.reason || 'Payment transaction failed';
            console.log('⚠️ Booking rollback received:', data);

            setRide(prev => prev ? {
                ...prev,
                paymentStatus: 'FAILED',
                status: 'FAILED',
                failureReason: reason,
            } : prev);

            setRollbackInfo({
                bookingId: data?.bookingId || currentBookingId || null,
                status: data?.status || 'FAILED',
                reason,
                verified: false,
                receivedAt: new Date().toISOString(),
            });

            localStorage.removeItem('activeRideId');
            toast.error('Thanh toán thất bại. Hệ thống đã rollback chuyến đi.');

            if (data?.bookingId) {
                try {
                    const bookingResp = await bookingService.getBooking(data.bookingId);
                    const bookingData = bookingResp?.data || bookingResp?.booking || bookingResp;

                    if (bookingData?.status === 'FAILED') {
                        setRollbackInfo(prev => ({
                            ...(prev || {}),
                            bookingId: bookingData?._id || data.bookingId,
                            status: bookingData.status,
                            reason: bookingData.failureReason || reason,
                            verified: true,
                            receivedAt: prev?.receivedAt || new Date().toISOString(),
                        }));
                    }
                } catch (verifyError) {
                    console.warn('Cannot verify rollback booking state from API:', verifyError?.message || verifyError);
                }
            }
        };

        // Listen for cash confirmation
        const handleCashConfirmed = (data) => {
            if (data.rideId === rideId || data.ride_id === rideId) {
                console.log('✓ Cash confirmed:', data);
                setRide(prev => prev ? { ...prev, paymentStatus: 'PAID' } : prev);
                toast.success('Tài xế đã xác nhận tiền mặt!');
                setTimeout(() => navigate('/rating/' + rideId), 1500);
            }
        };

        socketService.socket?.on('ride.payment.completed', handlePaymentCompleted);
        socketService.socket?.on('ride:paymentCompleted', handlePaymentCompleted);
        socketService.socket?.on('ride.payment.failed', handlePaymentFailed);
        socketService.socket?.on('ride:paymentFailed', handlePaymentFailed);
        socketService.socket?.on('booking:paymentFailed', handleBookingPaymentFailed);
        socketService.socket?.on('ride.payment.cash-confirmed', handleCashConfirmed);

        return () => {
            socketService.socket?.off('ride.payment.completed', handlePaymentCompleted);
            socketService.socket?.off('ride:paymentCompleted', handlePaymentCompleted);
            socketService.socket?.off('ride.payment.failed', handlePaymentFailed);
            socketService.socket?.off('ride:paymentFailed', handlePaymentFailed);
            socketService.socket?.off('booking:paymentFailed', handleBookingPaymentFailed);
            socketService.socket?.off('ride.payment.cash-confirmed', handleCashConfirmed);
        };
    }, [rideId, navigate, ride?.bookingId]);


    if (fetching) return <div className="min-h-full h-full flex items-center justify-center box-border"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div></div>;

    const fare = ride?.finalFare || ride?.estimatedPrice || 0;
    const method = ride?.paymentMethod || 'CASH';
    const status = ride?.paymentStatus || 'UNPAID';
    const rollbackReason = rollbackInfo?.reason || ride?.failureReason || 'Payment transaction failed';
    const hasRollback = rollbackInfo?.status === 'FAILED' || ride?.status === 'FAILED';

    const isPaymentComplete = status === 'PAID' && !hasRollback;

    const handleRetry = async () => {
        if (hasRollback) {
            toast.error('Booking đã rollback. Vui lòng đặt chuyến mới.');
            return;
        }

        setIsRetrying(true);
        try {
            await api.post(`/api/payments/${rideId}/retry`);
            toast.success('Đã yêu cầu thử lại thanh toán');
            setRide(prev => prev ? { ...prev, paymentStatus: 'PENDING' } : prev);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Không thể thử lại thanh toán');
        } finally {
            setIsRetrying(false);
        }
    };

    const handleStartNewBooking = () => {
        localStorage.removeItem('activeRideId');
        navigate('/home', { replace: true });
    };

    const handleSimulateRollback = async () => {
        setIsSimulatingRollback(true);
        try {
            const response = await api.patch(`/api/rides/${rideId}/simulate-wallet`, {
                fail_simulation: true,
            });

            if (![200, 202, 402].includes(response.status)) {
                throw new Error(`Unexpected status ${response.status}`);
            }

            toast('Đã gửi mô phỏng lỗi thanh toán. Đang chờ rollback event...', { icon: '🧪' });
        } catch (error) {
            toast.error(error.response?.data?.message || 'Không thể mô phỏng payment failure');
        } finally {
            setIsSimulatingRollback(false);
        }
    };

    return (
        <div className="min-h-full h-full bg-gray-50 flex flex-col overflow-hidden box-border">
            <div className="bg-white p-6 shadow-sm z-10 flex-shrink-0">
                <h1 className="text-xl font-bold text-center">Thanh toán</h1>
            </div>

            <div className="flex-1 p-6 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                {/* Bill Summary */}
                <div className="bg-white p-6 rounded-2xl shadow-sm mb-6 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-400 to-purple-500"></div>

                    <div className="text-center mb-6">
                        <p className="text-gray-500 text-sm mb-1">Tổng tiền thanh toán</p>
                        <h2 className="text-4xl font-bold text-gray-800">
                            {fare.toLocaleString('vi-VN')}₫
                        </h2>
                    </div>

                    <div className="space-y-3">
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Loại xe</span>
                            <span className="font-medium px-2 bg-gray-100 rounded text-xs leading-5">{ride?.vehicleType || '---'}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Cước phí di chuyển</span>
                            <span className="font-medium">{fare.toLocaleString('vi-VN')}₫</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Phụ phí / Khuyến mãi</span>
                            <span className="font-medium">0₫</span>
                        </div>
                        <div className="border-t border-dashed my-2"></div>
                        <div className="flex justify-between font-bold text-lg">
                            <span>Tổng cộng</span>
                            <span className="text-primary">{fare.toLocaleString('vi-VN')}₫</span>
                        </div>
                    </div>
                </div>

                {/* Payment Status Info */}
                <h3 className="font-bold text-gray-800 mb-4">Phương thức thanh toán</h3>

                {hasRollback && (
                    <div id="payment-rollback-proof" className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <p className="text-sm font-bold text-red-700">Rollback đã kích hoạt</p>
                                <p className="text-xs text-red-600 mt-1">
                                    Booking {rollbackInfo?.bookingId ? `#${rollbackInfo.bookingId.slice(-6)}` : ''} đã được chuyển sang trạng thái FAILED.
                                </p>
                            </div>
                            <span className={`text-[10px] px-2 py-1 rounded-full font-semibold ${rollbackInfo?.verified ? 'bg-red-200 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                {rollbackInfo?.verified ? 'Đã xác minh API' : 'Đã nhận event'}
                            </span>
                        </div>
                        <p className="text-xs text-red-700 mt-3">
                            <span className="font-semibold">Lý do:</span> {rollbackReason}
                        </p>
                    </div>
                )}

                <div className="space-y-3 mb-8">
                    {method === 'CASH' && (
                        <div className={`w-full p-4 rounded-xl border-2 flex items-center gap-4 transition-all ${status === 'PAID'
                            ? 'border-green-300 bg-green-50'
                            : 'border-primary bg-blue-50'
                            }`}>
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl ${status === 'PAID' ? 'bg-green-100' : 'bg-blue-100'
                                }`}>💵</div>
                            <div className="flex-1 text-left">
                                <p className="font-semibold text-gray-800">Thanh toán bằng tiền mặt</p>
                                <div className="text-xs text-gray-600 mt-1 flex flex-col gap-1">
                                    {status === 'PAID' ? (
                                        <div className="text-green-600 font-medium flex items-center gap-2">
                                            <span>✓</span>
                                            <span>Tài xế đã xác nhận nhận tiền</span>
                                        </div>
                                    ) : (
                                        <div className="italic">
                                            Thanh toán trực tiếp cho tài xế. Chờ tài xế xác nhận...
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {(method === 'WALLET' || method === 'CARD') && (
                        <div className={`w-full p-4 rounded-xl border-2 flex items-center gap-4 transition-all ${status === 'PAID'
                            ? 'border-green-300 bg-green-50'
                            : status === 'FAILED'
                                ? 'border-red-300 bg-red-50'
                                : 'border-primary bg-blue-50'
                            }`}>
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl ${status === 'PAID'
                                ? 'bg-green-100'
                                : status === 'FAILED'
                                    ? 'bg-red-100'
                                    : 'bg-blue-100'
                                }`}>{method === 'WALLET' ? '💰' : '💳'}</div>
                            <div className="flex-1 text-left">
                                <p className="font-semibold text-gray-800">
                                    {method === 'WALLET' ? 'Thanh toán qua Ví CabGo' : 'Thanh toán qua Thẻ'}
                                </p>
                                <div className="text-xs mt-1 flex flex-col gap-1">
                                    {status === 'PENDING' ? (
                                        <div className="flex items-center gap-2 text-blue-600">
                                            <div className="animate-spin h-3 w-3 border-2 border-blue-400 border-t-blue-600 rounded-full"></div>
                                            <span>Hệ thống đang xử lý thanh toán...</span>
                                        </div>
                                    ) : status === 'FAILED' ? (
                                        <div className="flex flex-col gap-2 mt-1">
                                            <div className="text-red-600 font-medium">
                                                {hasRollback
                                                    ? '✗ Thanh toán thất bại. Chuyến đi đã được rollback.'
                                                    : '✗ Thanh toán thất bại. Vui lòng thử lại.'}
                                            </div>

                                            <div className="text-red-500 text-[11px]">
                                                {hasRollback ? `Lý do rollback: ${rollbackReason}` : 'Bạn có thể thử thanh toán lại.'}
                                            </div>

                                            {!hasRollback && (
                                                <Button
                                                    id="retry-payment-btn"
                                                    variant="primary"
                                                    onClick={handleRetry}
                                                    loading={isRetrying}
                                                    className="py-2 text-sm w-full"
                                                >
                                                    Thử lại thanh toán
                                                </Button>
                                            )}
                                        </div>
                                    ) : status === 'PAID' ? (
                                        <div className="text-green-600 font-medium flex items-center gap-2">
                                            <span>✓</span>
                                            <span>Thanh toán thành công</span>
                                        </div>
                                    ) : null}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {enableRollbackDemo && (method === 'WALLET' || method === 'CARD') && !hasRollback && (
                    <div className="mb-8 rounded-xl border border-amber-200 bg-amber-50 p-4">
                        <p className="text-xs font-semibold text-amber-700 mb-2">Demo rollback (DEV)</p>
                        <Button
                            id="simulate-rollback-btn"
                            variant="danger"
                            onClick={handleSimulateRollback}
                            loading={isSimulatingRollback}
                            className="w-full py-2 text-sm"
                        >
                            Mô phỏng payment failure + rollback
                        </Button>
                        <p className="text-[11px] text-amber-700 mt-2">
                            Dùng để chứng minh UI nhận event <code>booking:paymentFailed</code> và cập nhật trạng thái rollback.
                        </p>
                    </div>
                )}
            </div>

            <div className="p-6 bg-white border-t safe-area-bottom">
                <Button
                    id="payment-main-action-btn"
                    variant={hasRollback ? 'danger' : 'primary'}
                    disabled={!hasRollback && !isPaymentComplete}
                    onClick={hasRollback ? handleStartNewBooking : () => navigate('/rating/' + rideId)}
                    className="w-full py-4 text-lg shadow-lg"
                >
                    {hasRollback
                        ? 'Đặt chuyến mới'
                        : isPaymentComplete
                            ? 'Đánh giá chuyến đi'
                            : (method === 'WALLET' || method === 'CARD')
                                ? 'Chờ thanh toán hoàn tất...'
                                : 'Chờ tài xế xác nhận...'}
                </Button>
            </div>
        </div>
    );
}

