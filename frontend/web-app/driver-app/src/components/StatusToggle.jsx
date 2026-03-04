import { useState } from 'react';

export default function StatusToggle({ isOnline, onToggle, loading }) {
    return (
        <div className="flex items-center gap-3">
            <button
                onClick={onToggle}
                disabled={loading}
                className={`
                    relative w-16 h-9 rounded-full transition-all duration-300 ease-in-out
                    ${isOnline
                        ? 'bg-primary shadow-[0_0_15px_rgba(16,185,129,0.4)]'
                        : 'bg-gray-300'
                    }
                    ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                `}
            >
                <span
                    className={`
                        absolute top-1 w-7 h-7 bg-white rounded-full shadow-md
                        transition-all duration-300 ease-in-out
                        ${isOnline ? 'left-8' : 'left-1'}
                    `}
                />
            </button>
            <div className="flex items-center gap-2">
                {isOnline && (
                    <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
                    </span>
                )}
                <span className={`font-semibold text-sm ${isOnline ? 'text-primary' : 'text-gray-400'}`}>
                    {loading ? 'Đang chuyển...' : isOnline ? 'Đang hoạt động' : 'Ngoại tuyến'}
                </span>
            </div>
        </div>
    );
}
