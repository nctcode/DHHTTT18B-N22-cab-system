import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { searchPlaces } from '../services/geocodeService';

const RECENT_KEY = 'recentDestinations';
const MAX_RECENTS = 5;

// Popular places in HCM
const suggestedPlaces = [
    { name: 'Sân bay Tân Sơn Nhất', address: 'Trường Sơn, Phường 2, Tân Bình, TP.HCM', icon: '✈️' },
    { name: 'Bến Thành Market', address: 'Lê Lợi, Phường Bến Thành, Quận 1, TP.HCM', icon: '🏪' },
    { name: 'Bến xe Miền Đông', address: '292 Đinh Bộ Lĩnh, Phường 26, Bình Thạnh, TP.HCM', icon: '🚌' },
    { name: 'Bệnh viện Chợ Rẫy', address: '201B Nguyễn Chí Thanh, Phường 12, Quận 5, TP.HCM', icon: '🏥' },
    { name: 'Nhà thờ Đức Bà', address: '01 Công xã Paris, Phường Bến Nghé, Quận 1, TP.HCM', icon: '⛪' },
];

function getRecentDestinations() {
    try {
        const data = localStorage.getItem(RECENT_KEY);
        return data ? JSON.parse(data) : [];
    } catch {
        return [];
    }
}

function saveRecentDestination(place) {
    const recents = getRecentDestinations().filter((r) => r.address !== place.address);
    recents.unshift(place);
    localStorage.setItem(RECENT_KEY, JSON.stringify(recents.slice(0, MAX_RECENTS)));
}

