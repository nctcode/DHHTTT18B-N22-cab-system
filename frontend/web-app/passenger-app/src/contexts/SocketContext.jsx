import { createContext, useContext, useEffect, useState } from 'react';
import socketService from '../services/socketService';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

/**
 * Global SocketProvider — connects once on auth, disconnects on logout.
 * Wraps the entire app so socket is stable across page navigations.
 */
export function SocketProvider({ children }) {
    const { user } = useAuth();
    const [isConnected, setIsConnected] = useState(false);

    useEffect(() => {
        if (!user) {
            // User logged out → disconnect
            socketService.disconnect();
            setIsConnected(false);
            return;
        }

        const token = localStorage.getItem('accessToken');
        if (!token) return;

        // Connect once — guard inside socketService prevents duplicates
        const socket = socketService.connect(token);

        const handleConnect = () => setIsConnected(true);
        const handleDisconnect = () => setIsConnected(false);

        socket.on('connect', handleConnect);
        socket.on('disconnect', handleDisconnect);

        // If already connected by the time this runs
        if (socket.connected) setIsConnected(true);

        return () => {
            socket.off('connect', handleConnect);
            socket.off('disconnect', handleDisconnect);
        };
    }, [user]);

    // Full cleanup on unmount (page refresh / app close)
    useEffect(() => {
        return () => socketService.disconnect();
    }, []);

    return (
        <SocketContext.Provider value={{ socketService, isConnected }}>
            {children}
        </SocketContext.Provider>
    );
}

/**
 * Hook to access socket service and connection status.
 */
export function useSocket() {
    const context = useContext(SocketContext);
    if (!context) {
        throw new Error('useSocket must be used within a SocketProvider');
    }
    return context;
}
