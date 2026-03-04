import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import MapView from '../components/MapView';
import BottomSheet from '../components/BottomSheet';
import { reverseGeocode } from '../services/geocodeService';

export default function Home() {
    const navigate = useNavigate();
    const { user, logout, loading } = useAuth();
    const { socketService, isConnected } = useSocket();
    const mapRef = useRef(null);

    const [pickupAddress, setPickupAddress] = useState('Đang xác định vị trí của bạn...');
    const [pickupCoords, setPickupCoords] = useState(null);
    const [isLocating, setIsLocating] = useState(true);
    const [nearbyDrivers, setNearbyDrivers] = useState([]);
    const [showMenu, setShowMenu] = useState(false);

    // Saved places
    const [savedPlaces] = useState(() => {
        try {
            const saved = localStorage.getItem('savedPlaces');
            return saved ? JSON.parse(saved) : { home: null, work: null };
        } catch {
            return { home: null, work: null };
        }
    });

    // Auth guard — wait for loading to finish before redirecting
    useEffect(() => {
        if (!loading && !user) navigate('/login', { replace: true });
    }, [user, loading, navigate]);

    // Listen for nearby drivers via global socket (NO connect/disconnect here)
    useEffect(() => {
        const handleNearbyDrivers = (data) => {
            if (Array.isArray(data)) {
                setNearbyDrivers(data);
            } else if (data?.type === 'nearby_drivers' && Array.isArray(data.drivers)) {
                setNearbyDrivers(data.drivers);
            }
        };

        socketService.onNearbyDrivers(handleNearbyDrivers);
        socketService.onLocationUpdate((data) => {
            if (data?.type === 'nearby_drivers' && Array.isArray(data.drivers)) {
                setNearbyDrivers(data.drivers);
            }
        });

        return () => {
            socketService.offNearbyDrivers(handleNearbyDrivers);
        };
    }, [socketService]);

    // Auto-detect address on mount
    useEffect(() => {
        if (!navigator.geolocation) {
            setIsLocating(false);
            setPickupAddress('Không hỗ trợ định vị');
            return;
        }

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const coords = [position.coords.latitude, position.coords.longitude];
                setPickupCoords(coords);
                setIsLocating(false);

                const result = await reverseGeocode(coords[0], coords[1]);
                setPickupAddress(result.address);
            },
            () => {
                setIsLocating(false);
                setPickupAddress('Không thể xác định vị trí');
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    }, []);

    // When user drags map, update pickup address
    const geocodeTimeoutRef = useRef(null);

    // When user drags map, update pickup address (Debounced)
    const handleMapCenterChanged = useCallback((center) => {
        setPickupCoords(center);
        setPickupAddress('Đang tải địa chỉ...');

        if (geocodeTimeoutRef.current) {
            clearTimeout(geocodeTimeoutRef.current);
        }

        geocodeTimeoutRef.current = setTimeout(async () => {
            const result = await reverseGeocode(center[0], center[1]);
            setPickupAddress(result.address);
        }, 1000); // 1 second debounce
    }, []);

    const handleSetDestination = () => {
        navigate('/destination', {
            state: {
                pickup: pickupAddress,
                pickupLocation: pickupCoords,
            },
        });
    };

    const handleSavedPlace = (place) => {
        if (!place) return;
        navigate('/destination', {
            state: {
                pickup: pickupAddress,
                pickupLocation: pickupCoords,
                preset: place,
            },
        });
    };

    const handleLogout = async () => {
        await logout();
        navigate('/login', { replace: true });
    };

    if (!user) return null;

    return (
        <div className="relative h-full w-full overflow-hidden bg-gray-100 flex flex-col box-border">
            {/* Hamburger */}
            <button
                onClick={() => setShowMenu(!showMenu)}
                className="absolute top-6 left-4 z-[600] w-11 h-11 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-50 active:bg-gray-100 transition-colors"
            >
                <svg className="w-5 h-5 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
            </button>

            {/* Side Menu */}
            {showMenu && (
                <>
                    <div className="fixed inset-0 bg-black/40 z-[700]" onClick={() => setShowMenu(false)} />
                    <div className="fixed top-0 left-0 bottom-0 w-72 bg-white z-[800] shadow-2xl animate-slideIn">
                        <div className="bg-gradient-to-br from-primary to-blue-700 px-6 pt-12 pb-6 text-white">
                            <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center text-2xl font-bold mb-3">
                                {user?.email?.charAt(0)?.toUpperCase() || 'U'}
                            </div>
                            <p className="font-semibold text-lg">{user?.email || 'Người dùng'}</p>
                            <p className="text-blue-200 text-sm capitalize">{user?.role === 'SUPERADMIN' ? 'Siêu quản trị' : user?.role === 'DRIVER' ? 'Tài xế' : 'Hành khách'}</p>
                        </div>
                        <nav className="py-4">
                            {[
                                { icon: '🏠', label: 'Trang chủ', onClick: () => setShowMenu(false) },
                                { icon: '📋', label: 'Lịch sử chuyến đi', onClick: () => navigate('/history') },
                                { icon: '💰', label: 'Ví', onClick: () => navigate('/wallet') },
                                { icon: '👤', label: 'Hồ sơ', onClick: () => navigate('/profile') },
                            ].map((item) => (
                                <button key={item.label} onClick={item.onClick}
                                    className="w-full flex items-center px-6 py-3.5 hover:bg-gray-50 transition-colors text-left">
                                    <span className="text-xl mr-4">{item.icon}</span>
                                    <span className="text-gray-700 font-medium">{item.label}</span>
                                </button>
                            ))}
                            <div className="border-t border-gray-100 my-2" />
                            <button onClick={handleLogout}
                                className="w-full flex items-center px-6 py-3.5 hover:bg-red-50 transition-colors text-left">
                                <span className="text-xl mr-4">🚪</span>
                                <span className="text-red-600 font-medium">Đăng xuất</span>
                            </button>
                        </nav>
                    </div>
                </>
            )}

            {/* Full-Screen Map */}
            <div className="absolute inset-0">
                <MapView
                    ref={mapRef}
                    onCenterChanged={handleMapCenterChanged}
                    nearbyDrivers={nearbyDrivers}
                    showCenterPin
                />
            </div>

            {/* Nearby Drivers Badge */}
            {nearbyDrivers.length > 0 && (
                <div className="absolute top-6 right-4 z-[600] bg-white/95 backdrop-blur-sm px-3 py-2 rounded-full shadow-lg flex items-center gap-2">
                    <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse" />
                    <span className="text-sm font-medium text-gray-700">
                        {nearbyDrivers.length} tài xế gần đây
                    </span>
                </div>
            )}

            {/* Bottom Sheet */}
            <BottomSheet collapsed collapsedHeight={260}>
                <div className="mb-4">
                    <h2 className="text-xl font-bold text-gray-900">Bạn muốn đi đâu?</h2>
                    <p className="text-sm text-gray-500 mt-0.5">Chọn điểm đến của bạn</p>
                </div>

                {/* Pickup Address */}
                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl mb-4">
                    <div className="mt-0.5">
                        <div className="w-3 h-3 bg-primary rounded-full border-2 border-blue-300" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Điểm đón</p>
                        <p className={`text-sm font-medium truncate ${isLocating ? 'text-gray-400' : 'text-gray-800'}`}>
                            {isLocating ? (
                                <span className="flex items-center gap-2">
                                    <svg className="w-3.5 h-3.5 animate-spin text-primary" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                    </svg>
                                    Đang xác định vị trí của bạn...
                                </span>
                            ) : pickupAddress}
                        </p>
                    </div>
                    <button
                        onClick={() => mapRef.current?.panTo(mapRef.current.getCurrentLocation())}
                        className="px-2 py-1 text-primary hover:bg-blue-50 rounded-lg transition-colors"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 2v2m0 16v2M2 12h2m16 0h2" />
                        </svg>
                    </button>
                </div>

                {/* Home / Work Shortcuts */}
                <div className="flex gap-3 mb-5">
                    <button onClick={() => handleSavedPlace(savedPlaces.home)}
                        className="flex-1 flex items-center gap-2.5 px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors border border-gray-100">
                        <div className="w-9 h-9 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1" />
                            </svg>
                        </div>
                        <div className="text-left min-w-0">
                            <p className="text-sm font-semibold text-gray-800">Nhà</p>
                            <p className="text-xs text-gray-400 truncate">{savedPlaces.home?.address || 'Thiết lập địa chỉ'}</p>
                        </div>
                    </button>
                    <button onClick={() => handleSavedPlace(savedPlaces.work)}
                        className="flex-1 flex items-center gap-2.5 px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors border border-gray-100">
                        <div className="w-9 h-9 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                        </div>
                        <div className="text-left min-w-0">
                            <p className="text-sm font-semibold text-gray-800">Nơi làm việc</p>
                            <p className="text-xs text-gray-400 truncate">{savedPlaces.work?.address || 'Thiết lập địa chỉ'}</p>
                        </div>
                    </button>
                </div>

                {/* CTA */}
                <button
                    onClick={handleSetDestination}
                    disabled={isLocating}
                    className="w-full py-4 bg-primary hover:bg-blue-600 active:bg-blue-700 disabled:bg-gray-300 text-white rounded-2xl font-bold text-base shadow-lg shadow-blue-500/25 hover:shadow-xl transition-all duration-200 flex items-center justify-center gap-2"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    Chọn điểm đến
                </button>
            </BottomSheet>

            {/* Slide-in animation */}
            <style>{`
                @keyframes slideIn {
                    from { transform: translateX(-100%); }
                    to { transform: translateX(0); }
                }
                .animate-slideIn { animation: slideIn 0.25s ease-out; }
            `}</style>
        </div>
    );
}
