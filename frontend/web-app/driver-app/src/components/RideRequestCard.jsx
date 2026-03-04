export default function RideRequestCard({ ride, onAccept, onReject, accepting, countdown }) {
    // Countdown progress (0 to 1)
    const countdownProgress = countdown > 0 ? countdown / 10 : 0;

    return (
        <div className="bg-white rounded-2xl shadow-bottom-sheet p-5 animate-slideUp">
            {/* Header with Countdown */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-primary rounded-full animate-pulse"></div>
                    <span className="text-sm font-bold text-primary uppercase tracking-wide">Chuyến mới</span>
                </div>
                {countdown > 0 && (
                    <div className="flex items-center gap-2">
                        {/* Circular countdown */}
                        <div className="relative w-8 h-8">
                            <svg className="w-8 h-8 -rotate-90" viewBox="0 0 36 36">
                                <circle cx="18" cy="18" r="15" fill="none" stroke="#e5e7eb" strokeWidth="3" />
                                <circle
                                    cx="18" cy="18" r="15" fill="none"
                                    stroke={countdown <= 3 ? '#ef4444' : '#10b981'}
                                    strokeWidth="3"
                                    strokeDasharray={`${countdownProgress * 94.25} 94.25`}
                                    strokeLinecap="round"
                                    style={{ transition: 'stroke-dasharray 0.5s ease, stroke 0.3s ease' }}
                                />
                            </svg>
                            <span className={`absolute inset-0 flex items-center justify-center text-xs font-bold ${countdown <= 3 ? 'text-red-500' : 'text-gray-700'}`}>
                                {countdown}
                            </span>
                        </div>
                    </div>
                )}
            </div>

            {/* Route Info */}
            <div className="space-y-3 mb-4">
                {/* Pickup */}
                <div className="flex items-start gap-3">
                    <div className="mt-1 w-4 h-4 bg-blue-500 rounded-full border-2 border-blue-200 flex-shrink-0"></div>
                    <div>
                        <p className="text-xs text-gray-400 font-medium">ĐIỂM ĐÓN</p>
                        <p className="text-sm font-semibold text-gray-800 line-clamp-1">
                            {ride?.pickup?.address || 'Đang tải...'}
                        </p>
                    </div>
                </div>

                {/* Dropoff - ONLY SHOW IF AVAILABLE */}
                {ride?.dropoff && (
                    <>
                        {/* Connector Line */}
                        <div className="ml-[7px] w-[2px] h-4 bg-gray-200"></div>

                        <div className="flex items-start gap-3">
                            <div className="mt-1 w-4 h-4 bg-red-500 rounded-full border-2 border-red-200 flex-shrink-0"></div>
                            <div>
                                <p className="text-xs text-gray-400 font-medium">ĐIỂM TRẢ</p>
                                <p className="text-sm font-semibold text-gray-800 line-clamp-1">
                                    {ride.dropoff.address || 'Đang tải...'}
                                </p>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Price & Distance */}
            <div className="flex items-center justify-between bg-gray-50 rounded-xl p-3 mb-5">
                <div className="text-center">
                    <p className="text-xs text-gray-400">Ước tính</p>
                    <p className="text-lg font-bold text-gray-900">
                        {ride?.estimatedPrice ? `${Number(ride.estimatedPrice).toLocaleString('vi-VN')}₫` : '---'}
                    </p>
                </div>

                {/* Approx distance to PICKUP (driver → pickup) */}
                {ride?.approxDistanceToPickup != null && (
                    <>
                        <div className="w-px h-8 bg-gray-200"></div>
                        <div className="text-center">
                            <p className="text-xs text-gray-400">Đến điểm đón</p>
                            <p className="text-lg font-bold text-blue-600">
                                ~{Number(ride.approxDistanceToPickup).toFixed(1)} km
                            </p>
                        </div>
                    </>
                )}

                <div className="w-px h-8 bg-gray-200"></div>
                <div className="text-center">
                    <p className="text-xs text-gray-400">Loại xe</p>
                    <p className="text-lg font-bold text-gray-900">
                        {ride?.vehicleType === 'BIKE' ? '🛵' : '🚗'} {ride?.vehicleType || '---'}
                    </p>
                </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
                <button
                    onClick={onReject}
                    disabled={accepting}
                    className="flex-1 py-4 bg-red-50 text-red-600 font-bold rounded-xl hover:bg-red-100 transition-colors border border-red-100 disabled:opacity-50"
                >
                    Từ chối
                </button>
                <button
                    onClick={onAccept}
                    disabled={accepting}
                    className="flex-[2] py-4 bg-primary text-white font-bold rounded-xl hover:bg-green-600 transition-colors animate-glow disabled:opacity-50 disabled:animate-none"
                >
                    {accepting ? (
                        <span className="flex items-center justify-center gap-2">
                            <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
                                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" opacity="0.3" />
                                <path d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z" fill="currentColor" />
                            </svg>
                            Đang xử lý...
                        </span>
                    ) : countdown > 0 ? `Nhận chuyến (${countdown}s)` : 'Nhận chuyến'}
                </button>
            </div>
        </div>
    );
}
