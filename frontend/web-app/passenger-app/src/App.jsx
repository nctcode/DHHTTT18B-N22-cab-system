import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './contexts/AuthContext';
import { SocketProvider } from './contexts/SocketContext';

// Pages
import SplashScreen from './pages/SplashScreen';
import Login from './pages/Login';
import Register from './pages/Register';
import Home from './pages/Home';
import Destination from './pages/Destination';
import RideOptions from './pages/RideOptions';
import SearchingDriver from './pages/SearchingDriver';
import RideTracking from './pages/RideTracking';
import Payment from './pages/Payment';
import Rating from './pages/Rating';
import RideHistory from './pages/RideHistory';
import Profile from './pages/Profile';
import Wallet from './pages/Wallet';

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            retry: 1,
            refetchOnWindowFocus: false,
        },
    },
});

function App() {
    return (
        <QueryClientProvider client={queryClient}>
            <AuthProvider>
                <SocketProvider>
                    <BrowserRouter>
                        <div className="mobile-wrapper overflow-y-auto no-scrollbar">
                            <div className="flex-1 w-full h-full relative">
                                <Routes>
                                    <Route path="/" element={<SplashScreen />} />
                                    <Route path="/login" element={<Login />} />
                                    <Route path="/register" element={<Register />} />
                                    <Route path="/home" element={<Home />} />
                                    <Route path="/destination" element={<Destination />} />
                                    <Route path="/ride-options" element={<RideOptions />} />
                                    <Route path="/searching" element={<SearchingDriver />} />
                                    <Route path="/ride/:id" element={<RideTracking />} />
                                    <Route path="/payment/:rideId" element={<Payment />} />
                                    <Route path="/rating/:rideId" element={<Rating />} />
                                    <Route path="/history" element={<RideHistory />} />
                                    <Route path="/profile" element={<Profile />} />
                                    <Route path="/wallet" element={<Wallet />} />
                                    <Route path="*" element={<Navigate to="/" replace />} />
                                </Routes>
                            </div>
                            <Toaster position="top-center" />
                        </div>
                    </BrowserRouter>
                </SocketProvider>
            </AuthProvider>
        </QueryClientProvider>
    );
}

export default App;
