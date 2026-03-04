import { io } from 'socket.io-client';

class SocketService {
    constructor() {
        this.socket = null;
        this._listeners = new Map();
    }

    /**
     * Connect socket. If already connected, return existing socket.
     * Prevents duplicate connections.
     */
    connect(token) {
        // Guard: don't reconnect if already connected
        if (this.socket && this.socket.connected) {
            console.log('✅ Socket already connected:', this.socket.id);
            return this.socket;
        }

        // If socket exists but disconnected, clean it up first
        if (this.socket) {
            this.socket.removeAllListeners();
            this.socket.disconnect();
            this.socket = null;
        }

        const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000';

        this.socket = io(SOCKET_URL, {
            auth: { token },
            reconnection: true,
            reconnectionAttempts: 10,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
        });

        this.socket.on('connect', () => {
            console.log('✅ Socket connected:', this.socket.id);
        });

        this.socket.on('disconnect', (reason) => {
            console.log('❌ Socket disconnected:', reason);
        });

        this.socket.on('connect_error', (error) => {
            console.error('Socket connection error:', error.message);
        });

        // Re-attach any previously registered listeners
        this._listeners.forEach((callbacks, event) => {
            callbacks.forEach((cb) => this.socket.on(event, cb));
        });

        return this.socket;
    }

    /**
     * Disconnect and cleanup. Only call on logout or app unmount.
     */
    disconnect() {
        if (this.socket) {
            this.socket.removeAllListeners();
            this.socket.disconnect();
            this.socket = null;
        }
        this._listeners.clear();
    }

    /**
     * Check if socket is currently connected.
     */
    isConnected() {
        return this.socket?.connected || false;
    }

    /**
     * Join a ride room without reconnecting.
     */
    joinRide(rideId) {
        if (this.socket && this.socket.connected) {
            this.socket.emit('join:ride', rideId);
            console.log('📡 Joined ride room:', rideId);
        }
    }

    /**
     * Leave a ride room.
     */
    leaveRide(rideId) {
        if (this.socket && this.socket.connected) {
            this.socket.emit('leave:ride', rideId);
        }
    }

    // ── Event Listeners (persistent across reconnects) ──

    on(event, callback) {
        if (!this._listeners.has(event)) {
            this._listeners.set(event, new Set());
        }
        this._listeners.get(event).add(callback);

        if (this.socket) {
            this.socket.on(event, callback);
        }
    }

    off(event, callback) {
        if (this._listeners.has(event)) {
            this._listeners.get(event).delete(callback);
        }
        if (this.socket) {
            this.socket.off(event, callback);
        }
    }

    // ── Convenience Methods ──

    onDriverMatched(callback) { this.on('driver_matched', callback); }
    onLocationUpdate(callback) { this.on('driver.location.updated', callback); }
    onRideStatusUpdate(callback) { this.on('ride_status_update', callback); }
    onNearbyDrivers(callback) { this.on('nearby_drivers', callback); }
    onNotification(callback) { this.on('notification', callback); }
    
    // New events for ride creation
    onRideCreated(callback) { this.on('ride:created', callback); }
    onRideAssigned(callback) { this.on('ride:assigned', callback); }

    offLocationUpdate(callback) { this.off('location_update', callback); }
    offNearbyDrivers(callback) { this.off('nearby_drivers', callback); }
    offRideStatusUpdate(callback) { this.off('ride_status_update', callback); }

    emitEvent(eventName, data) {
        if (this.socket && this.socket.connected) {
            this.socket.emit(eventName, data);
        }
    }
}

export default new SocketService();
