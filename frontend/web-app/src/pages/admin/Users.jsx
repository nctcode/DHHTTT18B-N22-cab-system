import React from 'react';
import { useNavigate } from 'react-router-dom';

const AdminUsers = () => {
  const navigate = useNavigate();

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
        <button
          onClick={() => navigate('/admin/dashboard')}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
        >
          Back to Dashboard
        </button>
      </div>
      
      <div className="bg-white rounded-xl shadow p-6">
        <p className="text-gray-600">User management page will be implemented soon.</p>
        <div className="mt-4 p-4 bg-blue-50 rounded-lg">
          <p className="text-blue-800">
            This page will show all users with filtering, searching, and management options.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AdminUsers;