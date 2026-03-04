import { io } from 'socket.io-client';

class SocketService {
    constructor() {
        this.socket = null;
        this._listeners = new Map();
    }

    connect(token) {
        if (this.socket && this.socket.connected) {
            console.log('✅ Socket already connected:', this.socket.id);
            return this.socket;
        }

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
            console.log('✅ Driver socket connected:', this.socket.id);
        });

        this.socket.on('disconnect', (reason) => {
            console.log('❌ Driver socket disconnected:', reason);
        });

        this.socket.on('connect_error', (error) => {
            console.error('Socket connection error:', error.message);
        });

        // Re-attach persistent listeners
        this._listeners.forEach((callbacks, event) => {
            callbacks.forEach((cb) => this.socket.on(event, cb));
        });

        return this.socket;
    }

    disconnect() {
        if (this.socket) {
            this.socket.removeAllListeners();
            this.socket.disconnect();
            this.socket = null;
        }
        this._listeners.clear();
    }

    isConnected() {
        return this.socket?.connected || false;
    }

    // Join a ride room
    joinRide(rideId) {
        if (this.socket && this.socket.connected) {
            this.socket.emit('join:ride', rideId);
            console.log('📡 Joined ride room:', rideId);
        }
    }

    leaveRide(rideId) {
        if (this.socket && this.socket.connected) {
            this.socket.emit('leave:ride', rideId);
        }
    }

    // Send driver location via socket
    sendLocation(lat, lng, bearing = 0, speed = 0, rideId = null) {
        if (this.socket && this.socket.connected) {
            this.socket.emit('driver.location', { lat, lng, bearing, speed, rideId });
        }
    }

    // ── Event Listeners ──
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

    // ── Convenience Methods for Driver ──
    onNewRideRequest(callback) { this.on('ride:newRequest', callback); }
    onRideAssigned(callback) { this.on('ride:assigned', callback); }
    onRideStatusChanged(callback) { this.on('ride:statusChanged', callback); }
    onBookingCancelled(callback) { this.on('booking:cancelled', callback); }

    offNewRideRequest(callback) { this.off('ride:newRequest', callback); }
    offRideAssigned(callback) { this.off('ride:assigned', callback); }
    offRideStatusChanged(callback) { this.off('ride:statusChanged', callback); }
    offBookingCancelled(callback) { this.off('booking:cancelled', callback); }

    onRideCancelled(callback) { this.on('ride:cancelled', callback); }
    offRideCancelled(callback) { this.off('ride:cancelled', callback); }

    // ── Sequential Matching: Offer/Accept/Reject ──
    onBookingOffer(callback) { this.on('booking:offer', callback); }
    offBookingOffer(callback) { this.off('booking:offer', callback); }
    onBookingConfirmed(callback) { this.on('booking:confirmed', callback); }
    offBookingConfirmed(callback) { this.off('booking:confirmed', callback); }
    onBookingNoDrivers(callback) { this.on('booking:noDrivers', callback); }

    acceptOffer(bookingId) {
        if (this.socket?.connected) {
            this.socket.emit('booking:accept', { bookingId });
            console.log('✅ Sent booking:accept for', bookingId);
        }
    }

    rejectOffer(bookingId) {
        if (this.socket?.connected) {
            this.socket.emit('booking:reject', { bookingId });
            console.log('❌ Sent booking:reject for', bookingId);
        }
    }

    emitEvent(eventName, data) {
        if (this.socket && this.socket.connected) {
            this.socket.emit(eventName, data);
        }
    }
}

export default new SocketService();
