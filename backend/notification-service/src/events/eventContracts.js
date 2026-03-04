module.exports = {
  EVENTS: {
    // Ride lifecycle
    RIDE_CREATED: 'RideCreated',
    RIDE_ASSIGNED: 'RideAssigned',
    RIDE_COMPLETED: 'RideCompleted',

    // Payment Saga
    PAYMENT_SUCCESS: 'PaymentSuccess',
    PAYMENT_FAILED: 'PaymentFailed',
    PAYMENT_REFUNDED: 'PaymentRefunded',

    // Pricing
    SURGE_PRICE_UPDATED: 'SurgePriceUpdated',
  }
};
