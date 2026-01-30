import React from 'react';
import BookingStatus from './BookingStatus';

const BookingCard = ({ booking, onStatusChange, showActions = false }) => {
  const isDriver = showActions; // Nếu showActions true, coi như là driver view

  return (
    <div className="border rounded-lg p-4 mb-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="flex justify-between items-start mb-2">
            <h3 className="font-semibold text-lg">Booking #{booking.id}</h3>
            <BookingStatus 
              status={booking.status} 
              onStatusChange={onStatusChange}
              isDriver={isDriver}
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600 mb-1">
                <span className="font-medium">From:</span> {booking.pickupLocation}
              </p>
              <p className="text-sm text-gray-600 mb-1">
                <span className="font-medium">To:</span> {booking.dropoffLocation}
              </p>
              <p className="text-sm text-gray-600">
                <span className="font-medium">Distance:</span> {booking.distance || 'N/A'} km
              </p>
            </div>
            
            <div>
              <p className="text-sm text-gray-600 mb-1">
                <span className="font-medium">Pickup Time:</span> {new Date(booking.pickupTime).toLocaleString()}
              </p>
              <p className="text-sm text-gray-600 mb-1">
                <span className="font-medium">Vehicle:</span> {booking.vehicleType || 'Standard'}
              </p>
              <p className="text-sm text-gray-600">
                <span className="font-medium">Fare:</span> ${booking.fare || 'To be calculated'}
              </p>
            </div>
          </div>
          
          {booking.notes && (
            <div className="mt-3 pt-3 border-t">
              <p className="text-sm text-gray-600">
                <span className="font-medium">Notes:</span> {booking.notes}
              </p>
            </div>
          )}
          
          {booking.driver && (
            <div className="mt-3 pt-3 border-t">
              <p className="text-sm text-gray-600">
                <span className="font-medium">Driver:</span> {booking.driver.name}
              </p>
              <p className="text-sm text-gray-600">
                <span className="font-medium">Contact:</span> {booking.driver.phone}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BookingCard;