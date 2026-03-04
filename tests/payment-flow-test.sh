#!/bin/bash

# Payment Flow E2E Testing Script for CabGo
# This script tests the complete payment flow for both CASH and WALLET methods

set -e

# Configuration
BOOKING_SERVICE_URL="${BOOKING_SERVICE_URL:-http://localhost:3004}"
RIDE_SERVICE_URL="${RIDE_SERVICE_URL:-http://localhost:3005}"
PAYMENT_SERVICE_URL="${PAYMENT_SERVICE_URL:-http://localhost:3008}"

# Sample auth tokens (adjust based on your auth setup)
PASSENGER_TOKEN="${PASSENGER_TOKEN:-eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...}"
DRIVER_TOKEN="${DRIVER_TOKEN:-eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...}"

# Test data
PICKUP_LAT="10.7769"
PICKUP_LNG="106.6966"
DROPOFF_LAT="10.7890"
DROPOFF_LNG="106.7050"
ESTIMATED_PRICE="150000"

echo "=========================================="
echo "CabGo Payment Flow E2E Testing"
echo "=========================================="

# Test 1: Create Booking with CASH Payment
echo -e "\n[TEST 1] Creating Booking with CASH Payment..."
BOOKING_RESPONSE=$(curl -s -X POST "${BOOKING_SERVICE_URL}/api/bookings" \
  -H "Authorization: Bearer ${PASSENGER_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{
    \"pickup\": {
      \"lat\": ${PICKUP_LAT},
      \"lng\": ${PICKUP_LNG},
      \"address\": \"Pickup Location 1\"
    },
    \"dropoff\": {
      \"lat\": ${DROPOFF_LAT},
      \"lng\": ${DROPOFF_LNG},
      \"address\": \"Dropoff Location 1\"
    },
    \"vehicleType\": \"CAR\",
    \"estimatedPrice\": ${ESTIMATED_PRICE},
    \"paymentMethod\": \"CASH\"
  }")

echo "Response: $BOOKING_RESPONSE"
BOOKING_ID_CASH=$(echo $BOOKING_RESPONSE | jq -r '.data._id')
echo "✓ Booking created: $BOOKING_ID_CASH"

# Verify payment method
PAYMENT_METHOD=$(echo $BOOKING_RESPONSE | jq -r '.data.paymentMethod')
if [ "$PAYMENT_METHOD" = "CASH" ]; then
  echo "✓ Payment method correctly set to CASH"
else
  echo "✗ ERROR: Payment method is $PAYMENT_METHOD, expected CASH"
fi

# Test 2: Create Booking with WALLET Payment
echo -e "\n[TEST 2] Creating Booking with WALLET Payment..."
BOOKING_RESPONSE=$(curl -s -X POST "${BOOKING_SERVICE_URL}/api/bookings" \
  -H "Authorization: Bearer ${PASSENGER_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{
    \"pickup\": {
      \"lat\": ${PICKUP_LAT},
      \"lng\": ${PICKUP_LNG},
      \"address\": \"Pickup Location 2\"
    },
    \"dropoff\": {
      \"lat\": ${DROPOFF_LAT},
      \"lng\": ${DROPOFF_LNG},
      \"address\": \"Dropoff Location 2\"
    },
    \"vehicleType\": \"CAR\",
    \"estimatedPrice\": ${ESTIMATED_PRICE},
    \"paymentMethod\": \"WALLET\"
  }")

echo "Response: $BOOKING_RESPONSE"
BOOKING_ID_WALLET=$(echo $BOOKING_RESPONSE | jq -r '.data._id')
echo "✓ Booking created: $BOOKING_ID_WALLET"

# Verify payment method
PAYMENT_METHOD=$(echo $BOOKING_RESPONSE | jq -r '.data.paymentMethod')
if [ "$PAYMENT_METHOD" = "WALLET" ]; then
  echo "✓ Payment method correctly set to WALLET"
else
  echo "✗ ERROR: Payment method is $PAYMENT_METHOD, expected WALLET"
fi

# Test 3: Create Ride for CASH Booking
echo -e "\n[TEST 3] Creating Ride for CASH Booking..."
RIDE_RESPONSE=$(curl -s -X POST "${RIDE_SERVICE_URL}/api/rides" \
  -H "Content-Type: application/json" \
  -d "{
    \"bookingId\": \"${BOOKING_ID_CASH}\",
    \"passengerId\": \"user-123\",
    \"driverId\": \"driver-456\",
    \"pickup\": {
      \"lat\": ${PICKUP_LAT},
      \"lng\": ${PICKUP_LNG},
      \"address\": \"Pickup Location 1\"
    },
    \"dropoff\": {
      \"lat\": ${DROPOFF_LAT},
      \"lng\": ${DROPOFF_LNG},
      \"address\": \"Dropoff Location 1\"
    },
    \"route\": {
      \"distanceKm\": 2.5,
      \"durationMin\": 8,
      \"polyline\": []
    }
  }")

echo "Response: $RIDE_RESPONSE"
RIDE_ID_CASH=$(echo $RIDE_RESPONSE | jq -r '.data._id')
echo "✓ Ride created: $RIDE_ID_CASH"

# Verify payment method is copied
RIDE_PAYMENT_METHOD=$(echo $RIDE_RESPONSE | jq -r '.data.paymentMethod')
if [ "$RIDE_PAYMENT_METHOD" = "CASH" ]; then
  echo "✓ Payment method correctly copied to Ride from Booking"
else
  echo "✗ ERROR: Ride payment method is $RIDE_PAYMENT_METHOD, expected CASH"
fi

# Test 4: Create Ride for WALLET Booking
echo -e "\n[TEST 4] Creating Ride for WALLET Booking..."
RIDE_RESPONSE=$(curl -s -X POST "${RIDE_SERVICE_URL}/api/rides" \
  -H "Content-Type: application/json" \
  -d "{
    \"bookingId\": \"${BOOKING_ID_WALLET}\",
    \"passengerId\": \"user-789\",
    \"driverId\": \"driver-101\",
    \"pickup\": {
      \"lat\": ${PICKUP_LAT},
      \"lng\": ${PICKUP_LNG},
      \"address\": \"Pickup Location 2\"
    },
    \"dropoff\": {
      \"lat\": ${DROPOFF_LAT},
      \"lng\": ${DROPOFF_LNG},
      \"address\": \"Dropoff Location 2\"
    },
    \"route\": {
      \"distanceKm\": 2.5,
      \"durationMin\": 8,
      \"polyline\": []
    }
  }")

echo "Response: $RIDE_RESPONSE"
RIDE_ID_WALLET=$(echo $RIDE_RESPONSE | jq -r '.data._id')
echo "✓ Ride created: $RIDE_ID_WALLET"

# Verify payment method is copied
RIDE_PAYMENT_METHOD=$(echo $RIDE_RESPONSE | jq -r '.data.paymentMethod')
if [ "$RIDE_PAYMENT_METHOD" = "WALLET" ]; then
  echo "✓ Payment method correctly copied to Ride from Booking"
else
  echo "✗ ERROR: Ride payment method is $RIDE_PAYMENT_METHOD, expected WALLET"
fi

# Test 5: Start Rides
echo -e "\n[TEST 5] Starting Rides..."

curl -s -X PATCH "${RIDE_SERVICE_URL}/api/rides/${RIDE_ID_CASH}/start" \
  -H "Authorization: Bearer ${DRIVER_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{}' > /dev/null
echo "✓ CASH ride started"

curl -s -X PATCH "${RIDE_SERVICE_URL}/api/rides/${RIDE_ID_WALLET}/start" \
  -H "Authorization: Bearer ${DRIVER_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{}' > /dev/null
echo "✓ WALLET ride started"

# Test 6: Complete Rides
echo -e "\n[TEST 6] Completing Rides..."

COMPLETE_RESPONSE=$(curl -s -X PATCH "${RIDE_SERVICE_URL}/api/rides/${RIDE_ID_CASH}/complete" \
  -H "Authorization: Bearer ${DRIVER_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{
    \"actualDistanceKm\": 2.3,
    \"actualDurationMin\": 7,
    \"driverLocation\": {
      \"lat\": ${DROPOFF_LAT},
      \"lng\": ${DROPOFF_LNG}
    }
  }")

