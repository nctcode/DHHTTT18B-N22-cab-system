const Payment = require('../models/Payment');
const rideServiceClient = require('../utils/rideServiceClient');
const rabbitmq = require('../messaging/rabbitmq');

class PaymentService {

    async createPayment(rideId, amount, method, requestUserId, requestRole) {
        if (!requestUserId) {
            throw new Error('Authentication required');
        }

        // Only USER or ADMIN can create payment, DRIVER cannot
        const role = (requestRole || '').toUpperCase();
        if (role === 'DRIVER') {
            const error = new Error('Drivers cannot create payments');
            error.statusCode = 403;
            throw error;
        }

        // rideId is now UUID string, no ObjectId validation needed
        if (!rideId || typeof rideId !== 'string' || !rideId.trim()) {
            const error = new Error('rideId must be a non-empty string');
            error.statusCode = 400;
            throw error;
        }

        let ride;
        try {
            ride = await rideServiceClient.getRide(rideId);
        } catch (error) {
            const err = new Error(`Ride validation failed: ${error.message}`);
            err.statusCode = 400;
            throw err;
        }
        if (!ride) {
            const error = new Error('Ride not found');
            error.statusCode = 404;
            throw error;
        }
        if (ride.status !== 'COMPLETED') {
            const error = new Error('Cannot create payment. Ride must be in COMPLETED status');
            error.statusCode = 400;
            throw error;
        }
        if (String(ride.userId) !== String(requestUserId)) {
            const error = new Error('You can only create payment for your own completed ride');
            error.statusCode = 403;
            throw error;
        }

        const existing = await Payment.findByRideId(rideId);
        if (existing.length > 0) {
            const error = new Error('Payment already exists for this ride');
            error.statusCode = 409;
            throw error;
        }

        const payment = await Payment.create({ rideId, amount, method });

        // Publish event
        await rabbitmq.publish(
            rabbitmq.config.exchanges.paymentEvents,
            'payment.created',
            payment
        );

        return payment;
    }

    async getPayment(id) {
        const payment = await Payment.findById(id);
        if (!payment) throw new Error('Payment not found');
        return payment;
    }

    async canAccessPayment(rideId, requestUserId, requestRole) {
        if (!requestUserId) return false;
        if ((requestRole || '').toUpperCase() === 'ADMIN') return true;
        try {
            const ride = await rideServiceClient.getRide(rideId);
            return ride && String(ride.userId) === String(requestUserId);
        } catch (e) {
            return false;
        }
    }

    async getPaymentsByRide(rideId) {
        return await Payment.findByRideId(rideId);
    }

    async confirmPayment(id) {
        const payment = await Payment.findById(id);
        if (!payment) throw new Error('Payment not found');
        if (payment.status !== 'PENDING') throw new Error('Payment is not pending');

        // Giả lập gọi PSP (Stripe, VNPay, MoMo...)
        const pspSuccess = await this.mockPSP(payment.amount);
        if (!pspSuccess) throw new Error('PSP payment failed');

        const confirmedPayment = await Payment.confirm(id);

        // Publish event for Notification Service
        await rabbitmq.publish(
            rabbitmq.config.exchanges.paymentEvents,
            'payment.success',
            confirmedPayment
        );

        return confirmedPayment;
    }

    async refundPayment(id) {
        const payment = await Payment.findById(id);
        if (!payment) throw new Error('Payment not found');
        if (payment.status !== 'SUCCESS') throw new Error('Cannot refund non-successful payment');

        // Giả lập refund PSP
        const refundSuccess = await this.mockRefund(payment.amount);
        if (!refundSuccess) throw new Error('Refund failed');

        return await Payment.refund(id);
    }

    async mockPSP(amount) {
        // Giả lập 90% thành công
        return Math.random() < 0.9;
    }

    async mockRefund(amount) {
        // Giả lập refund
        return Math.random() < 0.95;
    }
}

module.exports = new PaymentService();