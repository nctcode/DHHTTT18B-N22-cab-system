import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import socketService from '../services/socketService';
import { bookingService } from '../services';
import { useAuth } from '../contexts/AuthContext';
import { useRide } from '../contexts/RideContext';
import MapView from '../components/MapView';
import RippleAnimation from '../components/RippleAnimation';
import Button from '../components/Button';
import toast from 'react-hot-toast';

export default function SearchingDriver() {
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuth();
    const { currentRide: booking, loading, clearRide, fetchRide } = useRide();
    const bookingId = booking?._id || booking?.id;
    
    const { pickupCoords: navPickupCoords } = location.state || {};
    const [nearbyDrivers, setNearbyDrivers] = useState([]);
    const [driver, setDriver] = useState(null);
    const [cancelling, setCancelling] = useState(false);

    const pickupCoords = booking?.pickup?.lat
        ? [booking.pickup.lat, booking.pickup.lng]
        : (Array.isArray(navPickupCoords) ? navPickupCoords : null);

    // Socket listeners
    useEffect(() => {
        if (!bookingId) return;

        const token = localStorage.getItem('accessToken');
        if (token) {
            socketService.connect(token);
        }

        // Emit location to get nearby drivers periodically
        const locationInterval = setInterval(() => {
            if (pickupCoords) {
                // Emit event to get nearby drivers (Backend must handle 'passenger.location')
                socketService.emitEvent('passenger.location', { lat: pickupCoords[0], lng: pickupCoords[1] });
            }
        }, 5000);

        const handleDriverMatched = (data) => {
            console.log('🚗 Driver matched (Waiting for acceptance):', data);
            // Do NOT set driver state yet. Just update status text if needed.
            toast('Đã tìm thấy tài xế, đang chờ phản hồi...', { icon: '⏳' });
        };

        const handleRideCreated = async (data) => {
            console.log('🎉 Ride created (Driver Accepted):', data);
            if (data.driver) {
                setDriver(data.driver);
            }
            
            if (data.rideId) {
                localStorage.setItem('activeRideId', data.rideId);
            }

            setTimeout(async () => {
                if (data.bookingId === bookingId || data.rideId) {
                    if (data.rideId) await fetchRide(data.rideId);
                    navigate('/ride/' + data.rideId);
                }
            }, 3000);
        };

        const handleRideAssigned = async (data) => {
            console.log('🎉 Ride assigned:', data);
            if (data.driver) setDriver(data.driver);

            if (data.rideId) {
                localStorage.setItem('activeRideId', data.rideId);
            }

            setTimeout(async () => {
                if (data.bookingId === bookingId || data.rideId) {
                    if (data.rideId) await fetchRide(data.rideId);
                    navigate('/ride/' + data.rideId);
                }
            }, 3000);
        };

        const handleRideStatus = async (data) => {
            if (data.rideId && (data.status === 'ASSIGNED' || data.status === 'CREATED')) {
                localStorage.setItem('activeRideId', data.rideId);
                await fetchRide(data.rideId);
                navigate('/ride/' + data.rideId);
            }
        };

        const handleNearbyDrivers = (data) => {
            // data might be [ { lat, lng, id, ... } ]
            if (Array.isArray(data)) setNearbyDrivers(data);
            else if (data?.drivers) setNearbyDrivers(data.drivers);
        };

        const handleNoDrivers = (data) => {
            console.log('😞 No drivers available:', data);
            if (data.bookingId === bookingId) {
                toast.error('Không tìm thấy tài xế gần bạn. Vui lòng thử lại sau.', { duration: 5000 });
                setTimeout(() => navigate('/home'), 3000);
            }
        };

        const handleRematching = (data) => {
            console.log('🔄 Rematching in progress:', data);
            if (data.bookingId === bookingId) {
                setDriver(null); // Reset driver state
                toast('Tài xế đã hủy chuyến. Đang tìm tài xế khác…', { icon: '🔄', duration: 5000 });
            }
        };

        socketService.onDriverMatched(handleDriverMatched);
        socketService.onRideStatusUpdate(handleRideStatus);
        socketService.onNearbyDrivers(handleNearbyDrivers);
        socketService.onRideCreated(handleRideCreated);
        socketService.onRideAssigned(handleRideAssigned);
        socketService.on('booking:noDrivers', handleNoDrivers);
        socketService.on('booking:rematching', handleRematching);

        return () => {
            clearInterval(locationInterval);
            socketService.off('driver_matched', handleDriverMatched);
            socketService.off('ride_status_update', handleRideStatus);
            socketService.off('nearby_drivers', handleNearbyDrivers);
            socketService.off('ride:created', handleRideCreated);
            socketService.off('ride:assigned', handleRideAssigned);
            socketService.off('booking:noDrivers', handleNoDrivers);
            socketService.off('booking:rematching', handleRematching);
        };
    }, [bookingId, navigate, pickupCoords, booking]);

    const handleCancel = async () => {
        if (!bookingId) return;

        try {
            const bookingIdToCancel = booking?._id || booking?.id;
            if (bookingIdToCancel) {
                await bookingService.cancelBooking(bookingIdToCancel);
            }
            
            clearRide();
            toast.error('Đã hủy tìm chuyến xe', { id: 'cancel_search' });
            navigate('/home', { replace: true });
        } catch (err) {
            console.error('Cancel failed:', err);
            toast.error(err.response?.data?.message || 'Có lỗi xảy ra khi hủy chuyến');
        } finally {
            setCancelling(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-gray-500 font-medium">Đang khởi tạo tìm kiếm...</p>
            </div>
        );
    }
    
    if (!booking) return null;

    return (
        <div className="relative h-full w-full flex flex-col bg-gray-100 overflow-hidden box-border">
            {/* Top Status Bar (Overlays Map) */}
            <div className="absolute top-0 left-0 right-0 z-10 p-4 bg-gradient-to-b from-black/20 to-transparent pointer-events-none">
                <div className="absolute top-4 left-4 z-10 pointer-events-auto">
                    <button
                        onClick={() => navigate('/home')}
                        className="w-10 h-10 bg-white rounded-full shadow-md flex items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors"
                    >
                        <svg className="w-6 h-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Map Layer (Takes remaining space) */}
            <div className="flex-1 w-full relative z-0">
                <MapView
                    pickupPosition={pickupCoords}
                    nearbyDrivers={nearbyDrivers}
                    showCenterPin={false}
                    routeCoords={booking?.route?.polyline || null}
                />
            </div>
            <div className="w-full bg-white rounded-t-3xl shadow-[0_-5px_20px_rgba(0,0,0,0.1)] p-6 pb-8 z-20 flex flex-col box-border">
                {!driver ? (
                    // SEARCHING STATE
                    <div className="flex flex-col items-center">
                        <h2 className="text-xl font-bold text-gray-900 mb-1">
                            Đang tìm {booking.vehicleType?.toLowerCase() === 'bike' ? 'xe máy' : 'ô tô'}...
                        </h2>
                        <p className="text-gray-500 text-sm mb-6">
                            Thường mất vài giây
                        </p>

                        {/* Progress Bar */}
                        <div className="w-full h-1 bg-gray-100 rounded-full overflow-hidden mb-6">
                            <div className="h-full bg-primary animate-progress-indeterminate"></div>
                        </div>

                        {/* Booking Info */}
                        <div className="w-full flex items-center justify-between bg-gray-50 rounded-xl p-4 mb-6">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                                    <span className="text-xl">
                                        {booking.vehicleType === 'BIKE' ? '🛵' : '🚗'}
                                    </span>
                                </div>
                                <div>
                                    <p className="font-bold text-gray-800">
                                        {booking.estimatedPrice?.toLocaleString('vi-VN')}₫
                                    </p>
                                    <p className="text-xs text-gray-500 capitalize">{booking.vehicleType}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-xs text-gray-400">Điểm đón</p>
                                <p className="text-sm font-medium text-gray-700 truncate max-w-[150px]">
                                    {booking.pickup?.address || 'Vị trí hiện tại'}
                                </p>
                            </div>
                        </div>

                        {/* Cancel Button */}
                        <Button
                            variant="danger" // Assuming you have a danger variant or just class overrides
                            className="w-full py-4 bg-red-50 text-red-600 hover:bg-red-100 font-bold rounded-xl transition-colors border border-red-100"
                            onClick={handleCancel}
                            loading={cancelling}
                        >
                            Hủy yêu cầu
                        </Button>
                    </div>
                ) : (
                    // DRIVER FOUND STATE
                    <div className="flex flex-col items-center text-center">
                        <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4 text-3xl animate-bounce">
                            ✓
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-1">Đã tìm thấy tài xế!</h2>
                        <p className="text-gray-500 mb-6">Gặp {driver.name}</p>

                        <div className="w-full bg-gray-50 p-4 rounded-xl flex items-center gap-4 mb-4 text-left">
                            <div className="w-12 h-12 bg-gray-200 rounded-full overflow-hidden">
                                {/* Placeholder avatar */}
                                <img src={`https://ui-avatars.com/api/?name=${driver.name}&background=random`} alt="Driver" />
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-900">{driver.name}</h3>
                                <p className="text-sm text-gray-500">{driver.vehicleModel} • {driver.licensePlate}</p>
                            </div>
                            <div className="ml-auto flex flex-col items-end">
                                <span className="bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded text-xs font-bold">
                                    ★ {driver.rating?.toFixed(1) || '5.0'}
                                </span>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <style>{`
                @keyframes progress-indeterminate {
                    0% { width: 0%; margin-left: 0%; }
                    50% { width: 70%; margin-left: 30%; }
                    100% { width: 0%; margin-left: 100%; }
                }
                .animate-progress-indeterminate {
                    animation: progress-indeterminate 1.5s infinite ease-in-out;
                }
                @keyframes slideUp {
                    from { transform: translateY(100%); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
                .animate-slideUp {
                    animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1);
                }
            `}</style>
        </div >
    );
}
