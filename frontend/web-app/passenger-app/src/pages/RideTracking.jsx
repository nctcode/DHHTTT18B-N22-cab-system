import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { rideService } from '../services';
import socketService from '../services/socketService';
import routingService from '../services/routingService';
import MapView from '../components/MapView';
import Button from '../components/Button';
import toast from 'react-hot-toast';

export default function RideTracking() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [ride, setRide] = useState(null);
    const [loading, setLoading] = useState(true);
    const [driverLocation, setDriverLocation] = useState(null);
    const [routeCoords, setRouteCoords] = useState(null);
    const [realtimeDistance, setRealtimeDistance] = useState(null);
    const [realtimeEta, setRealtimeEta] = useState(null);
    const [isExpanded, setIsExpanded] = useState(false);
    const mapRef = useRef(null);

    // 1. Fetch Ride Data
    useEffect(() => {
        const fetchRide = async () => {
            try {
                // rideService.getRide returns { success: true, data: ride } or just ride object depending on backend
                const response = await rideService.getRide(id);
                // Handle different response structures
                const rideData = response.data || response.ride || response;

                if (rideData) {
                    setRide(rideData);
                    // Initial driver location from ride data if available
                    // Note: Ride model might not have current_lat/lng, but booking.matched event did.
                    // For now, we wait for socket update or need API to include driver location.
                } else {
                    toast.error('Không tìm thấy chuyến đi');
                    navigate('/home');
                }
            } catch (error) {
                console.error('Failed to fetch ride:', error);
                toast.error('Lỗi tải chi tiết chuyến đi');
            } finally {
                setLoading(false);
            }
        };

        fetchRide();

        // Socket Connection
        const token = localStorage.getItem('accessToken');
        if (token) {
            const socket = socketService.connect(token);

            // Join the ride room to receive updates
            if (socket.connected) {
                socketService.joinRide(id);
            } else {
                socket.on('connect', () => {
                    socketService.joinRide(id);
                });
            }
        }

        return () => {
            socketService.leaveRide(id);
            socketService.disconnect();
        };
    }, [id, navigate]);

    // 1.5 Calculate Real-time Distance and ETA
    useEffect(() => {
        if (driverLocation && ride) {
            let targetCoords = null;
            if (ride.status === 'ASSIGNED') {
                targetCoords = ride.pickup ? [ride.pickup.lat, ride.pickup.lng] : null;
            } else if (ride.status === 'STARTED' || ride.status === 'IN_PROGRESS') {
                targetCoords = ride.dropoff ? [ride.dropoff.lat, ride.dropoff.lng] : null;
            }

            if (targetCoords) {
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
                const distMeters = getDistance(driverLocation[0], driverLocation[1], targetCoords[0], targetCoords[1]);
                setRealtimeDistance(distMeters);
                // Estimate ETA based on 30km/h (500m/min)
                const estMinutes = Math.max(1, Math.ceil(distMeters / 500));
                setRealtimeEta(estMinutes);
            }
        }
    }, [driverLocation, ride]);

    // 2. Socket Listeners
    useEffect(() => {
        if (!ride) return;

        const handleLocationUpdate = (data) => {
            console.log('📍 Socket received location update:', data);
            if (data.location) {
                setDriverLocation([data.location.lat, data.location.lng]);
            }
        };

        const handleStatusUpdate = (data) => {
            // data: { rideId, status, tripRoute, ... }
            if (data.rideId === id) {
                console.log('Ride status/data updated:', data);

                // Driver cancelled → navigate back to searching for rematching
                if (data.status === 'CANCELLED_BY_DRIVER') {
                    toast('Tài xế đã hủy chuyến. Đang tìm tài xế khác…', { icon: '🔄', duration: 5000 });
                    navigate('/searching', {
                        state: {
                            bookingId: ride.bookingId,
                            pickupCoords: ride.pickup ? [ride.pickup.lat, ride.pickup.lng] : null,
                            pickup: ride.pickup,
                            destination: ride.dropoff,
                        },
                        replace: true,
                    });
                    return;
                }

                // Merge full data to ensure we get new routes (tripRoute, etc.)
                setRide(prev => ({ ...prev, ...data }));

                if (data.status === 'COMPLETED') {
                    toast.success('Chuyến đi đã hoàn thành!');
                    navigate(`/payment/${id}`);
                }
            }
        };

        const handleRideCompleted = (data) => {
            if (data.rideId === id) {
                console.log('Ride completed:', data);
                toast.success('Chuyến đi đã hoàn thành!');
                navigate(`/payment/${id}`);
            }
        };

        const handleRideAssigned = (data) => {
            if (data.rideId === id || data.bookingId === ride.bookingId) {
                console.log('📍 Ride assigned update with route:', data);
                setRide(prev => ({ ...prev, ...data }));

                // Set initial driver position from the event
                if (data.driverLocation) {
                    setDriverLocation([data.driverLocation.lat, data.driverLocation.lng]);
                }
            }
        };

        // Handle rematching: driver cancelled after acceptance, system is finding another driver
        const handleRematching = (data) => {
            console.log('🔄 Rematching event received on RideTracking:', data);
            if (data.bookingId === ride.bookingId) {
                toast('Tài xế đã hủy chuyến. Đang tìm tài xế khác…', { icon: '🔄', duration: 5000 });
                navigate('/searching', {
                    state: {
                        bookingId: ride.bookingId,
                        pickupCoords: ride.pickup ? [ride.pickup.lat, ride.pickup.lng] : null,
                        pickup: ride.pickup,
                        destination: ride.dropoff,
                    },
                    replace: true,
                });
            }
        };

        socketService.socket?.on('driver.location.updated', handleLocationUpdate);
        socketService.socket?.on('ride:statusChanged', handleStatusUpdate);
        socketService.socket?.on('ride:assigned', handleRideAssigned);
        socketService.socket?.on('booking:rematching', handleRematching);
        socketService.socket?.on('ride:started', handleStatusUpdate);
        socketService.socket?.on('ride:update', handleStatusUpdate);
        socketService.socket?.on('ride:completed', handleRideCompleted);

        return () => {
            socketService.socket?.off('driver.location.updated', handleLocationUpdate);
            socketService.socket?.off('ride:statusChanged', handleStatusUpdate);
            socketService.socket?.off('ride:assigned', handleRideAssigned);
            socketService.socket?.off('booking:rematching', handleRematching);
            socketService.socket?.off('ride:started', handleStatusUpdate);
            socketService.socket?.off('ride:update', handleStatusUpdate);
            socketService.socket?.off('ride:completed', handleRideCompleted);
        };
    }, [ride, id, navigate]);

    // 3. Routing Logic - Use persisted route from ride object
    // The ride object is enriched by the ride:assigned socket event or API fetch
    // No separate route calculation needed; the backend provides it.

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="relative h-full w-full flex flex-col bg-gray-100 overflow-hidden box-border">
            {/* Back Button (Overlays Map) */}
            <div className="absolute top-4 left-4 z-10 pointer-events-auto">
                <button
                    onClick={() => navigate('/home')}
                    className="w-10 h-10 bg-white rounded-full shadow-md flex items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors"
                >
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                </button>
            </div>

            {/* Map Layer */}
            <div className="flex-1 w-full relative z-0">
                <MapView
                    showCenterPin={false}
                    // Drivers array for the map
                    nearbyDrivers={driverLocation ? [{
                        id: ride?.driverId,
                        lat: driverLocation[0],
                        lng: driverLocation[1],
                        vehicleType: 'CAR', // Default
                        name: 'Driver'
                    }] : []}

                    // Route Polyline Logic
                    routeCoords={(() => {
                        if (ride?.status === 'STARTED' || ride?.status === 'IN_PROGRESS') {
                            return ride?.tripRoute?.polyline || ride?.previewRoute?.polyline;
                        }
                        if (ride?.status === 'ASSIGNED' || ride?.status === 'ARRIVED') {
                            return ride?.driverToPickupRoute?.polyline;
                        }
                        return ride?.previewRoute?.polyline;
                    })()}

                    // Markers logic handled by MapView or we pass explicit positions
                    pickupPosition={ride?.pickup ? [ride.pickup.lat, ride.pickup.lng] : null}
                    destinationPosition={ride?.dropoff ? [ride.dropoff.lat, ride.dropoff.lng] : null}
                />
            </div>

            {/* Driver Info Card - Collapsible Bottom Sheet */}
            <div
                className={`w-full bg-white rounded-t-3xl shadow-[0_-5px_20px_rgba(0,0,0,0.1)] p-6 z-20 flex flex-col box-border transition-all duration-300 ease-in-out cursor-pointer ${isExpanded ? 'h-auto' : ''}`}
                onClick={() => !isExpanded && setIsExpanded(true)}
            >
                {/* Drag handle */}
                <div
                    className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mb-4 hover:bg-gray-400 transition-colors"
                    onClick={(e) => {
                        e.stopPropagation();
                        setIsExpanded(!isExpanded);
                    }}
                ></div>

                {/* Compact View: Status & ETA (Always visible) */}
                <div className="flex flex-col mb-1 p-4 bg-blue-50/50 rounded-2xl border border-blue-100/50 shrink-0">
                    <div className="w-full mb-2">
                        <p className="text-blue-600 text-[10px] uppercase font-bold tracking-wider mb-1">Trạng thái</p>
                        <p className="font-bold text-gray-900 text-[15px] leading-snug break-words whitespace-normal">
                            {ride?.status === 'ASSIGNED' ? 'Tài xế đang đến' :
                                ride?.status === 'STARTED' ? 'Đang đến điểm đến' :
                                    ride?.status === 'ARRIVED' ? 'Tài xế đã đến' : ride?.status}
                        </p>
                    </div>

                    <div className="w-full border-t border-blue-100/50 pt-2 flex items-center justify-between">
                        {(realtimeDistance !== null && realtimeEta !== null && ride?.status !== 'ARRIVED') ? (
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

                {/* Expanded View: Driver Info & Actions */}
                <div
                    className={`transition-all duration-300 ease-in-out overflow-hidden ${isExpanded ? 'max-h-[500px] opacity-100 mt-4' : 'max-h-0 opacity-0 mt-0'}`}
                >
                    <div className="flex items-center gap-4 mb-6">
                        <div className="w-14 h-14 bg-gray-100 rounded-full overflow-hidden border border-gray-200 shadow-sm flex-shrink-0">
                            <img
                                src={`https://ui-avatars.com/api/?name=${ride?.driverId || 'Driver'}&background=random`}
                                alt="Driver"
                                className="w-full h-full object-cover"
                            />
                        </div>

                        <div className="flex-1 min-w-0">
                            <h2 className="text-lg font-bold text-gray-900 truncate">
                                {ride?.driverName || 'Tài xế CabGo'}
                            </h2>
                            <div className="flex items-center gap-2 text-gray-500 text-xs mt-1">
                                <span className="bg-gray-100 px-2 py-0.5 rounded text-gray-700 font-semibold border border-gray-200">
                                    {ride?.licensePlate || '30A-123.45'}
                                </span>
                                <span>•</span>
                                <span className="truncate">Toyota Vios</span>
                            </div>
                        </div>

                        {/* Hidden rating/trips per request, can be added inside expanded safely but user said "Ẩn bớt", so we keep it minimal */}
                        <div className="flex items-center justify-end gap-1 text-yellow-500 font-bold bg-yellow-50 px-2 py-1 rounded-lg">
                            <span className="text-sm">★</span> <span className="text-sm">5.0</span>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="grid grid-cols-2 gap-3 mt-2">
                        <Button variant="secondary" className="flex items-center justify-center gap-2 py-3 rounded-xl bg-gray-50 border-gray-200 hover:bg-gray-100 text-gray-700 shadow-sm">
                            <span className="text-lg">📞</span> <span className="font-semibold text-sm">Gọi điện</span>
                        </Button>
                        <Button variant="secondary" className="flex items-center justify-center gap-2 py-3 rounded-xl bg-gray-50 border-gray-200 hover:bg-gray-100 text-gray-700 shadow-sm">
                            <span className="text-lg">💬</span> <span className="font-semibold text-sm">Nhắn tin</span>
                        </Button>
                    </div>
                </div>

                {/* Indicator text when compact */}
                {!isExpanded && (
                    <div className="text-center mt-3">
                        <p className="text-[10px] text-gray-400 font-medium tracking-wide uppercase">Chạm để xem chi tiết</p>
                    </div>
                )}
            </div>
        </div>
    );
}
