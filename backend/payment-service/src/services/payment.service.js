const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const eventBus = require('../events/eventBus');
const { EVENTS } = require('../events/eventContracts');

class PaymentService {

  checkAccess(payment, user) {
    if (!user) throw new Error('Unauthorized');
    const { id, role } = user;
    if (role === 'ADMIN') return true;
    if (role === 'PASSENGER' && payment.passenger_id === id) return true;
    return false;
  }

  /**
   * Create Payment manually (e.g. via API) using Saga flow
   */
  async createPayment(data, user) {
    const { rideId, passengerId, amount, method } = data;

    if (!rideId || !passengerId || !amount || !method) {
      throw new Error('Missing required fields');
    }

    if (user) {
        if (user.role === 'DRIVER') throw new Error('Drivers cannot create payments');
        if (user.role === 'PASSENGER' && user.id !== passengerId) throw new Error('Can only create payment for yourself');
    }
    
    // Simulate RideFinished event to trigger Saga
    // In strict choregraphy, this service might just be a query service + trigger
    eventBus.publish(EVENTS.RIDE_FINISHED, {
        rideId,
        passengerId,
        amount,
        method,
        driverId: null // API creation might miss driverId unless provided. 
                       // For API based creation, we might need to fetch ride/driver or pass it.
                       // Use API payload if available.
    });

    // We return a placeholder or wait?
    // As async saga, we return acceptance. 
    // Client polls or waits for socket.
    return { message: 'Payment processing started', status: 'PENDING', rideId };
  }

  async getPayment(id, user) {
    const payment = await prisma.payment.findUnique({ where: { id } });
    if (!payment) throw new Error('Payment not found');
    
    if (user && !this.checkAccess(payment, user)) {
        throw new Error('Forbidden: Access denied');
    }
    return payment;
  }

  async getByRide(rideId, user) {
    const payments = await prisma.payment.findMany({ where: { ride_id: rideId } });
    if (user && user.role !== 'ADMIN') {
        const owned = payments.filter(p => p.passenger_id === user.id);
        if (owned.length === 0 && payments.length > 0) throw new Error('Forbidden'); 
        return owned;
    }
    return payments;
  }

  async getByPassenger(passengerId, user) {
    if (user && user.role !== 'ADMIN' && user.id !== passengerId) {
        throw new Error('Forbidden');
    }
    return await prisma.payment.findMany({ 
        where: { passenger_id: passengerId },
        orderBy: { created_at: 'desc' }
    });
  }

  // Manual triggers (Admin/System usually)
  async successPayment(id, user) {
     // Saga handles this usually via wallet credit. 
     // For manual override:
     if (user && user.role !== 'ADMIN') throw new Error('Forbidden. Only Admin can manually force success.');

     const payment = await prisma.payment.update({
         where: { id },
         data: { status: 'SUCCESS', saga_status: 'CHARGE_SUCCESS' } 
     });
     eventBus.publish(EVENTS.PAYMENT_SUCCESS, payment);
     return payment;
  }

  async failPayment(id, user) {
     if (user && user.role !== 'ADMIN') throw new Error('Forbidden');
     return await prisma.payment.update({
         where: { id },
         data: { status: 'FAILED' }
     });
  }

  async refundPayment(id, user) {
     if (user && user.role !== 'ADMIN') throw new Error('Forbidden');
     
     // Trigger compensation logic manually? or just update DB?
     // Better to invoke Saga compensation logic if possible, or simple DB update if purely manual
     return await prisma.payment.update({
         where: { id },
         data: { status: 'REFUNDED' }
     });
  }

  async retryPayment(rideId, user) {
     const payment = await prisma.payment.findFirst({ where: { ride_id: rideId } });
     if (!payment) throw new Error('Payment not found for this ride');

     if (user && user.role === 'PASSENGER' && payment.passenger_id !== user.id) {
         throw new Error('Forbidden: Not your payment');
     }

     if (payment.status !== 'FAILED') {
         throw new Error('Can only retry FAILED payments');
     }

     const updated = await prisma.payment.update({
         where: { id: payment.id },
         data: { status: 'PENDING', saga_status: 'STARTED', retry_count: 0 }
     });

     eventBus.publish(EVENTS.PAYMENT_RETRY_REQUESTED, { paymentId: payment.id });
     return updated;
  }
}

module.exports = new PaymentService();
