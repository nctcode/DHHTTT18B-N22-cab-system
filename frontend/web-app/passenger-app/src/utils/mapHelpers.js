/**
 * Map utility helpers for Leaflet integration.
 */

// Default center: Ho Chi Minh City
export const DEFAULT_CENTER = [10.8231, 106.6297];
export const DEFAULT_ZOOM = 16;

/**
 * Calculate bearing between two points (in degrees)
 */
export function calculateBearing(from, to) {
    const lat1 = (from[0] * Math.PI) / 180;
    const lat2 = (to[0] * Math.PI) / 180;
    const dLon = ((to[1] - from[1]) * Math.PI) / 180;

    const y = Math.sin(dLon) * Math.cos(lat2);
    const x =
        Math.cos(lat1) * Math.sin(lat2) -
        Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);

    return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

/**
 * Calculate distance between two points in meters (Haversine)
 */
export function calculateDistance(from, to) {
    const R = 6371000; // Earth radius in meters
    const lat1 = (from[0] * Math.PI) / 180;
    const lat2 = (to[0] * Math.PI) / 180;
    const dLat = lat2 - lat1;
    const dLon = ((to[1] - from[1]) * Math.PI) / 180;

    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;

    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Interpolate between two positions for smooth animation
 * @param {[number, number]} from
 * @param {[number, number]} to
 * @param {number} t - Progress 0..1
 * @returns {[number, number]}
 */
export function interpolatePosition(from, to, t) {
    return [
        from[0] + (to[0] - from[0]) * t,
        from[1] + (to[1] - from[1]) * t,
    ];
}

/**
 * OpenStreetMap tile URL
 */
export const OSM_TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
export const OSM_ATTRIBUTION =
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

/**
 * Ride status constants matching backend
 */
export const RIDE_STATUS = {
    REQUESTED: 'REQUESTED',
    DRIVER_ASSIGNED: 'DRIVER_ASSIGNED',
    ARRIVING: 'ARRIVING',
    IN_PROGRESS: 'IN_PROGRESS',
    COMPLETED: 'COMPLETED',
    CANCELLED: 'CANCELLED',
};
