import { useState, useEffect, useRef } from 'react';

export default function BottomSheet({
    children,
    collapsed = true,
    collapsedHeight = 280,
    expandedHeight = '85vh',
    onToggle,
}) {
    const [isExpanded, setIsExpanded] = useState(!collapsed);
    const [dragStartY, setDragStartY] = useState(null);
    const sheetRef = useRef(null);

    useEffect(() => {
        setIsExpanded(!collapsed);
    }, [collapsed]);

    const handleToggle = () => {
        const next = !isExpanded;
        setIsExpanded(next);
        onToggle?.(next);
    };

    const handleTouchStart = (e) => {
        setDragStartY(e.touches[0].clientY);
    };

    const handleTouchEnd = (e) => {
        if (dragStartY === null) return;
        const deltaY = e.changedTouches[0].clientY - dragStartY;

        // Swipe up → expand, swipe down → collapse
        if (deltaY < -50 && !isExpanded) {
            setIsExpanded(true);
            onToggle?.(true);
        } else if (deltaY > 50 && isExpanded) {
            setIsExpanded(false);
            onToggle?.(false);
        }
        setDragStartY(null);
    };

    return (
        <div
            ref={sheetRef}
            className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl z-30 transition-all duration-300 ease-out flex flex-col"
            style={{
                height: isExpanded ? expandedHeight : `${collapsedHeight}px`,
                maxHeight: '100%',
            }}
        >
            {/* Drag handle */}
            <div
                className="flex justify-center pt-3 pb-2 cursor-pointer"
                onClick={handleToggle}
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
            >
                <div className="w-10 h-1.5 bg-gray-300 rounded-full" />
            </div>

            {/* Content */}
            <div className="flex-1 px-5 pb-6 overflow-y-auto w-full relative box-border">
                {children}
            </div>
        </div>
    );
}
