import { useState } from 'react';

const vehicleConfig = {
    BIKE: { icon: '🛵', name: 'Xe máy', capacity: 1, description: 'Nhanh & tiết kiệm' },
    ECONOMY: { icon: '🚗', name: 'Tiêu chuẩn', capacity: 4, description: 'Tiết kiệm' },
    PREMIUM: { icon: '🚙', name: 'Cao cấp', capacity: 4, description: 'Thoải mái hơn' },
    SUV: { icon: '🚐', name: 'SUV (7 chỗ)', capacity: 6, description: 'Rộng rãi hơn' },
};

export default function RideOptionCard({ data, selected, onSelect, onViewBreakdown }) {
    const config = vehicleConfig[data.vehicleType] || vehicleConfig.ECONOMY;
    const hasSurge = data.surgeMultiplier && data.surgeMultiplier > 1;
    const isError = data.error;

    return (
        <div
            role="button"
            tabIndex={isError ? -1 : 0}
            onClick={() => !isError && onSelect(data)}
            onKeyDown={(e) => {
                if (!isError && (e.key === 'Enter' || e.key === ' ')) {
                    onSelect(data);
                }
            }}
            className={`
                flex-shrink-0 w-44 rounded-2xl p-4 transition-all duration-200 text-left border-2 outline-none
                ${isError
                    ? 'border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed'
                    : selected
                        ? 'border-primary bg-blue-50 shadow-lg shadow-blue-500/15 scale-[1.03]'
                        : 'border-gray-100 bg-white hover:border-gray-300 hover:shadow-md cursor-pointer'
                }
            `}
        >
            {/* Icon + Surge Badge */}
            <div className="flex items-center justify-between mb-3">
                <span className="text-4xl">{config.icon}</span>
                {hasSurge && (
                    <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                        ⚡ {data.surgeMultiplier}x
                    </span>
                )}
            </div>

            {/* Vehicle Name */}
            <p className="font-bold text-gray-900 text-sm">{config.name}</p>
            <p className="text-xs text-gray-500 mb-3">{config.description}</p>

            {/* ETA */}
            {data.eta && (
                <div className="flex items-center gap-1 mb-2">
                    <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-xs text-gray-500">{data.eta} phút</span>
                </div>
            )}

            {/* Price */}
            {isError ? (
                <p className="text-sm text-red-400 font-medium">Không khả dụng</p>
            ) : data.isFallback || data.totalFare == null ? (
                <p className="text-sm text-amber-500 font-medium animate-pulse">
                    Đang cập nhật giá...
                </p>
            ) : (
                <p className="font-bold text-primary text-lg">
                    {data.totalFare?.toLocaleString('vi-VN')} <span className="text-xs font-normal">₫</span>
                </p>
            )}

            {/* Capacity */}
            <div className="flex items-center gap-1 mt-1.5">
                <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="text-xs text-gray-400">{config.capacity} chỗ</span>
            </div>

            {/* View Breakdown Link */}
            {!isError && selected && onViewBreakdown && (
                <button
                    onClick={(e) => { e.stopPropagation(); onViewBreakdown(data); }}
                    className="mt-3 w-full text-xs text-primary font-medium hover:underline text-center"
                >
                    Xem chi tiết giá →
                </button>
            )}
        </div>
    );
}
