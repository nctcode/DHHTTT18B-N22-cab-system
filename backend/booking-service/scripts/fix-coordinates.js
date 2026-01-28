// scripts/fix-coordinates.js
const mongoose = require('mongoose');

async function fixCoordinates() {
  await mongoose.connect('mongodb://localhost:27017/cab_booking');
  
  const Booking = mongoose.model('Booking', new mongoose.Schema({}, { strict: false }));
  
  const bookings = await Booking.find({});
  
  for (const booking of bookings) {
    // Fix pickupLocation
    if (booking.pickupLocation && 
        booking.pickupLocation.coordinates && 
        typeof booking.pickupLocation.coordinates === 'object') {
      
      const oldCoords = booking.pickupLocation.coordinates;
      if (oldCoords.lat !== undefined && oldCoords.lng !== undefined) {
        booking.pickupLocation.coordinates = [oldCoords.lng, oldCoords.lat];
        console.log(`Fixed pickup for ${booking.bookingId}: [${oldCoords.lng}, ${oldCoords.lat}]`);
      }
    }
    
    // Fix destination
    if (booking.destination && 
        booking.destination.coordinates && 
        typeof booking.destination.coordinates === 'object') {
      
      const oldCoords = booking.destination.coordinates;
      if (oldCoords.lat !== undefined && oldCoords.lng !== undefined) {
        booking.destination.coordinates = [oldCoords.lng, oldCoords.lat];
        console.log(`Fixed destination for ${booking.bookingId}`);
      }
    }
    
    await booking.save();
  }
  
  console.log('All coordinates fixed!');
  process.exit(0);
}

fixCoordinates().catch(console.error);