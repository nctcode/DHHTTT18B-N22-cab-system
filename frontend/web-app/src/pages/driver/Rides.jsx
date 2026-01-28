import React from 'react';
import { useNavigate } from 'react-router-dom';

const DriverRides = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <button
                onClick={() => navigate('/driver/dashboard')}
                className="text-gray-700 hover:text-gray-900"
              >
                ← Back to Dashboard
              </button>
            </div>
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900">My Rides</h1>
            </div>
            <div></div> {/* Empty div for spacing */}
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-xl shadow-lg p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Ride History</h2>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Pickup
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fare
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-gray-500">
                    No rides yet. Go online to start accepting rides!
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="mt-8 flex justify-center">
            <button className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700">
              Go Online Now
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default DriverRides;