// Utility to decode Google-style polylines if we were using 'overview=simplified' or 'overview=full' without geometries=geojson
// We are using geometries=geojson which gives us coordinates directly, but keeping this structure for consistency.
const polyline = require('polyline');

exports.decode = (encoded) => {
  return polyline.decode(encoded);
};
