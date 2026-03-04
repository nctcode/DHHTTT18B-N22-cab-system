import React from 'react';

export default function RippleAnimation() {
    return (
        <div className="relative flex items-center justify-center w-24 h-24">
            <div className="absolute w-4 h-4 bg-primary rounded-full z-10 shadow-lg border-2 border-white"></div>
            <div className="absolute w-full h-full bg-blue-500 rounded-full opacity-20 animate-ping"></div>
            <div className="absolute w-16 h-16 bg-blue-400 rounded-full opacity-30 animate-pulse"></div>
        </div>
    );
}
