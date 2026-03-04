export default function PriceBreakdownModal({ data, onClose }) {
    if (!data) return null;

    const hasSurge = data.surgeMultiplier && data.surgeMultiplier > 1;
    const breakdown = data.breakdown || {};

    const rows = [
        { label: 'Phí cơ bản', value: data.baseFare, icon: '🏷️' },
        { label: `Khoảng cách (${breakdown.distance_km?.toFixed(1) || '?'} km)`, value: data.distanceFare, icon: '📏' },
        { label: `Thời gian (${breakdown.duration_min?.toFixed(0) || '?'} phút)`, value: data.timeFare, icon: '⏱️' },
    ];

    return (
        <div className="fixed inset-0 z-[900] flex items-end sm:items-center justify-center">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

            {/* Modal */}
            <div className="relative bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md mx-auto
                            shadow-2xl transform animate-slideUp">
                {/* Handle */}
                <div className="flex justify-center pt-3 pb-1 sm:hidden">
                    <div className="w-10 h-1 bg-gray-300 rounded-full" />
                </div>

                {/* Header */}
                <div className="px-6 pt-4 pb-3 flex items-center justify-between border-b border-gray-100">
                    <div>
                        <h3 className="text-lg font-bold text-gray-900">Chi tiết giá</h3>
                        <p className="text-sm text-gray-500">{breakdown.vehicle_type || data.vehicleType}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
                    >
                        <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Fare Items */}
                <div className="px-6 py-4 space-y-3">
                    {rows.map((row, idx) => (
                        <div key={idx} className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <span className="text-lg">{row.icon}</span>
                                <span className="text-sm text-gray-700">{row.label}</span>
                            </div>
                            <span className="text-sm font-medium text-gray-900">
                                {(row.value || 0).toLocaleString('vi-VN')} ₫
                            </span>
                        </div>
                    ))}

                    {/* Surge */}
                    {hasSurge && (
                        <div className="flex items-center justify-between bg-amber-50 -mx-2 px-4 py-2.5 rounded-xl">
                            <div className="flex items-center gap-3">
                                <span className="text-lg">⚡</span>
                                <span className="text-sm text-amber-700 font-medium">Phí giờ cao điểm</span>
                            </div>
                            <span className="text-sm font-bold text-amber-700">
                                × {data.surgeMultiplier}
                            </span>
                        </div>
                    )}
                </div>

                {/* Total */}
                <div className="px-6 py-4 border-t border-gray-100">
                    <div className="flex items-center justify-between">
                        <span className="text-base font-bold text-gray-900">Tổng cộng</span>
                        <span className="text-xl font-bold text-primary">
                            {(data.totalFare || 0).toLocaleString('vi-VN')} ₫
                        </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                        {data.currency || 'VND'} • Giá thực tế có thể thay đổi dựa trên lộ trình
                    </p>
                </div>

                {/* Close */}
                <div className="px-6 pb-6 pt-1">
                    <button
                        onClick={onClose}
                        className="w-full py-3.5 bg-gray-100 hover:bg-gray-200 rounded-2xl text-gray-700 font-semibold transition-colors"
                    >
                        Đóng
                    </button>
                </div>
            </div>

            <style>{`
                @keyframes slideUp {
                    from { transform: translateY(100%); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
                .animate-slideUp { animation: slideUp 0.3s ease-out; }
            `}</style>
        </div>
    );
}
