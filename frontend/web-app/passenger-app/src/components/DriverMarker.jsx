import { useEffect, useRef, useState } from 'react';
import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { calculateBearing, interpolatePosition } from '../utils/mapHelpers';

// Create a rotatable car icon
function createDriverIcon(bearing = 0) {
    return L.divIcon({
        className: 'driver-marker',
        html: `
            <div style="
                transform: rotate(${bearing}deg);
                width: 36px;
                height: 36px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 24px;
                filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
                transition: transform 0.3s ease;
            ">🚗</div>
        `,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
        popupAnchor: [0, -20],
    });
}

/**
 * DriverMarker component with smooth movement animation and rotation.
 * @param {{position: [number,number], name?: string, vehicleType?: string}} props
 */
export default function DriverMarker({ position, name, vehicleType }) {
    // Ensure numbers
    const safePos = [parseFloat(position[0]), parseFloat(position[1])];
    const [currentPos, setCurrentPos] = useState(safePos);
    const [bearing, setBearing] = useState(0);
    const prevPos = useRef(safePos);
    const animRef = useRef(null);

    useEffect(() => {
        if (!position) return;

        // Start from the current visual position to prevent jumping back
        // if the previous animation hasn't finished.
        const from = currentPos;
        const to = position;

        // Calculate bearing for icon rotation
        if (from[0] !== to[0] || from[1] !== to[1]) {
            setBearing(calculateBearing(from, to));
        }

        // Smooth animation over 1 second (handling rapid updates)
        const duration = 1000;
        const startTime = performance.now();

        const animate = (now) => {
            const elapsed = now - startTime;
            const t = Math.min(elapsed / duration, 1);

            // Linear or Ease-out
            // Using linear for consistent speed if updates are frequent
            // Or Ease-out for nicer checking
            const eased = 1 - Math.pow(1 - t, 3);

            const newPos = interpolatePosition(from, to, eased);
            setCurrentPos(newPos);

            if (t < 1) {
                animRef.current = requestAnimationFrame(animate);
            } else {
                // Animation complete
                prevPos.current = to;
            }
        };

        if (animRef.current) cancelAnimationFrame(animRef.current);
        animRef.current = requestAnimationFrame(animate);

        return () => {
            if (animRef.current) cancelAnimationFrame(animRef.current);
        };
    }, [position]); // specific dependency on position value change handled by React

    const icon = createDriverIcon(bearing);
    const displayIcon = vehicleType === 'BIKE' ? '🏍️' : '🚗';

    return (
        <Marker position={currentPos} icon={icon}>
            <Popup>
                <div className="text-center text-sm">
                    <p className="font-semibold">{displayIcon} {name || 'Driver'}</p>
                    <p className="text-gray-500 text-xs">{vehicleType || 'CAR'}</p>
                </div>
            </Popup>
        </Marker>
    );
}
