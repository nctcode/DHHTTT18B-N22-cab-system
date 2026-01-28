// Profile.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { logout, getProfile, updateProfile } from '../store/authSlice';

const Profile = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user, loading, error } = useSelector((state) => state.auth);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    email: ''
  });
  const [localError, setLocalError] = useState('');
  const [isFetching, setIsFetching] = useState(false);
  
  const isMounted = useRef(true);
  const fetchTimeoutRef = useRef(null);

  useEffect(() => {
    isMounted.current = true;
    
    if (!user && !isFetching) {
      setIsFetching(true);
      
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
      
      fetchTimeoutRef.current = setTimeout(() => {
        if (isMounted.current) {
          dispatch(getProfile()).finally(() => {
            if (isMounted.current) {
              setIsFetching(false);
            }
          });
        }
      }, 100);
    }

    return () => {
      isMounted.current = false;
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
    };
  }, [dispatch, user, isFetching]);

  useEffect(() => {
    if (user && isMounted.current) {
      setFormData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        phone: user.phone || '',
        email: user.email || ''
      });
    }
  }, [user]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    if (localError) setLocalError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      setLocalError('First name and last name are required');
      return;
    }
    
    if (formData.phone && formData.phone.length < 10) {
      setLocalError('Phone number must be at least 10 digits');
      return;
    }
    
    try {
      const updateData = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        ...(formData.phone && { phone: formData.phone.trim() })
      };
      
      const result = await dispatch(updateProfile(updateData));
      
      if (updateProfile.fulfilled.match(result)) {
        setIsEditing(false);
        setTimeout(() => {
          dispatch(getProfile());
        }, 1000);
        alert('Profile updated successfully!');
      } else if (updateProfile.rejected.match(result)) {
        setLocalError(result.payload || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Update profile error:', error);
      setLocalError('An error occurred. Please try again.');
    }
  };

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  // THÊM HÀM handleChangePassword Ở ĐÂY
  const handleChangePassword = async () => {
    const currentPassword = prompt('Enter your current password:');
    if (!currentPassword) return;
    
    const newPassword = prompt('Enter new password (min 8 characters):');
    if (!newPassword) return;
    
    const confirmPassword = prompt('Confirm new password:');
    if (!confirmPassword) return;
    
    if (newPassword !== confirmPassword) {
      alert('Passwords do not match');
      return;
    }
    
    if (newPassword.length < 8) {
      alert('Password must be at least 8 characters');
      return;
    }
    
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch('http://localhost:3001/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          currentPassword,
          newPassword
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        alert('Password changed successfully! Please login again.');
        handleLogout();
      } else {
        alert(data.message || 'Failed to change password');
      }
    } catch (error) {
      console.error('Change password error:', error);
      alert('Failed to change password');
    }
  };

  // Thêm hàm này nếu bạn muốn xử lý forgot password
  const handleForgotPassword = () => {
    navigate('/reset-password');
  };

  const handleRetry = () => {
    setIsFetching(true);
    setTimeout(() => {
      dispatch(getProfile()).finally(() => {
        setIsFetching(false);
      });
    }, 2000);
  };

  if ((loading || isFetching) && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <p className="ml-4 text-gray-600">Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <button
                onClick={() => navigate('/dashboard')}
                className="text-gray-700 hover:text-gray-900 flex items-center"
                disabled={loading}
              >
                <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to Dashboard
              </button>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
                disabled={loading}
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-xl shadow-lg p-8">
          {error && error.includes('Too many requests') && (
            <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start">
                <svg className="w-5 h-5 text-yellow-600 mt-0.5 mr-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <div>
                  <p className="font-medium text-yellow-800">Rate Limit Exceeded</p>
                  <p className="text-yellow-700 text-sm mt-1">
                    You're making too many requests. Please wait a moment.
                  </p>
                  <button
                    onClick={handleRetry}
                    className="mt-2 px-3 py-1 text-sm bg-yellow-100 text-yellow-800 rounded hover:bg-yellow-200"
                  >
                    Retry after 2 seconds
                  </button>
                </div>
              </div>
            </div>
          )}

          {(error && !error.includes('Too many requests')) && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700 font-medium">Error:</p>
              <p className="text-red-600">{error}</p>
            </div>
          )}

          {localError && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700 font-medium">Error:</p>
              <p className="text-red-600">{localError}</p>
            </div>
          )}

          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold text-gray-900">Your Profile</h2>
            {user && (
              <button
                onClick={() => setIsEditing(!isEditing)}
                className={`px-4 py-2 text-sm font-medium rounded-lg ${
                  isEditing 
                    ? 'bg-gray-100 text-gray-700 hover:bg-gray-200' 
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                } disabled:opacity-50`}
                disabled={loading || isFetching}
              >
                {isEditing ? 'Cancel Editing' : 'Edit Profile'}
              </button>
            )}
          </div>

          {!user && !loading && !isFetching && (
            <div className="text-center py-12">
              <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Unable to load profile</h3>
              <p className="text-gray-600 mb-4">There was a problem loading your profile data.</p>
              <button
                onClick={handleRetry}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Try Again
              </button>
            </div>
          )}

          {user && (isEditing ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    First Name *
                  </label>
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                    disabled={loading}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={formData.email}
                  disabled
                  className="w-full px-4 py-3 border border-gray-300 bg-gray-50 rounded-lg cursor-not-allowed"
                />
                <p className="mt-1 text-sm text-gray-500">Email cannot be changed</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="0706417103"
                  disabled={loading}
                />
                <p className="mt-1 text-sm text-gray-500">Optional</p>
              </div>

              <div className="flex justify-end space-x-4 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 disabled:opacity-50"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Saving...
                    </>
                  ) : 'Save Changes'}
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center space-x-4 mb-6">
                <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-2xl font-bold text-blue-600">
                    {user?.firstName?.[0]}{user?.lastName?.[0]}
                  </span>
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">
                    {user?.firstName} {user?.lastName}
                  </h3>
                  <p className="text-gray-600">{user?.email}</p>
                  <p className="text-sm text-gray-500 capitalize">Role: {user?.role?.toLowerCase()}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-500">Account Type</p>
                  <p className="font-medium capitalize">{user?.role?.toLowerCase()}</p>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-500">Phone Number</p>
                  <p className="font-medium">{user?.phone || 'Not provided'}</p>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-500">Email Verified</p>
                  <p className="font-medium">{user?.isVerified ? 'Yes' : 'No'}</p>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-500">Account Status</p>
                  <p className="font-medium">{user?.isActive ? 'Active' : 'Inactive'}</p>
                </div>
              </div>

              <div className="border-t pt-6 mt-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Security</h4>
                <div className="space-y-3">
                  <button
                    onClick={() => navigate('/change-password')} // Thay vì handleChangePassword
                    className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50 flex justify-between items-center"
                  >
                    <div>
                      <p className="font-medium text-gray-900">Change Password</p>
                      <p className="text-sm text-gray-500">Update your password securely</p>
                    </div>
                    <span className="text-gray-400">→</span>
                  </button>
                  
                  <button
                    onClick={handleForgotPassword} 
                    className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50 flex justify-between items-center"
                  >
                    <div>
                      <p className="font-medium text-gray-900">Forgot Password</p>
                      <p className="text-sm text-gray-500">Reset your password via email</p>
                    </div>
                    <span className="text-gray-400">→</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
};

export default Profile;