import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux'; // Thêm useDispatch
import { useNavigate } from 'react-router-dom';
import { logout } from '../../store/authSlice'; // Thêm import
import { LogoutIcon, UsersIcon, CurrencyDollarIcon, TruckIcon, UserGroupIcon } from '@heroicons/react/outline';
import adminAPI from '../../services/admin';
import authAPI from '../../services/auth'; // Thêm import

const AdminDashboard = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch(); // Thêm dispatch
  const { user } = useSelector((state) => state.auth);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      const response = await adminAPI.getDashboardStats();
      setStats(response.data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      const refreshToken = localStorage.getItem('refresh_token');
      if (refreshToken) {
        await authAPI.logout(refreshToken);
      }
    } catch (error) {
      console.error('Logout API error:', error);
    } finally {
      dispatch(logout());
      navigate('/login');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Top Navigation */}
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900">Admin Dashboard</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-700">
                Welcome, Admin {user?.firstName}
              </span>
              <button
                onClick={handleLogout}
                className="flex items-center px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700"
              >
                <LogoutIcon className="w-4 h-4 mr-2" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Sidebar & Main Content */}
      <div className="flex">
        {/* Sidebar */}
        <div className="w-64 bg-white shadow h-[calc(100vh-4rem)]">
          <nav className="mt-5 px-2 space-y-1">
            <a
              href="#"
              className="bg-gray-100 text-gray-900 group flex items-center px-3 py-2 text-sm font-medium rounded-md"
            >
              <UsersIcon className="text-gray-500 mr-3 h-6 w-6" />
              Dashboard
            </a>
            <a
              onClick={() => navigate('/admin/users')}
              className="text-gray-600 hover:bg-gray-50 hover:text-gray-900 group flex items-center px-3 py-2 text-sm font-medium rounded-md cursor-pointer"
            >
              <UserGroupIcon className="text-gray-400 mr-3 h-6 w-6" />
              User Management
            </a>
            <a
              href="#"
              className="text-gray-600 hover:bg-gray-50 hover:text-gray-900 group flex items-center px-3 py-2 text-sm font-medium rounded-md"
            >
              <TruckIcon className="text-gray-400 mr-3 h-6 w-6" />
              Driver Management
            </a>
            <a
              href="#"
              className="text-gray-600 hover:bg-gray-50 hover:text-gray-900 group flex items-center px-3 py-2 text-sm font-medium rounded-md"
            >
              <CurrencyDollarIcon className="text-gray-400 mr-3 h-6 w-6" />
              Financial Reports
            </a>
          </nav>
        </div>

        {/* Main Content */}
        <main className="flex-1 p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Overview</h2>
          
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <UsersIcon className="h-8 w-8 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Users</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {stats?.totalUsers || 0}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <UserGroupIcon className="h-8 w-8 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Customers</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {stats?.totalCustomers || 0}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <TruckIcon className="h-8 w-8 text-orange-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Drivers</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {stats?.totalDrivers || 0}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <CurrencyDollarIcon className="h-8 w-8 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Revenue</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    ${stats?.totalRevenue || 0}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-xl shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                onClick={() => navigate('/admin/users')}
                className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left"
              >
                <h4 className="font-medium text-gray-900">Manage Users</h4>
                <p className="text-sm text-gray-500">View and manage all users</p>
              </button>
              
              <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left">
                <h4 className="font-medium text-gray-900">Verify Drivers</h4>
                <p className="text-sm text-gray-500">Approve new driver applications</p>
              </button>
              
              <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left">
                <h4 className="font-medium text-gray-900">View Reports</h4>
                <p className="text-sm text-gray-500">Financial and usage reports</p>
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminDashboard;