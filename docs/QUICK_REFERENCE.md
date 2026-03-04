# Quick Reference - Payment Flow Implementation

## 🎯 Key Changes at a Glance

### What Changed?
| Aspect | Before | After | Status |
|--------|--------|-------|--------|
| Distance Validation | 200m | **100m** ✅ | FIXED |
| Payment Method Preservation | Sometimes Lost | Always Copy from Booking ✅ | FIXED |
| Payment Status Logic | Inconsistent | CASH→UNPAID, WALLET→PENDING ✅ | FIXED |
| Event Naming | Various patterns | Standardized `ride.*` ✅ | FIXED |
| Driver ID in Payment | Not tracked | Now stored ✅ | FIXED |
| Input Validation | None | Full validation ✅ | ADDED |

---

## 📝 Developer Quick Reference

### Booking Creation (Frontend)
```javascript
POST /api/bookings
{
  "pickup": { "lat": 10.7769, "lng": 106.6966, "address": "..." },
  "dropoff": { "lat": 10.7890, "lng": 106.7050, "address": "..." },
  "vehicleType": "CAR",
  "estimatedPrice": 150000,
  "paymentMethod": "WALLET"  // ← MUST INCLUDE
}
```

### Ride Creation (Backend)
```javascript
POST /api/rides
{
  "bookingId": "booking-123",
  "passengerId": "user-456",
  "driverId": "driver-789",
  // paymentMethod auto-copied from booking
}
```

### Ride Completion
```javascript
PATCH /api/rides/:id/complete
{
  "actualDistanceKm": 2.3,
  "actualDurationMin": 7,
  "driverLocation": { "lat": 10.7890, "lng": 106.7050 }  // Must be ≤100m from dropoff
}
```

### Cash Payment Confirmation (Driver Only)
```javascript
PATCH /api/rides/:id/confirm-cash-payment
// No body needed, driver identity from auth header
```

---

## 🔄 Payment Flow Decision Tree

```
Start
├─ paymentMethod = CASH?
│  ├─ YES → completeRide()
│  │  └─ Set paymentStatus = UNPAID
│  │  └─ Driver must call confirm-cash-payment
│  │  └─ Then paymentStatus = PAID
│  │
│  └─ NO (WALLET)
│     └─ completeRide()
│     └─ Set paymentStatus = PENDING
│     └─ Publish ride.payment.process
│     └─ Payment Service processes charge
│     └─ Publish ride.payment.completed or ride.payment.failed
```

---

## ⚡ Event Publishing Sequence

### CASH Ride
```
ride.completed
└─ paymentStatus: UNPAID
   └─ Driver calls confirm-cash-payment
      └─ ride.payment.completed
         └─ Set paymentStatus = PAID
```

### WALLET Ride
```
ride.completed
└─ paymentStatus: PENDING
   └─ Publish ride.payment.process
      └─ Payment Service processes payment
         ├─ Success → ride.payment.completed
         │  └─ Set paymentStatus = SUCCESS
         │
         └─ Failure → ride.payment.failed
            └─ Set paymentStatus = FAILED
```

---

## 🛠️ Common Tasks

### Display Payment Status to User

**After Ride Completion**:

```javascript
if (ride.paymentMethod === 'CASH') {
  display(`Payment: ${ride.paymentMethod}`);
  display(`Status: ${ride.paymentStatus === 'UNPAID' ? 'Awaiting Driver' : 'Paid'}`);
  
  // If driver: show confirm button
  if (userRole === 'DRIVER' && ride.paymentStatus === 'UNPAID') {
    enableButton('confirm-cash-payment');
  }
} else {
  // WALLET
  display(`Payment: ${ride.paymentMethod}`);
  display(`Status: ${ride.paymentStatus === 'PENDING' ? 'Processing...' : ride.paymentStatus}`);
  
  // Listen for event
  onEvent('ride.payment.completed', () => {
    display('Status: Paid ✓');
  });
}
```

### Check if Payment Processing is Working

```bash
# 1. Check Wallet ride was created correctly
curl http://localhost:3005/api/rides/{rideId}
# Should show: paymentMethod: "WALLET", paymentStatus: "UNPAID"

# 2. Complete the ride
curl -X PATCH http://localhost:3005/api/rides/{rideId}/complete ...
# Should show: paymentStatus: "PENDING"

# 3. Monitor RabbitMQ for events
rabbitmqctl list_queues | grep ride
# Should see ride.payment.process being consumed

# 4. Check payment-service logs
docker logs payment-service | grep payment
# Should see processing logs
```

---

## 🔍 Debugging Checklist

- [ ] Booking includes `paymentMethod`
- [ ] Ride was created with correct `paymentMethod` (check booking first)
- [ ] After complete: CASH shows `UNPAID`, WALLET shows `PENDING`
- [ ] Events are publishing to RabbitMQ (check logs)
- [ ] Payment Service is processing events (check logs)
- [ ] Database has unique constraint on `payments(ride_id)`

---

## 📋 Migration Checklist

- [ ] Apply database constraint: `ALTER TABLE payments ADD CONSTRAINT unique_ride_id UNIQUE (ride_id);`
- [ ] Update booking route to require validation
- [ ] Update ride route to accept paymentMethod
- [ ] Update payment saga to save driver_id
- [ ] Verify distance validation is 0.1 km (100m)
- [ ] Test CASH flow end-to-end
- [ ] Test WALLET flow end-to-end
- [ ] Monitor payment events

---

## 🚨 Critical Constraints

| Constraint | Reason | Impact if Ignored |
|-----------|--------|------------------|
| Distance ≤ 100m | Safety & accuracy | Fraud, customer disputes |
| paymentMethod immutable after start | Payment tracking | Billing errors |
| UNIQUE(ride_id) on payments | Idempotency | Double charging |
| paymentStatus UNPAID for CASH | Confirmation flow | Missed payments |
| paymentStatus PENDING for WALLET | Async processing | Payment loops |

---

## 📊 Key Metrics

### Happy Path Times (Expected)
- CASH confirmation: 1-2 minutes (manual driver action)
- WALLET payment: < 5 seconds (automated)
- Event propagation: < 1 second

### Error Conditions
- Double payment attempts (should be rejected by unique constraint)
- Payment retry (auto-retry up to 3 times)
- Distance validation (should reject if > 100m)

---

## 🔐 Security Notes

1. **Authentication**: All endpoints require JWT token except internal APIs
2. **Authorization**: Drivers can only confirm their own cash payments
3. **Idempotency**: Payment processed max once per ride (DB constraint)
4. **Encryption**: Sensitive data in transit (HTTPS)
5. **Audit**: All payment transactions logged in DB

---

## 📞 Support Resources

- **Full Documentation**: See `PAYMENT_FLOW.md`
- **Summary of Changes**: See `PAYMENT_FIXES_SUMMARY.md`
- **Test Suite**: See `tests/payment-flow-test.sh`
- **Complete Report**: See `IMPLEMENTATION_COMPLETE.md`

---

## Final Verification

Before going to production:

```bash
# Run test suite
bash tests/payment-flow-test.sh

# Check all services running
curl http://localhost:3004/health  # booking-service
curl http://localhost:3005/health  # ride-service
curl http://localhost:3008/health  # payment-service

# Verify database migrations
SELECT COUNT(*) FROM payments WHERE ride_id IS NOT NULL;

# Monitor logs
docker-compose logs -f
```

✅ **Ready to Deploy!**

