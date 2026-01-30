import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useSelector } from 'react-redux';

const BookingDetails = () => {
  const { id } = useParams();
  const { bookings } = useSelector(state => state.booking);
  const [booking, setBooking] = useState(null);

  useEffect(() => {
    // Find booking by ID
    const foundBooking = bookings.find(b => b.id === parseInt(id));
    setBooking(foundBooking);
  }, [id, bookings]);

  if (!booking) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-semibold text-gray-700">Booking not found</h2>
        <Link to="/customer/my-bookings" className="mt-4 inline-block text-blue-600 hover:underline">
          ← Back to My Bookings
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <Link to="/customer/my-bookings" className="text-blue-600 hover:underline flex items-center">
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
          </svg>
          Back to My Bookings
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-800">Booking Details #{booking.id}</h1>
            <span className={`px-4 py-1 rounded-full text-sm font-semibold ${
              booking.status === 'confirmed' ? 'bg-green-100 text-green-800' :
              booking.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
              booking.status === 'cancelled' ? 'bg-red-100 text-red-800' :
              'bg-blue-100 text-blue-800'
            }`}>
              {booking.status.toUpperCase()}
            </span>
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h2 className="text-lg font-semibold text-gray-700 mb-4">Trip Information</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500">Pickup Location</label>
                  <p className="mt-1 text-gray-900">{booking.pickupLocation}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Destination</label>
                  <p className="mt-1 text-gray-900">{booking.dropoffLocation}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Pickup Time</label>
                  <p className="mt-1 text-gray-900">{new Date(booking.pickupTime).toLocaleString()}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Vehicle Type</label>
                  <p className="mt-1 text-gray-900 capitalize">{booking.vehicleType}</p>
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-gray-700 mb-4">Booking Details</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500">Booking ID</label>
                  <p className="mt-1 text-gray-900">#{booking.id}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Booking Date</label>
                  <p className="mt-1 text-gray-900">{new Date(booking.createdAt).toLocaleDateString()}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Estimated Fare</label>
                  <p className="mt-1 text-2xl font-bold text-blue-600">
                    ${booking.fare || '--'}
                  </p>
                </div>
                {booking.driver && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Assigned Driver</label>
                    <p className="mt-1 text-gray-900">{booking.driver.name}</p>
                    <p className="text-sm text-gray-500">{booking.driver.phone}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {booking.notes && (
            <div className="mt-8 pt-8 border-t border-gray-200">
              <label className="block text-sm font-medium text-gray-500">Special Instructions</label>
              <p className="mt-2 text-gray-900 bg-gray-50 p-4 rounded">{booking.notes}</p>
            </div>
          )}

          <div className="mt-8 pt-8 border-t border-gray-200">
            <div className="flex justify-end space-x-4">
              {booking.status === 'pending' && (
                <button className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
                  Cancel Booking
                </button>
              )}
              <Link 
                to="/customer/my-bookings" 
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Close
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingDetails;