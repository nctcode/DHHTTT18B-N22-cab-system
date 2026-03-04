const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

/**
 * Reverse geocode: coords → address
 */
export async function reverseGeocode(lat, lon) {
    try {
        const response = await fetch(`${API_URL}/route/geocode/reverse?lat=${lat}&lng=${lon}`);
        const result = await response.json();

        if (result.success && result.data) {
            const data = result.data;
            return {
                address: data.display_name || 'Unknown location',
                displayName: data.display_name || 'Unknown location',
                details: data.address || {},
                lat: parseFloat(data.lat),
                lon: parseFloat(data.lon),
            };
        }
        throw new Error('Geocoding API failed');
    } catch (error) {
        console.error('Reverse geocode error:', error);
        return {
            address: `${lat.toFixed(6)}, ${lon.toFixed(6)}`,
            displayName: `Location (${lat.toFixed(6)}, ${lon.toFixed(6)})`,
            details: {},
            lat,
            lon,
        };
    }
}

/**
 * Search places by query string
 */
export async function searchPlaces(query, options = {}) {
    if (!query || query.trim().length < 2) return [];

    try {
        const response = await fetch(`${API_URL}/route/geocode/search?q=${encodeURIComponent(query)}`);
        const result = await response.json();

        if (result.success && result.data) {
            return result.data.map((item) => ({
                id: item.place_id,
                name: item.name || item.display_name?.split(',')[0] || 'Unknown',
                address: item.display_name || '',
                lat: parseFloat(item.lat),
                lon: parseFloat(item.lon),
                type: item.type,
                category: item.class,
            }));
        }
        return [];
    } catch (error) {
        console.error('Search places error:', error);
        return [];
    }
}

export default { reverseGeocode, searchPlaces };
