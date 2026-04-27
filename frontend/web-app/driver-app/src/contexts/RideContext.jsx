import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import rideService from '../services/rideService';

const RideContext = createContext(null);

export const RideProvider = ({ children }) => {
    const [currentRide, setCurrentRide] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Initial Bootstrap
    useEffect(() => {
        const bootstrapRide = async () => {
            const activeId = localStorage.getItem('driverActiveRideId');
            if (activeId) {
                try {
                    setLoading(true);
                    const res = await rideService.getRide(activeId);
                    const rideData = res.data?.data || res.data || res.ride || res;
                    setCurrentRide(rideData);
                } catch (err) {
                    console.error('RideContext: Failed to fetch active ride', err);
                    setError(err);
                    // Optionally clear the id if it's completely invalid, but let's keep it safe
                    if (err.response && err.response.status === 404) {
                        localStorage.removeItem('driverActiveRideId');
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
            const res = await rideService.getRide(id);
            const rideData = res.data?.data || res.data || res.ride || res;
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
        localStorage.removeItem('driverActiveRideId');
        // Clean up legacy keys if they exist
        localStorage.removeItem('driverRideState');
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
