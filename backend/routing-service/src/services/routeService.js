const axios = require('axios');
const polyline = require('polyline');
const polylineDecoder = require('../utils/polylineDecoder');

const OSRM_URL = process.env.OSRM_URL || 'http://router.project-osrm.org';

exports.calculateRoute = async (pickup, destination) => {
  try {
    // OSRM expects: {lng},{lat};{lng},{lat}
    // Timeout of 3 seconds
    const url = `${OSRM_URL}/route/v1/driving/${pickup.lng},${pickup.lat};${destination.lng},${destination.lat}?overview=full&geometries=geojson`;
    
    console.log(`Requesting OSRM: ${url}`);
    const response = await axios.get(url, { timeout: 10000 });

    if (!response.data.routes || response.data.routes.length === 0) {
      throw new Error('No route returned from OSRM');
    }

    const routeData = response.data.routes[0];
    
    // Convert OSRM format (geojson [lng, lat]) to Leaflet format ([lat, lng])
    const decodedPolyline = routeData.geometry.coordinates.map(coord => [coord[1], coord[0]]);

    console.log("Polyline points:", decodedPolyline.length);

    return {
      distanceKm: routeData.distance / 1000, // meters to km
      durationMin: routeData.duration / 60, // seconds to minutes
      polyline: decodedPolyline
    };

  } catch (error) {
    console.error('OSRM failed, falling back to Haversine:', error.message);
    // Fallback ONLY triggers here
    return fallbackRoute(pickup, destination);
  }
};

function fallbackRoute(pickup, destination) {
  const distanceKm = haversineDistance(pickup, destination);
  const durationMin = (distanceKm / 30) * 60; // Assume 30 km/h average speed

  // Return a straight line
  return {
    distanceKm: parseFloat(distanceKm.toFixed(2)),
    durationMin: Math.ceil(durationMin),
    polyline: [[pickup.lat, pickup.lng], [destination.lat, destination.lng]]
  };
}

function haversineDistance(coords1, coords2) {
  const toRad = (x) => (x * Math.PI) / 180;
  const R = 6371; // Earth radius in km

  const dLat = toRad(coords2.lat - coords1.lat);
  const dLon = toRad(coords2.lng - coords1.lng);
  const lat1 = toRad(coords1.lat);
  const lat2 = toRad(coords2.lat);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}
