import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { bookingService, rideService } from '../services';

const RideContext = createContext(null);

export const RideProvider = ({ children }) => {
    const [currentRide, setCurrentRide] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Initial Bootstrap
    useEffect(() => {
        const bootstrapRide = async () => {
            const activeId = localStorage.getItem('activeRideId');
            if (activeId) {
                try {
                    setLoading(true);
                    let rideData;
                    try {
                        const res = await rideService.getRide(activeId);
                        rideData = res.data?.data || res.data || res.ride || res;
                    } catch (err) {
                        const res = await bookingService.getBooking(activeId);
                        rideData = res.data?.data || res.data || res.booking || res;
                    }
                    setCurrentRide(rideData);
                } catch (err) {
                    console.error('RideContext: Failed to fetch active ride', err);
                    setError(err);
                    const status = err?.response?.status || err?.status;
                    if ([401, 403, 404].includes(status)) {
                        localStorage.removeItem('activeRideId');
                    }
                } finally {
                    setLoading(false);
                }
            } else {
                setLoading(false);
            }
        };

        bootstrapRide();
    }, []);

    const fetchRide = useCallback(async (id) => {
        try {
            setLoading(true);
            let rideData;
            try {
                const res = await rideService.getRide(id);
                rideData = res.data?.data || res.data || res.ride || res;
            } catch (err) {
                const res = await bookingService.getBooking(id);
                rideData = res.data?.data || res.data || res.booking || res;
            }
            setCurrentRide(rideData);
            return rideData;
        } catch (err) {
            console.error('RideContext: fetchRide failed', err);
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    const updateRideState = useCallback((newRideData) => {
        setCurrentRide(prev => ({
            ...prev,
            ...newRideData
        }));
    }, []);

    const clearRide = useCallback(() => {
        setCurrentRide(null);
        localStorage.removeItem('activeRideId');
    }, []);

    const value = {
        currentRide,
        loading,
        error,
        fetchRide,
        updateRideState,
        clearRide,
    };

    return (
        <RideContext.Provider value={value}>
            {children}
        </RideContext.Provider>
    );
};

export const useRide = () => {
    const context = useContext(RideContext);
    if (!context) {
        throw new Error('useRide must be used within a RideProvider');
    }
    return context;
};
