import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import socketService from '../services/socketService';
import rideService from '../services/rideService';
import driverService from '../services/driverService';
import bookingService from '../services/bookingService';
import api from '../services/api';
import MapView from '../components/MapView';
import StatusToggle from '../components/StatusToggle';
import RideRequestCard from '../components/RideRequestCard';
import toast from 'react-hot-toast';
import { useRide } from '../contexts/RideContext';
import { resolveRouteFromState } from '../utils/navigationUtils';

export default function Dashboard() {
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const { isConnected } = useSocket();

    const [isOnline, setIsOnline] = useState(false);
    const [statusLoading, setStatusLoading] = useState(false);
    const [driverProfile, setDriverProfile] = useState(null);
    const [userProfile, setUserProfile] = useState(null);
    const [driverPosition, setDriverPosition] = useState(null);
    const [incomingRide, setIncomingRide] = useState(null);
    const [accepting, setAccepting] = useState(false);
    const [todayEarnings, setTodayEarnings] = useState(0);
    const [todayTrips, setTodayTrips] = useState(0);
    const [countdown, setCountdown] = useState(0);
    const countdownRef = useRef(null);

    const { currentRide, fetchRide, clearRide } = useRide();

    // Get current geolocation
    useEffect(() => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    setDriverPosition([pos.coords.latitude, pos.coords.longitude]);
                },
                () => {
                    // Default HCM if denied
                    setDriverPosition([10.7769, 106.7009]);
                }
            );
        } else {
            setDriverPosition([10.7769, 106.7009]);
        }
    }, []);




    // Send location periodically when online
    useEffect(() => {
        if (!isOnline || !driverPosition) return;

        const interval = setInterval(() => {
            socketService.sendLocation(driverPosition[0], driverPosition[1]);
        }, 10000); // Every 10s

        // Send immediately
        socketService.sendLocation(driverPosition[0], driverPosition[1]);

        return () => clearInterval(interval);
    }, [isOnline, driverPosition]);

    // ── Clear countdown timer ──
    const clearCountdown = useCallback(() => {
        if (countdownRef.current) {
            clearInterval(countdownRef.current);
            countdownRef.current = null;
        }
        setCountdown(0);
    }, []);

    // ── Start countdown timer ──
    const startCountdown = useCallback((ms) => {
        clearCountdown();
        const seconds = Math.ceil(ms / 1000);
        setCountdown(seconds);
        countdownRef.current = setInterval(() => {
            setCountdown(prev => {
                if (prev <= 1) {
                    clearCountdown();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    }, [clearCountdown]);

    // ── Auto-reject when countdown reaches 0 ──
    useEffect(() => {
        if (countdown === 0 && incomingRide && !accepting) {
            // Countdown expired — auto-reject (server also handles timeout)
            console.log('⏰ Countdown expired, auto-dismissing');
            setIncomingRide(null);
            clearCountdown();
        }
    }, [countdown, incomingRide, accepting, clearCountdown]);

    // ── Listen for booking offers (sequential matching) ──
    useEffect(() => {
        const handleBookingOffer = (data) => {
            console.log('🔔 Booking offer received:', data);
            setIncomingRide(data);
            startCountdown(data.timeoutMs || 10000);
            toast('🔔 Có chuyến mới!', {
                icon: '🚗',
                style: { background: '#10B981', color: '#fff', fontWeight: 'bold' },
                duration: 3000,
            });
        };

        const handleBookingCancelled = (data) => {
            console.log('❌ Booking cancelled:', data);
            if (incomingRide && data.bookingId === incomingRide.bookingId) {
                setIncomingRide(null);
                clearCountdown();
                toast.error('Khách đã hủy chuyến');
            }
        };

        const handleBookingConfirmed = (data) => {
            console.log('✅ Booking confirmed, creating ride:', data);
            clearCountdown();
            // Booking accepted and confirmed by server — now create ride
            handleCreateRide(data);
        };

        socketService.onBookingOffer(handleBookingOffer);
        socketService.onBookingCancelled(handleBookingCancelled);
        socketService.onBookingConfirmed(handleBookingConfirmed);

        return () => {
            socketService.offBookingOffer(handleBookingOffer);
            socketService.offBookingCancelled(handleBookingCancelled);
            socketService.offBookingConfirmed(handleBookingConfirmed);
        };
    }, [incomingRide, clearCountdown, startCountdown]);

    // Toggle online/offline status
    const handleToggleStatus = async () => {
        if (!driverProfile) {
            toast.error('Chưa có hồ sơ tài xế. Vui lòng tạo hồ sơ trước.');
            return;
        }

        try {
            setStatusLoading(true);
            const newStatus = !isOnline;
            await driverService.updateStatus(driverProfile.id, newStatus);
            setIsOnline(newStatus);

            if (newStatus && driverPosition) {
                await driverService.updateLocation(
                    driverProfile.id,
                    driverPosition[0],
                    driverPosition[1]
                );
            }

            toast.success(newStatus ? '✅ Bạn đang online!' : '⏸️ Đã chuyển offline');
        } catch (err) {
            console.error('Toggle status error:', err);
            toast.error('Không thể cập nhật trạng thái');
        } finally {
            setStatusLoading(false);
        }
    };

    // Load driver profile and stats
    useEffect(() => {
        const loadProfileAndStats = async () => {
            if (!user?.id) return;
            try {
                // Fetch basic user profile for name
                const userRes = await api.get(`/api/users/${user.id}`);
                if (userRes.data?.data) {
                    setUserProfile(userRes.data.data);
                }

                // Fetch driver profile for rating and status
                const data = await driverService.getMyProfile();
                const profile = data?.data || data;
                setDriverProfile(profile);

                // Khi đăng nhập/mở app: luôn bắt đầu ở trạng thái OFFLINE
                // Tài xế phải chủ động bật Online khi sẵn sàng nhận chuyến
                const hasForcedOffline = sessionStorage.getItem('hasForcedOffline');
                if (!hasForcedOffline) {
                    if (profile?.id && profile?.is_available) {
                        await driverService.updateStatus(profile.id, false);
                    }
                    setIsOnline(false);
                    sessionStorage.setItem('hasForcedOffline', 'true');
                } else {
                    // Nếu đã vào app rồi, giữ nguyên trạng thái đang có trên server
                    setIsOnline(profile?.is_available || false);
                }

                // Fetch today's stats — use user.id because ride-service stores driverId as userId
                if (user?.id) {
                    const ridesRes = await api.get(`/api/rides/driver/${user.id}`);
                    const rides = ridesRes.data?.data || ridesRes.data || [];

                    const today = new Date();
                    today.setHours(0, 0, 0, 0);

                    const completedToday = rides.filter(r =>
                        r.status === 'COMPLETED' &&
                        r.completedAt &&
                        new Date(r.completedAt) >= today
                    );

                    setTodayTrips(completedToday.length);
                    const earnings = completedToday.reduce((sum, ride) => sum + (Number(ride.finalFare) || 0), 0);
                    setTodayEarnings(earnings);
                }

            } catch (err) {
                console.log('No driver profile yet, need to create one', err);
            }
        };
        loadProfileAndStats();
    }, [user, location.key]); // Trigger reload when returning to dashboard

    // ── Accept offer via socket (sequential matching) ──
    const handleAcceptRide = async () => {
        if (!incomingRide) return;
        setAccepting(true);
        clearCountdown();

        try {
            // Send accept via socket → booking-service handles atomic update
            socketService.acceptOffer(incomingRide.bookingId);
            toast.success('Đang xác nhận...');
            // The actual ride creation happens when we receive booking:confirmed
        } catch (err) {
            console.error('Accept offer error:', err);
            toast.error('Không thể nhận chuyến');
            setAccepting(false);
        }
    };

    // ── Create ride after booking:confirmed ──
    const handleCreateRide = async (confirmedData) => {
        try {
            // Fetch passengerId from confirmed data or booking
            let pId = confirmedData.passengerId;
            if (!pId) {
                const bookingData = await bookingService.getBooking(confirmedData.bookingId);
                const booking = bookingData.data || bookingData;
                pId = booking.passengerId || booking.userId;
            }

            if (!pId) {
                toast.error('Lỗi: Không tìm thấy ID hành khách');
                setAccepting(false);
                return;
            }

            // Create ride record via ride-service
            const response = await rideService.acceptRide(
                confirmedData.bookingId,
                pId,
                user.id,
                { lat: driverPosition[0], lng: driverPosition[1] }
            );

            socketService.joinRide(confirmedData.bookingId);
            toast.success('Đã nhận chuyến!');

            let acceptedRide = response;
            if (response.success && response.data) {
                acceptedRide = response.data;
            } else if (response.data) {
                acceptedRide = response.data;
            }

            if (!acceptedRide || !acceptedRide._id) {
                console.error("CRITICAL: Ride ID missing in response!", response);
                toast.error("Lỗi: Không nhận được ID chuyến đi");
                return;
            }

            localStorage.setItem('driverActiveRideId', acceptedRide._id);
            
            // Critical: Update the context before navigating so ActiveRideGuard doesn't kick us out
            await fetchRide(acceptedRide._id);
            
            navigate('/pickup', {
                state: {
                    ride: acceptedRide,
                    bookingId: confirmedData.bookingId,
                    driverPosition,
                }
            });
        } catch (err) {
            console.error('Create ride error:', err);
            toast.error('Không thể tạo chuyến: ' + (err.response?.data?.message || err.message));
        } finally {
            setAccepting(false);
            setIncomingRide(null);
        }
    };

    // ── Reject offer via socket ──
    const handleRejectRide = () => {
        if (incomingRide) {
            socketService.rejectOffer(incomingRide.bookingId);
        }
        setIncomingRide(null);
        clearCountdown();
        toast('Đã từ chối chuyến', { icon: '❌' });
    };

    const handleLogout = async () => {
        try {
            if (isOnline) {
                await driverService.updateStatus(driverProfile.id, false);
            }
        } catch (err) {
            console.error('Failed to set offline on logout', err);
        } finally {
            clearRide();
            await logout();
            navigate('/login', { replace: true });
        }
    };

    return (
        <div className="relative h-full w-full flex flex-col bg-gray-100 overflow-hidden box-border">
            {/* Full-screen Map */}
            <div className="absolute inset-0 z-0">
                <MapView driverPosition={driverPosition} />
            </div>

            {/* Top Bar */}
            <div className="absolute top-0 left-0 right-0 z-10 p-4">
                <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-lg p-4 animate-slideDown">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                                <span className="text-xl">🚗</span>
                            </div>
                            <div>
                                <h2 className="font-bold text-gray-800 text-sm">
                                    {userProfile ? `Xin chào, ${userProfile.fullName}` : 'Xin chào, Tài xế'}
                                </h2>
                                <div className="flex items-center gap-2 mt-0.5">
                                    <div className="flex items-center gap-1.5">
                                        <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`}></div>
                                        <span className="text-xs text-gray-400">
                                            {isConnected ? 'Đã kết nối' : 'Mất kết nối'}
                                        </span>
                                    </div>
                                    {driverProfile?.rating_avg && (
                                        <>
                                            <span className="text-xs text-gray-300">•</span>
                                            <div className="flex items-center gap-1 bg-yellow-50 px-1.5 py-0.5 rounded text-xs font-semibold text-yellow-700">
                                                <span>⭐</span>
                                                <span>{Number(driverProfile.rating_avg).toFixed(1)}</span>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => navigate('/history')}
                                className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors"
                                title="Lịch sử"
                            >
                                <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </button>
                            <button
                                onClick={() => navigate('/profile')}
                                className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors"
                                title="Hồ sơ"
                            >
                                <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zm-4 7a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                            </button>
                            {/* <button
                                onClick={handleLogout}
                                className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center hover:bg-red-50 hover:text-red-500 transition-colors"
                                title="Đăng xuất"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                </svg>
                            </button> */}
                        </div>
                    </div>

                    <StatusToggle
                        isOnline={isOnline}
                        onToggle={handleToggleStatus}
                        loading={statusLoading}
                    />

                    {/* Active Ride Banner */}
                    {currentRide && !['COMPLETED', 'CANCELLED', 'NO_DRIVER_FOUND', 'FAILED', 'PAYMENT_FAILED', 'CANCELLED_BY_DRIVER'].includes(currentRide.status) && (
                        <div 
                            className="mt-4 bg-blue-50 border border-blue-200 rounded-xl p-3 shadow-sm flex items-center justify-between cursor-pointer hover:bg-blue-100 transition-colors" 
                            onClick={() => {
                                const route = resolveRouteFromState(currentRide.status, 'DRIVER', currentRide._id || currentRide.id);
                                if (route) navigate(route);
                            }}
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xl">
                                    🚗
                                </div>
                                <div>
                                    <h3 className="font-bold text-blue-800 text-sm">Bạn đang có chuyến đi</h3>
                                    <p className="text-xs text-blue-600">Nhấn để quay lại màn hình chuyến đi</p>
                                </div>
                            </div>
                            <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </div>
                    )}
                </div>
            </div>

            {/* Income Widget (bottom-right floating) Ensure it's above the bottom sheet */}
            <div className="absolute bottom-[200px] right-4 z-10 transition-all duration-300">
                <div className="bg-white/95 backdrop-blur-md rounded-xl shadow-lg px-4 py-3 border border-gray-100">
                    <p className="text-xs text-gray-400 font-medium">Hôm nay</p>
                    <p className="text-lg font-bold text-gray-800">
                        {todayEarnings.toLocaleString('vi-VN')}₫
                    </p>
                    <p className="text-xs text-gray-400">{todayTrips} chuyến</p>
                </div>
            </div>

            {/* Bottom Sheet - Incoming Ride or Status */}
            <div className="absolute bottom-0 left-0 right-0 z-20 px-4 pb-6">
                {incomingRide ? (
                    <RideRequestCard
                        ride={incomingRide}
                        onAccept={handleAcceptRide}
                        onReject={handleRejectRide}
                        accepting={accepting}
                        countdown={countdown}
                    />
                ) : (
                    <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-bottom-sheet p-5 text-center">
                        {isOnline ? (
                            <>
                                <div className="flex items-center justify-center gap-2 mb-1">
                                    <span className="relative flex h-3 w-3">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
                                    </span>
                                    <span className="font-semibold text-gray-800">Đang chờ chuyến...</span>
                                </div>
                                <p className="text-sm text-gray-400">
                                    Chúng tôi sẽ thông báo khi có khách đặt xe gần bạn
                                </p>
                            </>
                        ) : (
                            <>
                                <p className="font-semibold text-gray-600 mb-1">Bạn đang ngoại tuyến</p>
                                <p className="text-sm text-gray-400">
                                    Bật trạng thái hoạt động để bắt đầu nhận chuyến
                                </p>
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
