import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import socketService from '../services/socketService';
import MapView from '../components/MapView';
import api from '../services/api';
import rideService from '../services/rideService';
import toast from 'react-hot-toast';
import { useRide } from '../contexts/RideContext';

export default function InProgress() {
    const navigate = useNavigate();
    const { id } = useParams();
    const location = useLocation();

    const { currentRide: ride, loading, clearRide, updateRideState } = useRide();
    const { bookingId, driverPosition: initialPos } = location.state || {};

    const [driverPosition, setDriverPosition] = useState(initialPos || [10.7769, 106.7009]);
    const [elapsedTime, setElapsedTime] = useState(0);
    const [trackedDistanceKm, setTrackedDistanceKm] = useState(0);
    const [lastPosition, setLastPosition] = useState(initialPos || [10.7769, 106.7009]);
    const [distance, setDistance] = useState(0);
    const [routeCoords, setRouteCoords] = useState(null);

    const rideId = id || bookingId;
    const dropoffCoords = useMemo(() => {
        return ride?.dropoff ? [ride.dropoff.lat, ride.dropoff.lng] : null;
    }, [ride?.dropoff]);

    const [realtimeDistance, setRealtimeDistance] = useState(null);
    const [realtimeEta, setRealtimeEta] = useState(null);
    const [isExpanded, setIsExpanded] = useState(false);

    const [isSimulating, setIsSimulating] = useState(false);
    const [simulationCreate, setSimulationInterval] = useState(null);

    // Join ride room and set active ride
    useEffect(() => {
        if (rideId) {
            socketService.joinRide(rideId);
        }
        return () => {
            if (rideId) socketService.leaveRide(rideId);
        };
    }, [rideId]);

    // Listen for passenger cancellation
    useEffect(() => {
        const handleCancelled = (data) => {
            console.log('❌ Ride cancelled by passenger:', data);
            // Stop simulation if running
            if (simulationCreate) {
                clearInterval(simulationCreate);
                setSimulationInterval(null);
            }
            setIsSimulating(false);

            // Leave ride room
            if (rideId) socketService.leaveRide(rideId);

            toast.error('Khách đã hủy chuyến!', { duration: 4000, icon: '❌' });
            localStorage.removeItem('driverActiveRideId');
            localStorage.removeItem('driverRideState');
            navigate('/dashboard');
        };

        socketService.onRideCancelled(handleCancelled);
        socketService.onBookingCancelled(handleCancelled);

        return () => {
            socketService.offRideCancelled(handleCancelled);
            socketService.offBookingCancelled(handleCancelled);
        };
    }, [rideId, navigate, simulationCreate]);

    // Track time
    useEffect(() => {
        const timer = setInterval(() => {
            setElapsedTime((prev) => prev + 1);
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    // Track location (Real GPS)
    useEffect(() => {
        if (!navigator.geolocation || isSimulating) return; // Disable GPS if simulating

        const watchId = navigator.geolocation.watchPosition(
            (pos) => {
                const newPos = [pos.coords.latitude, pos.coords.longitude];

                // Track distance
                if (lastPosition) {
                    const stepDist = calculateRealtimeDistance(lastPosition, newPos).distance / 1000;
                    if (stepDist > 0.001) { // Only track meaningful movement (>1m)
                        setTrackedDistanceKm(prev => prev + stepDist);
                    }
                }

                setLastPosition(newPos);
                setDriverPosition(newPos);
                socketService.sendLocation(pos.coords.latitude, pos.coords.longitude, 0, 0, rideId);
            },
            null,
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
        );

        return () => navigator.geolocation.clearWatch(watchId);
    }, [isSimulating, rideId, lastPosition]);

    // Helper for Haversine inside component if needed or use existing one
    const calculateRealtimeDistance = (pos1, pos2) => {
        const R = 6371e3; // metres
        const φ1 = pos1[0] * Math.PI / 180;
        const φ2 = pos2[0] * Math.PI / 180;
        const Δφ = (pos2[0] - pos1[0]) * Math.PI / 180;
        const Δλ = (pos2[1] - pos1[1]) * Math.PI / 180;

        const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        const d = R * c; // in metres
        return { distance: d };
    };

    // Calculate real-time distance and ETA to dropoff
    useEffect(() => {
        if (!driverPosition || !dropoffCoords) return;

        const calculateRealtimeDistanceEta = (pos1, pos2) => {
            const R = 6371e3; // metres
            const φ1 = pos1[0] * Math.PI / 180;
            const φ2 = pos2[0] * Math.PI / 180;
            const Δφ = (pos2[0] - pos1[0]) * Math.PI / 180;
            const Δλ = (pos2[1] - pos1[1]) * Math.PI / 180;

            const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
                Math.cos(φ1) * Math.cos(φ2) *
                Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

            const d = R * c; // in metres

            // Estimate ETA based on 40km/h average speed in city
            const speedMs = 40 * (1000 / 3600); // ~11.1 m/s
            const timeSeconds = d / speedMs;
            const etaMinutes = Math.max(1, Math.round(timeSeconds / 60));

            return { distance: d, eta: etaMinutes };
        };

        const { distance: d, eta } = calculateRealtimeDistanceEta(driverPosition, dropoffCoords);
        setRealtimeDistance(d);
        setRealtimeEta(eta);
    }, [driverPosition, dropoffCoords]);

    // Simulation Logic
    const handleSimulate = () => {
        if (!routeCoords || routeCoords.length === 0) {
            toast.error('Không tìm thấy tuyến đường để mô phỏng');
            return;
        }

        if (isSimulating) {
            // Stop simulation
            setIsSimulating(false);
            if (simulationCreate) clearInterval(simulationCreate);
            setSimulationInterval(null);
            toast.success('Đã dừng mô phỏng');
            return;
        }

        setIsSimulating(true);
        toast.success('Bắt đầu mô phỏng chuyến đi');

        let step = 0;
        const totalSteps = routeCoords.length;

        // Simulate movement every 500ms
        const interval = setInterval(() => {
            if (step >= totalSteps) {
                clearInterval(interval);
                setIsSimulating(false);
                setSimulationInterval(null);
                toast.success('Đã đến điểm trả khách (Mô phỏng)');
                return;
            }

            const [lat, lng] = routeCoords[step];
            const newPos = [lat, lng];

            // Track distance
            if (lastPosition) {
                const stepDist = calculateRealtimeDistance(lastPosition, newPos).distance / 1000;
                setTrackedDistanceKm(prev => prev + stepDist);
            }

            // Update local state
            setLastPosition(newPos);
            setDriverPosition(newPos);

            // Send to socket
            // Calculate bearing if possible, else 0
            socketService.sendLocation(lat, lng, 0, 40, rideId); // 40km/h simulated

            step++;
        }, 500); // 500ms update rate

        setSimulationInterval(interval);
    };

    const handleJumpToDropoff = () => {
        if (simulationCreate) clearInterval(simulationCreate);
        setIsSimulating(false);
        setSimulationInterval(null);

        if (dropoffCoords) {
            setDriverPosition(dropoffCoords);
            socketService.sendLocation(dropoffCoords[0], dropoffCoords[1], 0, 0, rideId);
            toast.success('Đã di chuyển đến điểm trả khách');
        } else {
            toast.error('Không tìm thấy tọa độ điểm trả');
        }
    };

    // STAGE 4: Use ONLY tripRoute (Pickup → Dropoff) calculated by backend on startRide.
    // Never fall back to previewRoute — it's the pre-trip estimate, not the live navigation route.
    useEffect(() => {
        if (ride?.tripRoute?.polyline?.length > 0) {
            setRouteCoords(ride.tripRoute.polyline);
            console.log('✅ Using tripRoute from startRide response');
        } else if (id) {
            // tripRoute might not be in navigation state, fetch fresh ride from API
            console.warn('tripRoute missing in state, fetching from API for ride:', id);
            import('../services/rideService').then(({ default: rideService }) => {
                rideService.getRide(id).then(response => {
                    const freshRide = response?.data || response;
                    if (freshRide?.tripRoute?.polyline?.length > 0) {
                        setRouteCoords(freshRide.tripRoute.polyline);
                        updateRideState(freshRide);
                        console.log('✅ tripRoute fetched from API');
                    } else {
                        console.warn('⚠️ tripRoute still not available');
                    }
                }).catch(err => console.error('Failed to fetch ride for tripRoute:', err));
            });
        }
    }, [ride, id]);

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    // Complete ride
    const handleComplete = async () => {
        try {
            if (simulationCreate) clearInterval(simulationCreate);

            // Calculate distance (mock or actual if available)
            let actualDistanceKm = trackedDistanceKm > 0 ? parseFloat(trackedDistanceKm.toFixed(2)) : 0;

            if (!actualDistanceKm && ride?.distance_km) {
                actualDistanceKm = parseFloat(ride.distance_km);
            }
            if (!actualDistanceKm && ride?.tripRoute?.distanceKm) {
                actualDistanceKm = parseFloat(ride.tripRoute.distanceKm);
            }
            if (!actualDistanceKm && ride?.previewRoute?.distanceKm) {
                actualDistanceKm = parseFloat(ride.previewRoute.distanceKm);
            }
            const actualDurationMin = Math.max(1, Math.ceil(elapsedTime / 60));

            // Important: we pass an object that matches the completeRide backend payload.
            // But wait, the backend route is PATCH /:id with status: 'COMPLETED' or it's a specific route?
            // Wait, looking at routes: we don't have a specific PATCH /:id/complete route.
            // Oh right, the standard is PATCH /:id passing { status: 'COMPLETED', actualDistanceKm, actualDurationMin, driverLocation }
            // Let's use `rideService.updateRideStatus` and pass the extra fields as part of the body.
            // Currently `updateRideStatus(rideId, status)` only sends `{ status }`. We need to send more data.
            // We should use axios directly here or update the `rideService` to accept more data.
            // For safety, let's just use axios here since we need to send specific coordinates.

            toast.loading('Đang tính phí...', { id: 'complete_ride' });
            const response = await rideService.completeRide(rideId, {
                actualDistanceKm,
                actualDurationMin,
                driverLocation: driverPosition ? { lat: driverPosition[0], lng: driverPosition[1] } : null
            });

            toast.success('Chuyến đi hoàn tất', { id: 'complete_ride' });
            socketService.leaveRide(rideId);
            clearRide();

            const completedRide = response.data || response.ride || ride;

            navigate('/completed/' + rideId, {
                state: {
                    ride: completedRide,
                    bookingId: rideId,
                    elapsedTime,
                    distance: actualDistanceKm,
                }
            });
        } catch (err) {
            console.error('Lỗi khi hoàn thành chuyến:', err);
            toast.error(err.response?.data?.message || 'Không thể hoàn thành chuyến', { id: 'complete_ride' });
        }
    };

    return (
        <div className="relative h-full w-full flex flex-col overflow-hidden box-border">
            {/* Map */}
            <div className="absolute inset-0 z-0">
                <MapView
                    driverPosition={driverPosition}
                    dropoffPosition={dropoffCoords}
                    routeCoords={routeCoords}
                />
            </div>

            {/* Top bar */}
            <div className="absolute top-0 left-0 right-0 z-10 p-4">
                <div className="bg-white/95 backdrop-blur-md rounded-xl shadow-lg p-3 animate-slideDown">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => navigate('/dashboard')}
                                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
                            >
                                <svg className="w-5 h-5 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                </svg>
                            </button>
                            <div className="relative">
                                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                                    <span className="text-xl">🚗</span>
                                </div>
                                <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
                            </div>
                            <div>
                                <p className="text-xs text-gray-400">Đang di chuyển {isSimulating ? '(Mô phỏng)' : ''}</p>
                                <p className="text-sm font-bold text-gray-800">Chuyến #{rideId?.slice(-6) || '---'}</p>
                            </div>
                        </div>

                        {/* Timer */}
                        <div className="bg-gray-100 rounded-lg px-3 py-1.5">
                            <p className="text-xs text-gray-400 text-center">Thời gian</p>
                            <p className="text-lg font-mono font-bold text-gray-800">{formatTime(elapsedTime)}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Sheet */}
            <div
                className={`w-full absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-[0_-5px_20px_rgba(0,0,0,0.1)] p-5 z-20 flex flex-col box-border transition-all duration-300 ease-in-out cursor-pointer pointer-events-auto ${isExpanded ? 'h-auto' : ''}`}
                onClick={() => !isExpanded && setIsExpanded(true)}
            >
                {/* Drag handle */}
                <div
                    className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-3 hover:bg-gray-400 transition-colors shrink-0"
                    onClick={(e) => {
                        e.stopPropagation();
                        setIsExpanded(!isExpanded);
                    }}
                ></div>

                {/* Dropoff Info Container (Always Visible) */}
                <div className="flex flex-col mb-1 p-4 bg-blue-50/50 rounded-2xl border border-blue-100/50 shrink-0">
                    <div className="w-full mb-2">
                        <p className="text-blue-600 text-[10px] uppercase font-bold tracking-wider mb-1">ĐIỂM TRẢ KHÁCH</p>
                        <p className="font-bold text-gray-900 text-[15px] leading-snug break-words whitespace-normal">
                            {ride?.dropoff?.address || 'Đang tải...'}
                        </p>
                    </div>

                    <div className="w-full border-t border-blue-100/50 pt-2 flex items-center justify-between">
                        {(realtimeDistance !== null && realtimeEta !== null) ? (
                            <>
                                <div className="flex items-center gap-1.5 flex-1 border-r border-blue-100/50 pr-3">
                                    <span className="text-[10px] text-gray-500 uppercase font-medium">Khoảng cách:</span>
                                    <span className="text-gray-900 font-bold text-sm">{realtimeDistance < 1000 ? `${Math.round(realtimeDistance)}m` : `${(realtimeDistance / 1000).toFixed(1)}km`}</span>
                                </div>
                                <div className="flex items-center gap-1.5 flex-1 pl-3 justify-end text-blue-700">
                                    <span className="font-bold text-xl leading-none tracking-tight">{realtimeEta}</span>
                                    <span className="text-xs font-semibold">phút</span>
                                </div>
                            </>
                        ) : (
                            <div className="w-full text-center">
                                <p className="font-bold text-gray-900 text-sm">--</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Expanded Details */}
                <div className={`transition-all duration-300 ease-in-out overflow-hidden ${isExpanded ? 'max-h-[400px] opacity-100 mt-3' : 'max-h-0 opacity-0 mt-0'}`}>
                    {/* Stats */}
                    <div className="flex items-center justify-around bg-gray-50 rounded-xl p-3 mb-3">
                        <div className="text-center w-1/3 border-r border-gray-200">
                            <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wide">Giá</p>
                            <p className="font-bold text-green-600 text-[16px]">
                                {ride?.fare || ride?.estimatedPrice ? `${Number(ride.fare || ride.estimatedPrice).toLocaleString('vi-VN')}₫` : '---'}
                            </p>
                        </div>
                        <div className="text-center w-1/3 border-r border-gray-200">
                            <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wide">Thanh toán</p>
                            <p className={`font-bold text-[14px] ${ride?.paymentMethod === 'CARD' ? 'text-blue-600' : 'text-emerald-600'}`}>
                                {ride?.paymentMethod === 'CARD' ? '💳 Thẻ' : ride?.paymentMethod === 'WALLET' ? 'Ví CabGo' : '💵 Tiền mặt'}
                            </p>
                        </div>
                        <div className="text-center w-1/3">
                            <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wide">Thời gian</p>
                            <p className="font-bold text-gray-800 text-[16px]">{formatTime(elapsedTime)}</p>
                        </div>
                    </div>

                    {/* Simulation Options */}
                    <div className="flex gap-3 mb-2">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                handleSimulate();
                            }}
                            className={`flex-1 py-2.5 font-bold rounded-xl transition-all shadow-sm text-sm border flex items-center justify-center gap-2 ${isSimulating
                                ? 'bg-orange-50 text-orange-700 border-orange-200 animate-pulse'
                                : 'bg-orange-50 hover:bg-orange-100 text-orange-700 border-orange-100'
                                }`}
                        >
                            {isSimulating ? '⏹ Dừng mô phỏng' : '▶️ Chạy mô phỏng'}
                        </button>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                handleJumpToDropoff();
                            }}
                            className="flex-1 py-2.5 bg-purple-50 border border-purple-100 hover:bg-purple-100 text-purple-700 font-bold rounded-xl transition-colors shadow-sm text-sm flex items-center justify-center gap-1"
                        >
                            📍 Đến điểm trả
                        </button>
                    </div>
                </div>

                {/* Complete Button (Always Visible) */}
                <div className="mt-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <button
                        onClick={handleComplete}
                        className="w-full py-3 bg-green-500 text-white font-bold rounded-xl hover:bg-green-600 transition-all shadow-md shadow-green-500/20 active:scale-[0.98] text-base flex items-center justify-center gap-2"
                    >
                        ✅ Hoàn thành chuyến đi
                    </button>
                </div>
            </div>
        </div>
    );
}