export default function Destination() {
    const navigate = useNavigate();
    const location = useLocation();
    const { pickup, pickupLocation } = location.state || {};

    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [recents, setRecents] = useState([]);
    const [isSearching, setIsSearching] = useState(false);

    const searchTimeout = useRef(null);
    const inputRef = useRef(null);

    useEffect(() => {
        setRecents(getRecentDestinations());
        setTimeout(() => inputRef.current?.focus(), 300);
    }, []);

    // Debounced Nominatim search
    const handleSearch = useCallback((value) => {
        setQuery(value);
        if (searchTimeout.current) clearTimeout(searchTimeout.current);

        if (!value.trim()) {
            setResults([]);
            setIsSearching(false);
            return;
        }

        setIsSearching(true);
        searchTimeout.current = setTimeout(async () => {
            const options = {};
            if (pickupLocation) {
                options.lat = pickupLocation[0];
                options.lon = pickupLocation[1];
            }
            const places = await searchPlaces(value, options);
            setResults(places);
            setIsSearching(false);
        }, 400);
    }, [pickupLocation]);

    const handleSelectPlace = (place) => {
        const destination = {
            name: place.name,
            address: place.address,
            location: [place.lat, place.lon],
        };
        saveRecentDestination(destination);
        navigateToRideOptions(destination);
    };

    const handleSelectRecent = (place) => {
        saveRecentDestination(place);
        navigateToRideOptions(place);
    };

    const handleSelectSuggested = (place) => {
        setQuery(place.name);
        handleSearch(place.name);
    };

    const navigateToRideOptions = (destination) => {
        navigate('/ride-options', {
            state: {
                pickup: pickup || 'Current Location',
                pickupLocation,
                destination: destination.address || destination.name,
                destinationLocation: destination.location,
            },
        });
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
                    <h1 className="text-lg font-bold text-gray-900">Chọn điểm đến</h1>
                </div>

                {/* Route indicators + inputs */}
                <div className="px-4 pb-4">
                    <div className="flex gap-3">
                        <div className="flex flex-col items-center pt-3.5 gap-1">
                            <div className="w-3 h-3 bg-primary rounded-full border-2 border-blue-300" />
                            <div className="w-0.5 h-8 bg-gray-300" />
                            <div className="w-3 h-3 bg-red-500 rounded-full border-2 border-red-300" />
                        </div>

                        <div className="flex-1 min-w-0 space-y-2">
                            <div className="px-4 py-2.5 bg-gray-50 rounded-xl border border-gray-100">
                                <p className="text-xs text-gray-400 font-medium">ĐIỂM ĐÓN</p>
                                <p className="text-sm text-gray-700 truncate">{pickup || 'Vị trí hiện tại'}</p>
                            </div>

                            <div className="relative">
                                <input
                                    ref={inputRef}
                                    type="text"
                                    value={query}
                                    onChange={(e) => handleSearch(e.target.value)}
                                    placeholder="Bạn muốn đi đâu?"
                                    className="w-full px-4 py-3 bg-red-50/50 border-2 border-red-100 rounded-xl text-sm focus:outline-none focus:border-red-300 focus:ring-2 focus:ring-red-100 transition-all placeholder:text-gray-400"
                                    autoComplete="off"
                                />
                                {query && (
                                    <button
                                        onClick={() => { setQuery(''); setResults([]); }}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded-full bg-gray-200 hover:bg-gray-300 transition-colors"
                                    >
                                        <svg className="w-3.5 h-3.5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
                {/* Loading */}
                {isSearching && (
                    <div className="flex items-center gap-3 px-6 py-4">
                        <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                        <span className="text-sm text-gray-500">Đang tìm kiếm...</span>
                    </div>
                )}

                {/* Search Results */}
                {results.length > 0 && (
                    <div className="bg-white">
                        <div className="px-6 pt-4 pb-2">
                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Kết quả tìm kiếm</p>
                        </div>
                        {results.map((place) => (
                            <button
                                key={place.id}
                                onClick={() => handleSelectPlace(place)}
                                className="w-full flex items-start gap-3 px-6 py-3.5 hover:bg-gray-50 active:bg-gray-100 transition-colors text-left"
                            >
                                <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                                    <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-900 truncate">{place.name}</p>
                                    <p className="text-xs text-gray-500 truncate mt-0.5">{place.address}</p>
                                </div>
                            </button>
                        ))}
                    </div>
                )}

                {/* No search: show recents + suggested */}
                {!query && results.length === 0 && (
                    <>
                        {recents.length > 0 && (
                            <div className="bg-white mb-2">
                                <div className="px-6 pt-5 pb-2 flex items-center justify-between">
                                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Gần đây</p>
                                    <button
                                        onClick={() => { localStorage.removeItem(RECENT_KEY); setRecents([]); }}
                                        className="text-xs text-red-400 hover:text-red-500 font-medium"
                                    >Xóa</button>
                                </div>
                                {recents.map((place, index) => (
                                    <button
                                        key={`recent-${index}`}
                                        onClick={() => handleSelectRecent(place)}
                                        className="w-full flex items-start gap-3 px-6 py-3 hover:bg-gray-50 active:bg-gray-100 transition-colors text-left"
                                    >
                                        <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                                            <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-gray-900 truncate">{place.name}</p>
                                            <p className="text-xs text-gray-500 truncate mt-0.5">{place.address}</p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}

                        <div className="bg-white">
                            <div className="px-6 pt-5 pb-2">
                                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Địa điểm gợi ý</p>
                            </div>
                            {suggestedPlaces.map((place, index) => (
                                <button
                                    key={`suggested-${index}`}
                                    onClick={() => handleSelectSuggested(place)}
                                    className="w-full flex items-start gap-3 px-6 py-3 hover:bg-gray-50 active:bg-gray-100 transition-colors text-left"
                                >
                                    <div className="w-10 h-10 bg-amber-50 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-lg">
                                        {place.icon}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-gray-900 truncate">{place.name}</p>
                                        <p className="text-xs text-gray-500 truncate mt-0.5">{place.address}</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </>
                )}

                {/* No results */}
                {query && !isSearching && results.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-16 px-6">
                        <div className="text-5xl mb-4">🔍</div>
                        <p className="text-gray-500 font-medium">Không tìm thấy địa điểm</p>
                        <p className="text-sm text-gray-400 mt-1 text-center">Thử nhập từ khóa khác</p>
                    </div>
                )}
            </div>
        </div>
    );
}