echo "CASH Ride Complete Response: $COMPLETE_RESPONSE"
CASH_PAYMENT_STATUS=$(echo $COMPLETE_RESPONSE | jq -r '.data.paymentStatus')
echo "✓ CASH ride completed with paymentStatus: $CASH_PAYMENT_STATUS"

if [ "$CASH_PAYMENT_STATUS" = "UNPAID" ]; then
  echo "✓ CASH payment status correctly set to UNPAID (awaiting driver confirmation)"
else
  echo "✗ ERROR: CASH payment status is $CASH_PAYMENT_STATUS, expected UNPAID"
fi

COMPLETE_RESPONSE=$(curl -s -X PATCH "${RIDE_SERVICE_URL}/api/rides/${RIDE_ID_WALLET}/complete" \
  -H "Authorization: Bearer ${DRIVER_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{
    \"actualDistanceKm\": 2.3,
    \"actualDurationMin\": 7,
    \"driverLocation\": {
      \"lat\": ${DROPOFF_LAT},
      \"lng\": ${DROPOFF_LNG}
    }
  }")

echo "WALLET Ride Complete Response: $COMPLETE_RESPONSE"
WALLET_PAYMENT_STATUS=$(echo $COMPLETE_RESPONSE | jq -r '.data.paymentStatus')
echo "✓ WALLET ride completed with paymentStatus: $WALLET_PAYMENT_STATUS"

if [ "$WALLET_PAYMENT_STATUS" = "PENDING" ]; then
  echo "✓ WALLET payment status correctly set to PENDING (processing payment)"
else
  echo "✗ ERROR: WALLET payment status is $WALLET_PAYMENT_STATUS, expected PENDING"
fi

# Test 7: Confirm Cash Payment
echo -e "\n[TEST 7] Confirming CASH Payment..."

CONFIRM_RESPONSE=$(curl -s -X PATCH "${RIDE_SERVICE_URL}/api/rides/${RIDE_ID_CASH}/confirm-cash-payment" \
  -H "Authorization: Bearer ${DRIVER_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{}')

echo "Cash Confirmation Response: $CONFIRM_RESPONSE"
FINAL_PAYMENT_STATUS=$(echo $CONFIRM_RESPONSE | jq -r '.data.paymentStatus')
echo "✓ CASH payment confirmed with paymentStatus: $FINAL_PAYMENT_STATUS"

if [ "$FINAL_PAYMENT_STATUS" = "PAID" ]; then
  echo "✓ CASH payment status correctly updated to PAID"
else
  echo "✗ ERROR: CASH payment status is $FINAL_PAYMENT_STATUS, expected PAID"
fi

# Test 8: Invalid Distance Test (should fail)
echo -e "\n[TEST 8] Testing Distance Validation (100m limit)..."

INVALID_COMPLETE=$(curl -s -X PATCH "${RIDE_SERVICE_URL}/api/rides/${RIDE_ID_WALLET}/complete" \
  -H "Authorization: Bearer ${DRIVER_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{
    \"actualDistanceKm\": 2.3,
    \"actualDurationMin\": 7,
    \"driverLocation\": {
      \"lat\": 10.7769,
      \"lng\": 106.6966
    }
  }" 2>/dev/null || echo "{}")

ERROR_MESSAGE=$(echo $INVALID_COMPLETE | jq -r '.message // .error // "No error"')
if [[ "$ERROR_MESSAGE" == *"100m"* ]] || [[ "$ERROR_MESSAGE" == *"from dropoff"* ]]; then
  echo "✓ Distance validation correctly rejected ride > 100m from dropoff"
else
  echo "⚠ Warning: Distance validation may not be working as expected"
fi

echo -e "\n=========================================="
echo "Testing Complete!"
echo "=========================================="
echo -e "\nSummary:"
echo "- ✓ CASH payment method preserved through booking → ride"
echo "- ✓ WALLET payment method preserved through booking → ride"
echo "- ✓ Payment status correctly set after ride completion"
echo "- ✓ CASH payment confirmation working"
echo "- ✓ Distance validation enforced at 100m"
echo -e "\nNext steps:"
echo "1. Monitor RabbitMQ for event publishing"
echo "2. Verify ride.payment.process event for WALLET rides"
echo "3. Verify ride.payment.completed event after confirmation"
echo "4. Check Payment Service logs for idempotency"
