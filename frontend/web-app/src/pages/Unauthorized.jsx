import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux'; // Thêm useDispatch
import { logout } from '../store/authSlice'; // Thêm import

const Unauthorized = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch(); // Thêm dispatch
  const { role } = useSelector((state) => state.auth);


  const getRedirectPath = () => {
    switch (role) {
      case 'ADMIN':
        return '/admin/dashboard';
      case 'DRIVER':
        return '/driver/dashboard';
      case 'CUSTOMER':
      default:
        return '/dashboard';
    }
  };
  
  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full text-center">
        <div className="mb-8">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Access Denied</h1>
          <p className="mt-2 text-gray-600">
            You don't have permission to access this page.
          </p>
          <p className="mt-1 text-sm text-gray-500">
            Your role: <span className="font-semibold capitalize">{role?.toLowerCase() || 'none'}</span>
          </p>
        </div>

        <div className="space-y-4">
          <button
            onClick={() => navigate(getRedirectPath())}
            className="w-full py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700"
          >
            Go to {role === 'ADMIN' ? 'Admin' : role === 'DRIVER' ? 'Driver' : 'Customer'} Dashboard
          </button>
          
          <button
            onClick={() => navigate('/')}
            className="w-full py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50"
          >
            Go Home
          </button>
          
          {/* Thêm nút logout */}
          <button
            onClick={handleLogout}
            className="w-full py-3 border border-red-300 text-red-700 font-medium rounded-lg hover:bg-red-50"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
};

export default Unauthorized;