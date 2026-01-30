import React from 'react';

const BookingStatus = ({ status, onStatusChange, isDriver = false }) => {
  const statusConfig = {
    pending: {
      color: 'bg-yellow-100 text-yellow-800',
      label: 'Pending',
      nextActions: isDriver ? ['accept', 'reject'] : ['cancel']
    },
    confirmed: {
      color: 'bg-blue-100 text-blue-800',
      label: 'Confirmed',
      nextActions: isDriver ? ['start', 'cancel'] : []
    },
    active: {
      color: 'bg-green-100 text-green-800',
      label: 'Active',
      nextActions: isDriver ? ['complete'] : []
    },
    completed: {
      color: 'bg-green-100 text-green-800',
      label: 'Completed',
      nextActions: []
    },
    cancelled: {
      color: 'bg-red-100 text-red-800',
      label: 'Cancelled',
      nextActions: []
    },
    rejected: {
      color: 'bg-red-100 text-red-800',
      label: 'Rejected',
      nextActions: []
    }
  };

  const config = statusConfig[status] || statusConfig.pending;

  const handleAction = (action) => {
    if (onStatusChange) {
      onStatusChange(action);
    }
  };

  return (
    <div className="flex items-center space-x-4">
      <span className={`px-3 py-1 rounded-full text-sm font-medium ${config.color}`}>
        {config.label}
      </span>
      
      {config.nextActions.length > 0 && (
        <div className="flex space-x-2">
          {config.nextActions.includes('accept') && (
            <button
              onClick={() => handleAction('accept')}
              className="px-3 py-1 bg-green-500 text-white text-sm rounded hover:bg-green-600"
            >
              Accept
            </button>
          )}
          {config.nextActions.includes('reject') && (
            <button
              onClick={() => handleAction('reject')}
              className="px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600"
            >
              Reject
            </button>
          )}
          {config.nextActions.includes('start') && (
            <button
              onClick={() => handleAction('start')}
              className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600"
            >
              Start Trip
            </button>
          )}
          {config.nextActions.includes('complete') && (
            <button
              onClick={() => handleAction('complete')}
              className="px-3 py-1 bg-green-500 text-white text-sm rounded hover:bg-green-600"
            >
              Complete Trip
            </button>
          )}
          {config.nextActions.includes('cancel') && (
            <button
              onClick={() => handleAction('cancel')}
              className="px-3 py-1 bg-gray-500 text-white text-sm rounded hover:bg-gray-600"
            >
              Cancel
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default BookingStatus;