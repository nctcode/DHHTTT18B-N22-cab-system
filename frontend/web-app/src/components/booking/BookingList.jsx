import React from 'react';
import BookingCard from './BookingCard';

const BookingList = ({ bookings, onStatusChange, emptyMessage = "No bookings found" }) => {
  if (!bookings || bookings.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {bookings.map(booking => (
        <BookingCard 
          key={booking.id} 
          booking={booking} 
          onStatusChange={(action) => onStatusChange && onStatusChange(booking.id, action)}
        />
      ))}
    </div>
  );
};

export default BookingList;