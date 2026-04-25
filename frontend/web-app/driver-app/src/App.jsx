import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import { SocketProvider } from './contexts/SocketContext';
import { RideProvider } from './contexts/RideContext';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Pickup from './pages/Pickup';
import InProgress from './pages/InProgress';
import Completed from './pages/Completed';
import RideHistory from './pages/RideHistory';
import Profile from './pages/Profile';
import ActiveRideGuard from './components/ActiveRideGuard';

function App() {
    return (
        <AuthProvider>
            <SocketProvider>
                <RideProvider>
                    <BrowserRouter>
                        <div className="mobile-wrapper overflow-y-auto no-scrollbar">
                            <div className="flex-1 w-full h-full relative">
                                <ActiveRideGuard>
                                <Routes>
                                    <Route path="/" element={<Navigate to="/login" replace />} />
                                    <Route path="/login" element={<Login />} />
                                    <Route path="/register" element={<Register />} />
                                    <Route path="/dashboard" element={<Dashboard />} />
                                    <Route path="/pickup" element={<Pickup />} />
                                    <Route path="/ride/:id" element={<InProgress />} />
                                    <Route path="/completed/:id" element={<Completed />} />
                                    <Route path="/history" element={<RideHistory />} />
                                    <Route path="/profile" element={<Profile />} />
                                    <Route path="*" element={<Navigate to="/login" replace />} />
                                </Routes>
                                </ActiveRideGuard>
                            </div>
                            <Toaster
                                position="top-center"
                            toastOptions={{
                                style: {
                                    borderRadius: '12px',
                                    padding: '12px 16px',
                                    fontSize: '14px',
                                },
                            }}
                        />
                    </div>
                    </BrowserRouter>
                </RideProvider>
            </SocketProvider>
        </AuthProvider>
    );
}

export default App;
