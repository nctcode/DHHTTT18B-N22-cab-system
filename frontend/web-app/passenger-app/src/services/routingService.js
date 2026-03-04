import axios from 'axios';

const OSRM_URL = 'https://router.project-osrm.org/route/v1/driving';

export const routingService = {
    /**
     * Get route between two points
     * @param {Array} start - [lat, lng]
     * @param {Array} end - [lat, lng]
     * @returns {Object} { coordinates: [[lat, lng], ...], distance: meters, duration: seconds }
     */
    getRoute: async (start, end) => {
        if (!start || !end) return null;

        try {
            // OSRM expects: lng,lat;lng,lat
            const url = `${OSSRM_URL}/${start[1]},${start[0]};${end[1]},${end[0]}?overview=full&geometries=geojson`;
            const response = await axios.get(url);

            if (response.data.code === 'Ok' && response.data.routes.length > 0) {
                const route = response.data.routes[0];
                return {
                    coordinates: route.geometry.coordinates.map(c => [c[1], c[0]]), // Convert back to [lat, lng]
                    distance: route.distance,
                    duration: route.duration
                };
            }
            return null;
        } catch (error) {
            console.error('Routing error:', error);
            // Fallback: straight line? Or just return null
            return null;
        }
    }
};

export default routingService;
