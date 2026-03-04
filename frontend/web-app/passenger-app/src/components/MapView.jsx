import { useState, useEffect, useImperativeHandle, forwardRef, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import DriverMarker from './DriverMarker';
import { DEFAULT_CENTER, DEFAULT_ZOOM, OSM_TILE_URL, OSM_ATTRIBUTION } from '../utils/mapHelpers';

// Fix default marker icon issue in Leaflet + bundlers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Current location blue dot icon
const currentLocationIcon = L.divIcon({
    className: 'current-location-marker',
    html: `
        <div style="
            width: 18px; height: 18px;
            background: #3B82F6;
            border: 3px solid white;
            border-radius: 50%;
            box-shadow: 0 0 0 4px rgba(59,130,246,0.25), 0 2px 6px rgba(0,0,0,0.2);
        "></div>
    `,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
});

// Pickup pin icon (center of map)
const pickupPinIcon = L.divIcon({
    className: 'pickup-pin-marker',
    html: `
        <div style="display:flex; flex-direction:column; align-items:center;">
            <div style="
                width: 32px; height: 32px;
                background: #3B82F6;
                border: 4px solid white;
                border-radius: 50%;
                box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                display: flex; align-items: center; justify-content: center;
            ">
                <div style="width:8px; height:8px; background:white; border-radius:50%;"></div>
            </div>
            <div style="width:3px; height:16px; background:#3B82F6;"></div>
            <div style="width:8px; height:4px; background:rgba(59,130,246,0.3); border-radius:50%;"></div>
        </div>
    `,
    iconSize: [32, 52],
    iconAnchor: [16, 52],
});

// Component to handle map events and expose center
function MapEventHandler({ onCenterChanged, onMapReady }) {
    const map = useMap();

    useEffect(() => {
        if (onMapReady) onMapReady(map);
    }, [map, onMapReady]);

    useMapEvents({
        dragend: () => {
            const center = map.getCenter();
            onCenterChanged?.([center.lat, center.lng]);
        },
    });

    return null;
}

// Fly to position when it changes — same pattern as driver-app
// Uses a ref so it only auto-flies on the FIRST real GPS fix, not on user pans
function FlyToPosition({ position }) {
    const map = useMap();
    useEffect(() => {
        if (position) {
            map.flyTo(position, 15, { duration: 1.5 });
        }
    }, [position, map]);
    return null;
}

const MapView = forwardRef(function MapView({
    onCenterChanged,
    nearbyDrivers = [],
    pickupPosition,
    destinationPosition,
    routeCoords,
    showCenterPin = true,
}, ref) {
    const [currentLocation, setCurrentLocation] = useState(DEFAULT_CENTER);
    const [hasFlownToGps, setHasFlownToGps] = useState(false); // fly only once on first GPS fix
    const [mapCenter, setMapCenter] = useState(DEFAULT_CENTER);
    const [mapInstance, setMapInstance] = useState(null);

    // Expose methods to parent
    useImperativeHandle(ref, () => ({
        getCenter: () => mapCenter,
        panTo: (pos) => {
            if (mapInstance) mapInstance.setView(pos, mapInstance.getZoom());
        },
        getCurrentLocation: () => currentLocation,
        invalidateSize: () => {
            if (mapInstance) mapInstance.invalidateSize();
        },
    }), [mapCenter, mapInstance, currentLocation]);

    // Get user's real GPS location on mount — same as driver-app pattern
    useEffect(() => {
        if (!navigator.geolocation) return;

        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const loc = [pos.coords.latitude, pos.coords.longitude];
                setCurrentLocation(loc);
                setMapCenter(loc);
                setHasFlownToGps(true); // triggers FlyToPosition once
            },
            () => {
                console.log('Geolocation denied, using default');
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    }, []);

    const handleCenterChanged = useCallback((center) => {
        setMapCenter(center);
        onCenterChanged?.(center);
    }, [onCenterChanged]);

    const handleMapReady = useCallback((map) => {
        setMapInstance(map);
    }, []);

    const handleRecenter = () => {
        if (mapInstance) {
            mapInstance.setView(currentLocation, DEFAULT_ZOOM);
        }
    };

    return (
        <div className="relative w-full h-full">
            <MapContainer
                center={DEFAULT_CENTER}
                zoom={DEFAULT_ZOOM}
                className="w-full h-full z-0"
                zoomControl={false}
                attributionControl={false}
            >
                <TileLayer url={OSM_TILE_URL} attribution={OSM_ATTRIBUTION} />

                <MapEventHandler
                    onCenterChanged={handleCenterChanged}
                    onMapReady={handleMapReady}
                />

                {/* FlyTo real GPS once — same pattern as driver-app */}
                {hasFlownToGps && (
                    <FlyToPosition position={currentLocation} />
                )}

                {/* Current Location Blue Dot — only show when no pickup marker to avoid duplicate dots */}
                {!pickupPosition && (
                    <Marker position={currentLocation} icon={currentLocationIcon} />
                )}

                {/* Static Pickup Marker (when set, not the center pin) */}
                {pickupPosition && (
                    <Marker position={pickupPosition} icon={pickupPinIcon} />
                )}

                {/* Destination Marker */}
                {destinationPosition && (
                    <Marker position={destinationPosition} />
                )}

                {/* Route Polyline */}
                {routeCoords && routeCoords.length >= 2 && (
                    <Polyline
                        positions={routeCoords}
                        pathOptions={{
                            color: '#3B82F6',
                            weight: 4,
                            opacity: 0.8,
                        }}
                    />
                )}

                {/* Nearby Drivers */}
                {/* Nearby Drivers - Filter invalid positions */}
                {nearbyDrivers
                    .filter(d => d && !isNaN(parseFloat(d.lat)) && !isNaN(parseFloat(d.lng)))
                    .map((driver, idx) => (
                        <DriverMarker
                            key={driver.id || idx}
                            position={[parseFloat(driver.lat), parseFloat(driver.lng)]}
                            name={driver.name}
                            vehicleType={driver.vehicleType}
                        />
                    ))}
            </MapContainer>

            {/* Center Pickup Pin (CSS overlay — always at visual center) */}
            {showCenterPin && (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-full z-[500] pointer-events-none">
                    <div className="flex flex-col items-center">
                        <div className="w-8 h-8 bg-primary rounded-full border-4 border-white shadow-lg flex items-center justify-center">
                            <div className="w-2 h-2 bg-white rounded-full" />
                        </div>
                        <div className="w-1 h-4 bg-primary" />
                        <div className="w-3 h-1.5 bg-primary/30 rounded-full" />
                    </div>
                </div>
            )}


        </div>
    );
});

export default MapView;
