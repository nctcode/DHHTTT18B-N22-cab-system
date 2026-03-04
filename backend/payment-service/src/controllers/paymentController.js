const paymentService = require('../services/paymentService');

class PaymentController {
    async createPayment(req, res) {
        try {
            const requestUserId = req.user?.id;
            const requestRole = req.user?.role;
            
            if (!requestUserId) {
                return res.status(401).json({ error: 'Authentication required' });
            }

            // Check role - only USER or ADMIN can create payment
            const role = (requestRole || '').toUpperCase();
            if (role === 'DRIVER') {
                return res.status(403).json({ error: 'Drivers cannot create payments' });
            }

            const { rideId, amount, method } = req.body;
            
            if (!rideId || !amount) {
                return res.status(400).json({ 
                    error: 'Validation failed',
                    details: {
                        rideId: !rideId ? 'rideId is required' : undefined,
                        amount: !amount ? 'amount is required' : undefined
                    }
                });
            }

            // Validate rideId is a string (UUID)
            if (typeof rideId !== 'string' || !rideId.trim()) {
                return res.status(400).json({ 
                    error: 'Validation failed',
                    details: {
                        rideId: 'rideId must be a non-empty string'
                    }
                });
            }

            // Validate amount is a positive number
            if (typeof amount !== 'number' || amount <= 0) {
                return res.status(400).json({ 
                    error: 'Validation failed',
                    details: {
                        amount: 'amount must be a positive number'
                    }
                });
            }

            // Validate method if provided
            const validMethods = ['CASH', 'CARD', 'WALLET', 'MOMO', 'VNPAY'];
            if (method && !validMethods.includes(method)) {
                return res.status(400).json({ 
                    error: 'Validation failed',
                    details: {
                        method: `method must be one of: ${validMethods.join(', ')}`
                    }
                });
            }

            const payment = await paymentService.createPayment(rideId, amount, method, requestUserId, requestRole);
            res.status(201).json(payment);
        } catch (error) {
            // Use statusCode from error if available
            const statusCode = error.statusCode || 500;
            
            if (statusCode === 401) {
                return res.status(401).json({ error: error.message });
            }
            if (statusCode === 403) {
                return res.status(403).json({ error: error.message });
            }
            if (statusCode === 404) {
                return res.status(404).json({ error: error.message });
            }
            if (statusCode === 409) {
                return res.status(409).json({ error: error.message });
            }
            if (statusCode === 400) {
                return res.status(400).json({ error: error.message });
            }
            
            // Generic error
            console.error('Payment creation error:', error);
            res.status(500).json({ error: 'Internal server error', details: error.message });
        }
    }

    async getPayment(req, res) {
        try {
            const requestUserId = req.user?.id;
            const requestRole = (req.user?.role || '').toUpperCase();
            const { id } = req.params;
            const payment = await paymentService.getPayment(id);
            const canAccess = await paymentService.canAccessPayment(payment.rideId, requestUserId, requestRole);
            if (!canAccess) {
                return res.status(403).json({ error: 'Access denied to this payment' });
            }
            res.json(payment);
        } catch (error) {
            res.status(404).json({ error: error.message });
        }
    }

    async getPaymentsByRide(req, res) {
        try {
            const requestUserId = req.user?.id;
            const requestRole = (req.user?.role || '').toUpperCase();
            const { rideId } = req.params;
            const canAccess = await paymentService.canAccessPayment(rideId, requestUserId, requestRole);
            if (!canAccess) {
                return res.status(403).json({ error: 'Access denied to this ride payments' });
            }
            const payments = await paymentService.getPaymentsByRide(rideId);
            res.json(payments);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async confirmPayment(req, res) {
        try {
            const { id } = req.params;
            const payment = await paymentService.confirmPayment(id);
            res.json({ message: 'Payment confirmed', payment });
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    }

    async refundPayment(req, res) {
        try {
            const { id } = req.params;
            const payment = await paymentService.refundPayment(id);
            res.json({ message: 'Payment refunded', payment });
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    }
}

module.exports = new PaymentController();