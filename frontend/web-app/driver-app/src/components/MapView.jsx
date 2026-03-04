import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from 'react-leaflet';
import L from 'leaflet';
import { useEffect } from 'react';

// Fix default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const driverIcon = new L.DivIcon({
    className: 'driver-marker',
    html: `<div style="background: #10B981; width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 3px solid white; box-shadow: 0 2px 10px rgba(0,0,0,0.3); font-size: 18px;">🚗</div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
});

const pickupIcon = new L.DivIcon({
    className: 'pickup-marker',
    html: `<div style="background: #3B82F6; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 3px solid white; box-shadow: 0 2px 10px rgba(0,0,0,0.3); font-size: 16px;">📍</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
});

const dropoffIcon = new L.DivIcon({
    className: 'dropoff-marker',
    html: `<div style="background: #EF4444; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 3px solid white; box-shadow: 0 2px 10px rgba(0,0,0,0.3); font-size: 16px;">🏁</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
});

function FlyToPosition({ position }) {
    const map = useMap();
    useEffect(() => {
        if (position) {
            map.panTo(position, { animate: true, duration: 0.25 });
        }
    }, [position, map]);
    return null;
}

export default function MapView({ driverPosition, pickupPosition, dropoffPosition, routeCoords, zoom = 15 }) {
    const center = driverPosition || [10.7769, 106.7009]; // Default: HCM

    return (
        <MapContainer
            center={center}
            zoom={zoom}
            className="w-full h-full"
            zoomControl={false}
        >
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            <FlyToPosition position={driverPosition || center} />

            {driverPosition && (
                <Marker position={driverPosition} icon={driverIcon}>
                    <Popup>Vị trí của bạn</Popup>
                </Marker>
            )}

            {pickupPosition && (
                <Marker position={pickupPosition} icon={pickupIcon}>
                    <Popup>Điểm đón khách</Popup>
                </Marker>
            )}

            {dropoffPosition && (
                <Marker position={dropoffPosition} icon={dropoffIcon}>
                    <Popup>Điểm trả khách</Popup>
                </Marker>
            )}

            {routeCoords && routeCoords.length > 1 && (
                <Polyline positions={routeCoords} color="blue" />
            )}
        </MapContainer>
    );
}
