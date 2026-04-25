import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useRide } from '../contexts/RideContext';
import { resolveRouteFromState, isSafeZone } from '../utils/navigationUtils';

export default function ActiveRideGuard({ children }) {
    const location = useLocation();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { currentRide, loading } = useRide();

    useEffect(() => {
        if (!user || loading) return;

        const rideId = currentRide?._id || currentRide?.id;
        
        // If there's no active ride, don't interfere
        if (!currentRide || !rideId) {
            return;
        }

        const expectedRoute = resolveRouteFromState(currentRide.status, 'PASSENGER', rideId);
        
        // If the ride is in a state that doesn't map to a specific route, don't interfere
        if (!expectedRoute) return;

        // Extract base path for matching (e.g., '/ride/' from '/ride/123')
        const expectedBase = expectedRoute.split('/:')[0];
        const isCurrentlyOnExpectedRoute = location.pathname.startsWith(expectedBase);

        // If we are already on the correct screen, do nothing
        if (isCurrentlyOnExpectedRoute) return;

        // Allow profile page
        if (location.pathname === '/profile') return;

        // Allow rating screen if ride is completed
        if (currentRide.status === 'COMPLETED' && location.pathname.startsWith('/rating/')) return;

        // Otherwise, force them to the expected ride screen
        console.log(`🚕 ActiveRideGuard: Redirecting user from ${location.pathname} to ${expectedRoute}`);
        navigate(expectedRoute, { replace: true });

    }, [location.pathname, user, loading, currentRide, navigate]);

    return children;
}
