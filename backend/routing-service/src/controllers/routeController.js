const routeService = require('../services/routeService');
const geocodeService = require('../services/geocodeService');

exports.getRoute = async (req, res) => {
  try {
    const { pickup, destination } = req.body;

    if (!pickup || !destination || !pickup.lat || !pickup.lng || !destination.lat || !destination.lng) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid pickup or destination coordinates' 
      });
    }

    const route = await routeService.calculateRoute(pickup, destination);
    res.json({
      success: true,
      data: route
    });
  } catch (error) {
    console.error('Error in getRoute:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to calculate route' 
    });
  }
};

exports.reverseGeocode = async (req, res) => {
  try {
    const { lat, lng } = req.query;
    if (!lat || !lng) {
      return res.status(400).json({ success: false, message: 'Missing lat/lng' });
    }
    const data = await geocodeService.reverseGeocode(lat, lng);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Geocoding failed' });
  }
};

exports.searchPlaces = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) {
      return res.status(400).json({ success: false, message: 'Missing query' });
    }
    const data = await geocodeService.searchPlaces(q);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Search failed' });
  }
};
