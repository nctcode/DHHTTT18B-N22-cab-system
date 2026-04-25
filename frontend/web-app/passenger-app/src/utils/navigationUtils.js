// Routing mapping based on ride state
export const DRIVER_ROUTE_MAP = {
    'CREATED': '/pickup',
    'ASSIGNED': '/pickup',
    'ACCEPTED': '/pickup',
    'ARRIVED': '/pickup',
    'STARTED': '/ride/:id',
    'IN_PROGRESS': '/ride/:id',
    'COMPLETED': '/dashboard'
};

export const PASSENGER_ROUTE_MAP = {
    // Booking status mapping
    'PENDING': '/searching',
    'SEARCHING': '/searching',
    'MATCHED': '/ride/:id',
    'CONFIRMED': '/ride/:id',
    'NO_DRIVER_FOUND': '/home',
    'CANCELLED': '/home',
    'FAILED': '/home',
    // Ride status mapping
    'CREATED': '/ride/:id',
    'ASSIGNED': '/ride/:id',
    'ARRIVED': '/ride/:id',
    'STARTED': '/ride/:id',
    'IN_PROGRESS': '/ride/:id',
    'CANCELLED_BY_DRIVER': '/home',
    'COMPLETED': '/payment/:id'
};

/**
 * Resolves the expected route based on the current ride status and role.
 * 
 * @param {string} rideStatus - The status of the ride (e.g., 'IN_PROGRESS', 'ACCEPTED')
 * @param {string} role - 'DRIVER' or 'PASSENGER'
 * @param {string} rideId - The active ride ID
 * @returns {string|null} - The resolved route path or null if no mapping exists
 */
export const resolveRouteFromState = (rideStatus, role, rideId) => {
    console.log(`[navigationUtils] resolveRouteFromState: status=${rideStatus}, role=${role}, rideId=${rideId}`);
    
    if (!rideStatus || !rideId) {
        console.warn(`[navigationUtils] Missing status or id`);
        return null;
    }
    
    const routeMap = role === 'DRIVER' ? DRIVER_ROUTE_MAP : PASSENGER_ROUTE_MAP;
    const pathTemplate = routeMap[rideStatus];
    
    if (!pathTemplate) {
        console.warn(`[navigationUtils] No mapping for status: ${rideStatus}`);
        return role === 'DRIVER' ? `/pickup` : `/ride/${rideId}`; // Safe fallback
    }
    
    return pathTemplate.replace(':id', rideId);
};

/**
 * Checks if the current path is a "safe zone" where the user is allowed
 * to stay without being forcibly redirected by the active ride guard.
 * 
 * @param {string} pathname - The current window.location.pathname
 * @returns {boolean}
 */
export const isSafeZone = (pathname) => {
    const safeZones = ['/dashboard', '/home', '/profile', '/wallet', '/history', '/settings'];
    return safeZones.some(zone => pathname.startsWith(zone)) || pathname === '/';
};
