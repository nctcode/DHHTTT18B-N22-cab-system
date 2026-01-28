import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Provider, useDispatch } from 'react-redux'; // Thêm useDispatch
import store from './store/store';

// Customer pages
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import ResetPassword from './pages/ResetPassword';
import Unauthorized from './pages/Unauthorized';
import ChangePassword from './pages/ChangePassword';
// Admin pages
import AdminDashboard from './pages/admin/Dashboard';
import AdminUsers from './pages/admin/Users';

// Driver pages
import DriverDashboard from './pages/driver/Dashboard';
import DriverRides from './pages/driver/Rides';

// Components
import ProtectedRoute from './components/auth/ProtectedRoute';
import RoleBasedRoute from './components/auth/RoleBasedRoute';

function App() {
  return (
    <Provider store={store}>
      <Router>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/change-password" element={<ProtectedRoute><ChangePassword /></ProtectedRoute>} />
          <Route path="/unauthorized" element={<Unauthorized />} />

          {/* Customer routes */}
          <Route 
            path="/dashboard" 
            element={
              <RoleBasedRoute allowedRoles={['CUSTOMER', 'ADMIN']}>
                <Dashboard />
              </RoleBasedRoute>
            } 
          />
          
          <Route 
            path="/profile" 
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            } 
          />

          {/* Admin routes */}
          <Route 
            path="/admin/dashboard" 
            element={
              <RoleBasedRoute allowedRoles={['ADMIN']}>
                <AdminDashboard />
              </RoleBasedRoute>
            } 
          />
          
          <Route 
            path="/admin/users" 
            element={
              <RoleBasedRoute allowedRoles={['ADMIN']}>
                <AdminUsers />
              </RoleBasedRoute>
            } 
          />

          {/* Driver routes */}
          <Route 
            path="/driver/dashboard" 
            element={
              <RoleBasedRoute allowedRoles={['DRIVER']}>
                <DriverDashboard />
              </RoleBasedRoute>
            } 
          />
          
          <Route 
            path="/driver/rides" 
            element={
              <RoleBasedRoute allowedRoles={['DRIVER']}>
                <DriverRides />
              </RoleBasedRoute>
            } 
          />

          {/* Default route */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
    </Provider>
  );
}

export default App;