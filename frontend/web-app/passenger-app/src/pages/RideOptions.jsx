import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useRide } from '../contexts/RideContext';
import { pricingService, bookingService } from '../services';
import { calculateDistance } from '../utils/mapHelpers';
import RideOptionsList from '../components/ride/RideOptionsList';
import PriceBreakdownModal from '../components/ride/PriceBreakdownModal';
import MapView from '../components/MapView';
import axios from 'axios';
import toast from 'react-hot-toast';
import Button from '../components/Button';

// Average speeds for ETA estimation (km/h)
const AVG_SPEED = { BIKE: 35, ECONOMY: 25, PREMIUM: 30, SUV: 22 };

export default function RideOptions() {
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuth();
    const { fetchRide } = useRide();
    const { pickup, pickupLocation, destination, destinationLocation } = location.state || {};

    const [rideOptions, setRideOptions] = useState([]);
    const [selectedType, setSelectedType] = useState(null);
    const [breakdownData, setBreakdownData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [booking, setBooking] = useState(false);
    const [error, setError] = useState(null);
    const [paymentMethod, setPaymentMethod] = useState('CASH');

    // Calculate distance + duration from coordinates
    const [routeCoords, setRouteCoords] = useState(null);
    const [routeInfo, setRouteInfo] = useState(null);
    const [aiTripDuration, setAiTripDuration] = useState(null);

    useEffect(() => {
        if (!pickupLocation || !destinationLocation) return;

        // Helper to normalize to [lat, lng] array
        const toArray = (loc) => Array.isArray(loc) ? loc : [loc.lat, loc.lng];
        // Helper to normalize to {lat, lng} object
        const toObj = (loc) => Array.isArray(loc) ? { lat: loc[0], lng: loc[1] } : { lat: loc.lat, lng: loc.lng };

        const pArr = toArray(pickupLocation);
        const dArr = toArray(destinationLocation);
        const pObj = toObj(pickupLocation);
        const dObj = toObj(destinationLocation);

        const fetchRoute = async () => {
            try {
                // Use API Gateway endpoint
                const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
                const response = await axios.post(`${API_URL}/route`, {
                    pickup: pObj,
                    destination: dObj
                }, { timeout: 15000 }); // Wait longer than backend (10s)

                if (response.data.success) {
                    console.log('Route API response:', response.data);
                    const { distanceKm, durationMin, polyline } = response.data.data;
                    console.log('Route debug - distanceKm:', distanceKm, 'durationMin:', durationMin);
                    console.log('Frontend Polyline length:', polyline?.length);
                    setRouteInfo({ distance_km: distanceKm, duration_min: durationMin });
                    setRouteCoords(polyline);
                } else {
                    console.warn('Route API returned failure, using Haversine');
                    fallbackHaversine();
                }
            } catch (error) {
                console.error('Failed to fetch route:', error);
                fallbackHaversine();
            }
        };

        const fallbackHaversine = () => {
            try {
                // Use arrays for mapHelpers functions
                const distMeters = calculateDistance(pArr, dArr);
                if (isNaN(distMeters)) throw new Error('Invalid coordinates for Haversine');

                const distKm = distMeters / 1000;
                const durationMin = Math.max(1, Math.round((distKm / 25) * 60));

                setRouteInfo({ distance_km: Math.round(distKm * 10) / 10, duration_min: durationMin });
                setRouteCoords([pArr, dArr]); // Straight line
            } catch (e) {
                console.error('Fallback calculation failed:', e);
                setError('Could not calculate route. Please check location validity.');
                setLoading(false);
            }
        };

        fetchRoute();
    }, [pickupLocation, destinationLocation]);

    // Fetch pricing for all vehicle types
    useEffect(() => {
        if (!pickupLocation || !destinationLocation) {
            setLoading(false);
            setError('Thiếu dữ liệu vị trí. Vui lòng quay lại và chọn điểm đón & điểm đến.');
            return;
        }

        if (routeInfo) {
            fetchAllOptions();
        }
    }, [routeInfo, pickupLocation, destinationLocation]);

    const fetchAllOptions = async () => {
        try {
            setLoading(true);
            setError(null);

            const estimates = await pricingService.getAllEstimates({
                distance_km: routeInfo.distance_km,
                duration_min: routeInfo.duration_min,
            });

            // Call AI ETA service for prediction
            const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
            const toObj = (loc) => Array.isArray(loc) ? { lat: loc[0], lng: loc[1] } : { lat: loc.lat, lng: loc.lng };
            let etaPrediction = null;
            try {
                const now = new Date();
                const token = localStorage.getItem('accessToken');
                const etaResp = await axios.post(`${API_URL}/rides/eta`, {
                    pickup: toObj(pickupLocation),
                    destination: toObj(destinationLocation),
                    timeOfDay: now.getHours(),
                    dayOfWeek: now.getDay(),
                }, {
                    timeout: 8000,
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (etaResp.data?.success) {
                    etaPrediction = etaResp.data.data;
                    console.log('🤖 AI ETA prediction:', etaPrediction);
                    setAiTripDuration(etaPrediction.predictedTripDurationMinutes);
                }
            } catch (etaErr) {
                console.warn('⚠️ AI ETA service unavailable, using local fallback:', etaErr.message);
            }

            // Enrich with ETA from AI or fallback
            const enriched = estimates.map((est) => {
                let eta;
                if (etaPrediction?.predictedArrivalMinutes) {
                    // AI ETA trả về thời gian tài xế đến đón (Arrival ETA)
                    const speedRatio = (AVG_SPEED[est.vehicleType] || 25) / 25;
                    eta = Math.max(1, Math.round(etaPrediction.predictedArrivalMinutes / speedRatio));
                } else {
                    // Fallback local nếu AI ETA hoàn toàn không khả dụng
                    eta = Math.max(1, Math.round((routeInfo.distance_km / (AVG_SPEED[est.vehicleType] || 25)) * 60));
                }
                return {
                    ...est,
                    eta,
                    distance_km: routeInfo.distance_km,
                    duration_min: routeInfo.duration_min,
                    etaSource: etaPrediction ? (etaPrediction.source || 'ai') : 'local',
                    aiTripDuration: etaPrediction?.predictedTripDurationMinutes || null,
                };
            });

            setRideOptions(enriched);

            // Auto-select first available
            const first = enriched.find((o) => !o.error);
            if (first) setSelectedType(first.vehicleType);
        } catch (err) {
            console.error('Failed to fetch ride options:', err);
            setError('Không thể tải các lựa chọn xe. Vui lòng thử lại.');
            toast.error('Tải lựa chọn xe thất bại');
        } finally {
            setLoading(false);
        }
    };

    const selectedOption = rideOptions.find((o) => o.vehicleType === selectedType);

    const handleSelect = (option) => {
        setSelectedType(option.vehicleType); // Kept original logic for consistency with selectedOption
        // If the intent was to use selectedId, it would be: setSelectedId(option.vehicleType);
    };

    const handleBookRide = async () => {
        if (!user) {
            toast.error('Vui lòng đăng nhập để đặt xe');
            navigate('/login');
            return;
        }

        // Using selectedOption based on existing state (selectedType)
        if (!selectedOption) return;

        try {
            setBooking(true); // Using existing 'booking' state for loading
            const bookingData = {
                userId: user.id,
                pickup: {
                    // pickupLocation is an array [lat, lng] coming from Home.jsx
                    lat: Array.isArray(pickupLocation) ? pickupLocation[0] : pickupLocation.lat,
                    lng: Array.isArray(pickupLocation) ? pickupLocation[1] : pickupLocation.lng,
                    address: pickup
                },
                dropoff: {
                    // destinationLocation might be array or object depending on source
                    lat: Array.isArray(destinationLocation) ? destinationLocation[0] : destinationLocation.lat,
                    lng: Array.isArray(destinationLocation) ? destinationLocation[1] : destinationLocation.lng,
                    address: destination
                },
                vehicleType: selectedType,
                estimatedPrice: selectedOption.totalFare,
                distance_km: routeInfo.distance_km,
                duration_min: routeInfo.duration_min,
                // For AI context
                pickupCoords: pickupLocation,
                paymentMethod: paymentMethod, // Include payment method
                route: {
                    distanceKm: routeInfo.distance_km,
                    durationMin: routeInfo.duration_min,
                    polyline: routeCoords
                }
            };

            console.log('🚀 Sending booking data:', JSON.stringify(bookingData, null, 2));
            const result = await bookingService.createBooking(bookingData);
            toast.success('Đặt xe thành công!');
            const newBookingId = result.data?._id || result.data?.id || result.booking?.id;
            
            localStorage.setItem('activeRideId', newBookingId);
            await fetchRide(newBookingId);
            
            navigate('/searching', {
                state: {
                    bookingId: newBookingId,
                    pickupCoords: pickupLocation,
                    pickup,
                    destination,
                }
            });
        } catch (err) {
            toast.error(err.response?.data?.message || 'Đặt xe thất bại. Vui lòng thử lại.');
        } finally {
            setBooking(false);
        }
    };

    return (
        <div className="min-h-full h-full bg-gray-50 flex flex-col overflow-hidden box-border">
            {/* Header */}
            <div className="bg-white shadow-sm">
                <div className="flex items-center px-4 pt-5 pb-3">
                    <button
                        onClick={() => navigate(-1)}
                        className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors mr-2 flex-shrink-0"
                    >
                        <svg className="w-5 h-5 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <div className="flex-1">
                        <h1 className="text-lg font-bold text-gray-900">Chọn loại xe</h1>
                        {routeInfo && (
                            <p className="text-xs text-gray-500">
                                {Number(routeInfo.distance_km).toFixed(1)} km • ~{Math.round(aiTripDuration || routeInfo.duration_min)} phút
                            </p>
                        )}
                    </div>
                </div>

                {/* Route summary */}
                <div className="px-5 pb-5 mt-1">
                    <div className="relative">
                        {/* Connecting Line */}
                        <div className="absolute left-[5px] top-[10px] bottom-[10px] w-[2px] bg-gray-200 z-0"></div>

                        <div className="flex flex-col gap-3">
                            {/* Pickup */}
                            <button
                                onClick={() => navigate('/')}
                                className="flex items-center gap-4 w-full text-left group min-w-0 relative z-10"
                            >
                                <div className="w-3 h-3 bg-primary rounded-full ring-4 ring-white flex-shrink-0"></div>
                                <p className="flex-1 min-w-0 text-sm text-gray-700 truncate group-hover:text-primary transition-colors hover:underline" title="Nhấn để đổi điểm đón">
                                    {pickup || 'Điểm đón'}
                                </p>
                            </button>

                            {/* Destination */}
                            <button
                                onClick={() => navigate('/destination', { state: { pickup, pickupLocation } })}
                                className="flex items-center gap-4 w-full text-left group min-w-0 relative z-10"
                            >
                                <div className="w-3 h-3 bg-red-500 rounded-full ring-4 ring-white flex-shrink-0"></div>
                                <p className="flex-1 min-w-0 text-sm text-gray-700 truncate group-hover:text-red-500 transition-colors hover:underline" title="Nhấn để đổi điểm đến">
                                    {destination || 'Điểm đến'}
                                </p>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Map Preview */}
            <div className="h-48 relative z-0">
                <MapView
                    pickupPosition={pickupLocation}
                    destinationPosition={destinationLocation}
                    routeCoords={routeCoords}
                    showCenterPin={false}
                />
            </div>

            {/* Content */}
            <div className="flex-1 px-5 pt-3 pb-safe overflow-y-auto box-border">
                {/* Loading */}
                {loading && (
                    <div className="flex flex-col items-center justify-center py-16">
                        <div className="w-12 h-12 border-3 border-primary border-t-transparent rounded-full animate-spin mb-4" />
                        <p className="text-gray-500 font-medium">Đang tính giá...</p>
                        <p className="text-xs text-gray-400 mt-1">Đang kiểm tra tuyến đường {routeInfo?.distance_km || '?'} km</p>
                    </div>
                )}

                {/* Error */}
                {error && !loading && (
                    <div className="bg-red-50 border border-red-100 rounded-2xl p-6 text-center">
                        <p className="text-4xl mb-3">⚠️</p>
                        <p className="text-red-600 font-medium mb-2">{error}</p>
                        <button onClick={() => navigate(-1)}
                            className="text-sm text-primary font-medium hover:underline">
                            ← Quay lại
                        </button>
                    </div>
                )}

                {/* Ride Options */}
                {!loading && !error && rideOptions.length > 0 && (
                    <>
                        <RideOptionsList
                            options={rideOptions}
                            selectedType={selectedType}
                            onSelect={handleSelect}
                            onViewBreakdown={setBreakdownData}
                        />

                        {/* Selected ride summary */}
                        {selectedOption && (
                            <div className="mt-5 bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-sm text-gray-500">Giá dự kiến</span>
                                    <button
                                        onClick={() => setBreakdownData({ ...selectedOption, aiTripDuration })}
                                        className="text-xs text-primary font-medium hover:underline"
                                    >
                                        Xem chi tiết
                                    </button>
                                </div>
                                <div className="flex items-baseline gap-1">
                                    {selectedOption.isFallback || selectedOption.totalFare == null ? (
                                        <span className="text-base font-medium text-amber-500 animate-pulse">
                                            Giá tạm thời không khả dụng
                                        </span>
                                    ) : (
                                        <>
                                            <span className="text-2xl font-bold text-gray-900">
                                                {selectedOption.totalFare?.toLocaleString('vi-VN')}
                                            </span>
                                            <span className="text-sm text-gray-500">₫</span>
                                        </>
                                    )}
                                </div>
                                {selectedOption.surgeMultiplier > 1 && (
                                    <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                                        ⚡ Đang áp dụng giá tăng cao ({selectedOption.surgeMultiplier}x)
                                    </p>
                                )}
                            </div>
                        )}

                        {/* Payment Method Selector */}
                        <div className="mt-6 flex gap-2 p-1 bg-gray-100 rounded-xl">
                            <button
                                className={`flex-1 py-3 rounded-lg font-medium text-sm transition-all flex justify-center items-center gap-2 ${paymentMethod === 'CASH' ? 'bg-white shadow-sm text-primary' : 'text-gray-500 hover:bg-gray-200'}`}
                                onClick={() => setPaymentMethod('CASH')}
                            >
                                <span className="text-lg">💵</span> Tiền mặt
                            </button>
                            <button
                                className={`flex-1 py-3 rounded-lg font-medium text-sm transition-all flex justify-center items-center gap-2 ${paymentMethod === 'CARD' ? 'bg-white shadow-sm text-primary' : 'text-gray-500 hover:bg-gray-200'}`}
                                onClick={() => setPaymentMethod('CARD')}
                            >
                                <span className="text-lg">💳</span> Thẻ
                            </button>
                        </div>

                        {/* Confirm */}
                        <div className="mt-4">
                            <Button
                                variant="primary"
                                onClick={handleBookRide}
                                loading={booking}
                                disabled={!selectedOption}
                                className="w-full py-4 text-base font-bold rounded-2xl shadow-lg shadow-blue-500/25"
                            >
                                Xác nhận {selectedOption?.vehicleType || ''} •{' '}
                                {selectedOption?.isFallback || selectedOption?.totalFare == null
                                    ? 'Giá cập nhật sau'
                                    : `${selectedOption?.totalFare?.toLocaleString('vi-VN')} ₫`
                                }
                            </Button>
                        </div>
                    </>
                )}
            </div>

            {/* Price Breakdown Modal */}
            {breakdownData && (
                <PriceBreakdownModal
                    data={breakdownData}
                    onClose={() => setBreakdownData(null)}
                />
            )}
        </div>
    );
}
