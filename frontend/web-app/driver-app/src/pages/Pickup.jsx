import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import socketService from '../services/socketService';
import rideService from '../services/rideService';
import api from '../services/api';
import MapView from '../components/MapView';
import toast from 'react-hot-toast';
import { useRide } from '../contexts/RideContext';

export default function Pickup() {
    const navigate = useNavigate();
    const location = useLocation();

    const { currentRide: ride, loading, clearRide, updateRideState } = useRide();
    const { bookingId, driverPosition: initialDriverPos } = location.state || {};

    const [driverPosition, setDriverPosition] = useState(initialDriverPos || [10.7769, 106.7009]);
    const [arrived, setArrived] = useState(ride?.status === 'ARRIVED');
    const [arrivedLoading, setArrivedLoading] = useState(false);
    const [routeCoords, setRouteCoords] = useState(null);
    const [realtimeDistance, setRealtimeDistance] = useState(null);
    const [realtimeEta, setRealtimeEta] = useState(null);
    const [isExpanded, setIsExpanded] = useState(false);

    const [passenger, setPassenger] = useState({
        name: ride?.user?.name || ride?.passenger?.name || ride?.passengerName || 'Khách hàng',
        avatar: ride?.user?.avatar || ride?.passenger?.avatar || null
    });



    useEffect(() => {
        if (ride?.passengerId && passenger.name === 'Khách hàng') {
            api.get(`/api/users/${ride.passengerId}`)
                .then(res => {
                    const data = res.data?.data || res.data;
                    if (data && data.name) {
                        setPassenger({ name: data.name, avatar: data.avatar || null });
                    }
                })
                .catch(err => console.error('Failed to fetch passenger profile:', err));
        }
    }, [ride?.passengerId, passenger.name]);

    // Sync arrived state with ride status (e.g. on back navigation or socket update)
    useEffect(() => {
        if (ride?.status === 'ARRIVED' && !arrived) {
            setArrived(true);
        }
    }, [ride?.status, arrived]);

    // Simulation state
    const [isSimulating, setIsSimulating] = useState(false);
    const simulationIntervalRef = useRef(null);
    const simulationStepRef = useRef(0);

    // Pickup marker only — dropoff NOT revealed until Stage 4
    const pickupCoords = useMemo(() => {
        return ride?.pickup ? [ride.pickup.lat, ride.pickup.lng] : null;
    }, [ride?.pickup]);

    // Real GPS tracking — paused during simulation
    useEffect(() => {
        if (!navigator.geolocation || isSimulating) return;

        const watchId = navigator.geolocation.watchPosition(
            (pos) => {
                const newPos = [pos.coords.latitude, pos.coords.longitude];
                setDriverPosition(newPos);
                socketService.sendLocation(pos.coords.latitude, pos.coords.longitude, 0, 0, ride?._id);
            },
            () => {
                // silently use default if denied
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
        );

        return () => navigator.geolocation.clearWatch(watchId);
    }, [isSimulating, ride?._id]);

    // STAGE 2: Load driverToPickupRoute – only this route, never previewRoute
    useEffect(() => {
        if (ride?.driverToPickupRoute?.polyline?.length > 0) {
            setRouteCoords(ride.driverToPickupRoute.polyline);
            console.log('✅ Using driverToPickupRoute from accepted ride:', ride.driverToPickupRoute.polyline.length, 'points');
        } else if (ride?._id) {
            console.warn('driverToPickupRoute missing, fetching from API...', ride?._id);
            rideService.getRide(ride._id).then(response => {
                const freshRide = response?.data || response;
                if (freshRide?.driverToPickupRoute?.polyline?.length > 0) {
                    setRouteCoords(freshRide.driverToPickupRoute.polyline);
                    updateRideState(freshRide);
                    console.log('✅ driverToPickupRoute fetched from API');
                } else {
                    console.warn('⚠️ driverToPickupRoute not available yet');
                }
            }).catch(err => console.error('Failed to fetch ride for route:', err));
        }
    }, [ride?._id]);

    // Calculate Real-time Distance and ETA toward pickup
    useEffect(() => {
        if (driverPosition && pickupCoords) {
            const getDistance = (lat1, lon1, lat2, lon2) => {
                const R = 6371e3; // metres
                const phi1 = lat1 * Math.PI / 180;
                const phi2 = lat2 * Math.PI / 180;
                const deltaPhi = (lat2 - lat1) * Math.PI / 180;
                const deltaLambda = (lon2 - lon1) * Math.PI / 180;
                const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
                    Math.cos(phi1) * Math.cos(phi2) *
                    Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
                const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                return R * c;
            };
            const distMeters = getDistance(driverPosition[0], driverPosition[1], pickupCoords[0], pickupCoords[1]);
            setRealtimeDistance(distMeters);

            // ETA based on 30km/h (500m/min)
            const estMinutes = Math.max(1, Math.ceil(distMeters / 500));
            setRealtimeEta(estMinutes);
        }
    }, [driverPosition, pickupCoords]);

    // Cleanup simulation on unmount
    useEffect(() => {
        return () => {
            if (simulationIntervalRef.current) {
                clearInterval(simulationIntervalRef.current);
            }
        };
    }, []);

    // Listen for passenger cancellation
    useEffect(() => {
        const handleCancelled = (data) => {
            console.log('❌ Ride/Booking cancelled by passenger:', data);
            // Stop simulation if running
            if (simulationIntervalRef.current) {
                clearInterval(simulationIntervalRef.current);
                simulationIntervalRef.current = null;
            }
            setIsSimulating(false);

            // Leave ride room
            if (bookingId) socketService.leaveRide(bookingId);

            toast.error('Khách đã hủy chuyến!', { duration: 4000, icon: '❌' });
            localStorage.removeItem('driverActiveRideId');
            localStorage.removeItem('driverRideState');
            navigate('/dashboard');
        };

        socketService.onBookingCancelled(handleCancelled);
        socketService.onRideCancelled(handleCancelled);

        return () => {
            socketService.offBookingCancelled(handleCancelled);
            socketService.offRideCancelled(handleCancelled);
        };
    }, [bookingId, navigate]);

    // ── Simulation ──────────────────────────────────────────────────
    const handleSimulate = () => {
        if (!routeCoords || routeCoords.length === 0) {
            toast.error('Chưa có tuyến đường để mô phỏng. Đợi route tải xong.');
            return;
        }

        if (isSimulating) {
            // Stop
            clearInterval(simulationIntervalRef.current);
            simulationIntervalRef.current = null;
            setIsSimulating(false);
            toast('⏹ Dừng mô phỏng', { icon: '🛑' });
            return;
        }

        // Start from driver's current position in polyline (step 0)
        simulationStepRef.current = 0;
        setIsSimulating(true);
        toast.success('🚗 Bắt đầu mô phỏng di chuyển tới điểm đón');

        const totalSteps = routeCoords.length;

        simulationIntervalRef.current = setInterval(() => {
            const step = simulationStepRef.current;

            if (step >= totalSteps) {
                // Reached pickup
                clearInterval(simulationIntervalRef.current);
                simulationIntervalRef.current = null;
                setIsSimulating(false);
                toast.success('📍 Mô phỏng: Đã tới điểm đón!');
                return;
            }

            const [lat, lng] = routeCoords[step];

            // Update local driver marker
            setDriverPosition([lat, lng]);

            // Broadcast to socket → passenger sees movement in real-time
            socketService.sendLocation(lat, lng, 0, 30, ride?._id); // 30km/h simulated

            simulationStepRef.current = step + 1;
        }, 400); // 400ms per step → smooth movement
    };

    // ── Stage 3: Arrived ─────────────────────────────────────────────
    const handleArrived = async () => {
        if (!ride?._id) {
            toast.error('Không tìm thấy ID chuyến đi!');
            return;
        }

        // Stop simulation if still running
        if (isSimulating) {
            clearInterval(simulationIntervalRef.current);
            simulationIntervalRef.current = null;
            setIsSimulating(false);
        }

        try {
            setArrivedLoading(true);
            await rideService.arriveRide(ride._id);
            setArrived(true);
            updateRideState({ ...ride, status: 'ARRIVED' });
            toast.success('✅ Đã tới điểm đón! Chờ khách lên xe.');
        } catch (error) {
            console.error('Arrive error:', error);
            toast.error('Lỗi xác nhận đã tới: ' + (error.response?.data?.message || error.message));
        } finally {
            setArrivedLoading(false);
        }
    };

    // ── Stage 4: Start Ride ───────────────────────────────────────────
    const handleStartRide = async () => {
        if (!ride?._id) {
            toast.error('Không tìm thấy ID chuyến đi!');
            return;
        }

        try {
            const loadingId = toast.loading('Đang bắt đầu chuyến đi...');
            const response = await rideService.startRide(ride._id);
            toast.dismiss(loadingId);

            const startedRide = response?.data || response;

            if (startedRide?._id) {
                toast.success('🚀 Chuyến đi bắt đầu!');
                // Update context so Guard knows the new status and automatically redirects
                updateRideState(startedRide);
            } else {
                toast.error('Lỗi: Không nhận được dữ liệu chuyến đi');
            }
        } catch (error) {
            console.error('Start ride error:', error);
            toast.dismiss();
            toast.error('Lỗi bắt đầu chuyến: ' + (error.response?.data?.message || error.message));
        }
    };

    const handleCancel = async () => {
        if (simulationIntervalRef.current) clearInterval(simulationIntervalRef.current);
        try {
            const rideId = ride?.id || ride?._id;
            if (rideId) {
                await rideService.driverCancelRide(rideId);
            }
        } catch (err) {
            console.error('Driver cancel API failed:', err);
        }
        clearRide();
        toast.error('Đã hủy chuyến đi', { id: 'cancel_ride' });
        navigate('/dashboard', { replace: true });
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-gray-500 font-medium">Đang tải thông tin chuyến đi...</p>
            </div>
        );
    }

    if (!ride) return null;

    return (
        <div className="relative h-full w-full flex flex-col overflow-hidden box-border">
            {/* Map — Stage 2: driver + pickup marker + driverToPickupRoute only */}
            <div className="absolute inset-0 z-0">
                <MapView
                    driverPosition={driverPosition}
                    pickupPosition={pickupCoords}
                    routeCoords={routeCoords}
                // ⛔ NO dropoffPosition — revealed only in Stage 4 (InProgress)
                />
            </div>

            {/* Back Button (Small) */}
            <div className="absolute top-4 left-4 z-10 pointer-events-auto">
                <button
                    onClick={() => navigate('/dashboard')}
                    className="w-10 h-10 bg-white rounded-full shadow-md flex items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors"
                >
                    <svg className="w-6 h-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                </button>
                {/* Simulation indicator */}
                {isSimulating && (
                    <span className="absolute top-1 right-[-45px] text-[10px] bg-red-100 text-red-700 font-bold px-2 py-1 rounded-full animate-pulse shadow-sm">
                        SIM
                    </span>
                )}
            </div>

            {/* Bottom Sheet - Collapsible */}
            <div
                className={`w-full absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-[0_-5px_20px_rgba(0,0,0,0.1)] p-6 z-20 flex flex-col box-border transition-all duration-300 ease-in-out cursor-pointer pointer-events-auto ${isExpanded ? 'h-auto' : ''}`}
                onClick={() => !isExpanded && setIsExpanded(true)}
            >
                {/* Drag handle */}
                <div
                    className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mb-4 hover:bg-gray-400 transition-colors shrink-0"
                    onClick={(e) => {
                        e.stopPropagation();
                        setIsExpanded(!isExpanded);
                    }}
                ></div>

                {/* Compact View: Status, ETA, Distance (Always Visible) */}
                <div className="flex items-center justify-between mb-2 p-4 bg-blue-50/80 rounded-2xl border border-blue-100 shrink-0">
                    <div className="flex-1 min-w-0 pr-4">
                        <p className="text-blue-600 text-[10px] uppercase font-bold tracking-wider mb-1">TRẠNG THÁI</p>
                        <p className="font-bold text-gray-900 text-base line-clamp-2 leading-tight">
                            {arrived ? 'Đã tới điểm đón' : 'Đang đến điểm đón'}
                        </p>
                    </div>

                    {(realtimeDistance !== null && realtimeEta !== null) ? (
                        <div className="text-right flex flex-col items-end shrink-0 pl-4 border-l border-blue-200/60">
                            <div className="flex items-end gap-1 text-blue-700">
                                <span className="font-bold text-2xl leading-none">{realtimeEta}</span>
                                <span className="text-sm font-semibold mb-0.5">phút</span>
                            </div>
                            <p className="text-xs font-medium text-gray-500 mt-1.5">
                                Khoảng cách: <span className="text-gray-700 font-bold">{realtimeDistance < 1000 ? `${Math.round(realtimeDistance)}m` : `${(realtimeDistance / 1000).toFixed(1)}km`}</span>
                            </p>
                        </div>
                    ) : (
                        <div className="text-right shrink-0 pl-4 border-l border-blue-200/60">
                            <p className="font-bold text-gray-900 text-xl">--</p>
                        </div>
                    )}
                </div>

                {/* Expanded View: Passenger Details & Secondary Info */}
                <div className={`transition-all duration-300 ease-in-out overflow-hidden ${isExpanded ? 'max-h-[400px] opacity-100 mt-4' : 'max-h-0 opacity-0 mt-0'}`}>
                    <div className="flex items-center gap-4 mb-6">
                        <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center text-xl shrink-0 overflow-hidden shadow-sm border border-gray-200">
                            {passenger.avatar ? (
                                <img src={passenger.avatar} alt="Passenger" className="w-full h-full object-cover" />
                            ) : (
                                <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(passenger.name)}&background=random`} alt="Passenger" className="w-full h-full object-cover" />
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <h2 className="text-lg font-bold text-gray-900 truncate">{passenger.name}</h2>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs text-gray-700 font-semibold bg-gray-100 px-2 py-0.5 rounded border border-gray-200">{ride.vehicleType || 'ECONOMY'}</span>
                            </div>
                        </div>
                        {(ride.estimatedPrice || ride.fare) && (
                            <div className="text-right shrink-0">
                                <p className="text-[10px] text-gray-400 font-medium uppercase mb-0.5 tracking-wide">Thu tiền mặt</p>
                                <p className="font-bold text-green-600 text-lg">
                                    {`${Number(ride.fare || ride.estimatedPrice).toLocaleString('vi-VN')}₫`}
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Address Detail in Expanded View */}
                    <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 mb-4">
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1">Điểm đón khách</p>
                        <p className="text-sm font-semibold text-gray-800">{ride.pickup?.address || 'Đang tải...'}</p>
                    </div>

                    {/* Simulate + Cancel row only visible when expanded to save space */}
                    {!arrived && (
                        <div className="grid grid-cols-2 gap-3 mt-2">
                            <button
                                onClick={handleCancel}
                                className="flex-1 py-3 bg-red-50 text-red-600 font-semibold rounded-xl hover:bg-red-100 transition-colors border border-red-100 text-sm"
                            >
                                Hủy chuyến
                            </button>

                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleSimulate();
                                }}
                                disabled={!routeCoords}
                                className={`flex-1 py-3 font-semibold rounded-xl transition-all text-sm border ${isSimulating
                                    ? 'bg-orange-100 text-orange-700 border-orange-200 animate-pulse'
                                    : 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100'
                                    } disabled:opacity-40 disabled:cursor-not-allowed`}
                            >
                                {isSimulating ? '⏹ Dừng SIM' : '🎮 Chạy giả lập'}
                            </button>
                        </div>
                    )}
                </div>

                {/* Indicator when compact */}
                {!isExpanded && (
                    <div className="text-center mt-3 mb-1">
                        <p className="text-[10px] text-gray-400 font-medium tracking-wide uppercase">Chạm để xem chi tiết</p>
                    </div>
                )}

                {/* Primary Action Button (Always Visible) */}
                <div className="mt-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                    {!arrived ? (
                        <button
                            onClick={handleArrived}
                            disabled={arrivedLoading}
                            className="w-full py-3.5 bg-blue-500 text-white font-bold rounded-xl hover:bg-blue-600 transition-all shadow-md active:scale-[0.98] text-base flex items-center justify-center gap-2"
                        >
                            📍 {arrivedLoading ? 'Đang xử lý...' : 'Đã tới điểm đón khách'}
                        </button>
                    ) : (
                        <button
                            onClick={handleStartRide}
                            className="w-full py-3.5 bg-green-500 text-white font-bold rounded-xl hover:bg-green-600 transition-all shadow-md active:scale-[0.98] text-base flex items-center justify-center gap-2"
                        >
                            🚀 Bắt đầu chuyến đi
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
