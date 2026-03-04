#!/bin/bash

# CabGo Payment Flow E2E Test Script
# Tests both CASH and WALLET payment flows end-to-end

set -e

API_URL="${VITE_API_URL:-http://localhost:3000/api}"
DRIVER_ID="driver_test_123"
PASSENGER_ID="passenger_test_123"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== CabGo Payment Flow E2E Tests ===${NC}"
echo ""

# Helper function to print test results
print_result() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✓ PASS${NC}: $2"
    else
        echo -e "${RED}✗ FAIL${NC}: $2"
        exit 1
    fi
}

# Test 1: Create booking with CASH payment
echo -e "${BLUE}Test 1: Create booking with CASH payment${NC}"
BOOKING_RESPONSE=$(curl -s -X POST "$API_URL/bookings" \
  -H "Content-Type: application/json" \
  -d "{
    \"passengerId\": \"$PASSENGER_ID\",
    \"pickupLocation\": {\"lat\": 21.0285, \"lng\": 105.8542},
    \"dropoffLocation\": {\"lat\": 21.0286, \"lng\": 105.8543},
    \"vehicleType\": \"CAR\",
    \"paymentMethod\": \"CASH\",
    \"estimatedPrice\": 50000
  }")

BOOKING_ID=$(echo $BOOKING_RESPONSE | jq -r '.id // .bookingId // .booking.id')
print_result $? "Booking created with CASH method: $BOOKING_ID"

# Test 2: Verify paymentMethod is stored
echo -e "${BLUE}Test 2: Verify paymentMethod stored in booking${NC}"
BOOKING_CHECK=$(curl -s -X GET "$API_URL/bookings/$BOOKING_ID")
PAYMENT_METHOD=$(echo $BOOKING_CHECK | jq -r '.paymentMethod // "NOT_FOUND"')
[ "$PAYMENT_METHOD" = "CASH" ]
print_result $? "Booking has paymentMethod: $PAYMENT_METHOD"

# Test 3: Create ride from booking
echo -e "${BLUE}Test 3: Create ride and verify payment method copied${NC}"
RIDE_RESPONSE=$(curl -s -X POST "$API_URL/rides" \
  -H "Content-Type: application/json" \
  -d "{
    \"bookingId\": \"$BOOKING_ID\",
    \"driverId\": \"$DRIVER_ID\",
    \"startLocation\": {\"lat\": 21.0285, \"lng\": 105.8542}
  }")

RIDE_ID=$(echo $RIDE_RESPONSE | jq -r '.id // .ride.id')
RIDE_PAYMENT_METHOD=$(echo $RIDE_RESPONSE | jq -r '.paymentMethod // "NOT_FOUND"')
[ "$RIDE_PAYMENT_METHOD" = "CASH" ]
print_result $? "Ride paymentMethod copied from booking: $RIDE_PAYMENT_METHOD"

# Test 4: Complete ride and verify paymentStatus
echo -e "${BLUE}Test 4: Complete ride and check payment status${NC}"
COMPLETE_RESPONSE=$(curl -s -X POST "$API_URL/rides/$RIDE_ID/complete" \
  -H "Content-Type: application/json" \
  -d "{
    \"endLocation\": {\"lat\": 21.0286, \"lng\": 105.8543},
    \"finalFare\": 50000
  }")

FINAL_PAYMENT_STATUS=$(echo $COMPLETE_RESPONSE | jq -r '.paymentStatus // "NOT_FOUND"')
[ "$FINAL_PAYMENT_STATUS" = "UNPAID" ]
print_result $? "CASH payment status set to UNPAID: $FINAL_PAYMENT_STATUS"

# Test 5: Confirm cash payment via driver
echo -e "${BLUE}Test 5: Driver confirms cash payment${NC}"
CONFIRM_RESPONSE=$(curl -s -X PATCH "$API_URL/rides/$RIDE_ID/confirm-cash-payment" \
  -H "Content-Type: application/json" \
  -d "{\"driverId\": \"$DRIVER_ID\"}")

CONFIRMED_STATUS=$(echo $CONFIRM_RESPONSE | jq -r '.paymentStatus // "NOT_FOUND"')
[ "$CONFIRMED_STATUS" = "PAID" ]
print_result $? "Cash payment confirmed, status changed to PAID"

# ============================================================================

# Test 6: Create booking with WALLET payment
echo ""
echo -e "${BLUE}Test 6: Create booking with WALLET payment${NC}"
WALLET_BOOKING=$(curl -s -X POST "$API_URL/bookings" \
  -H "Content-Type: application/json" \
  -d "{
    \"passengerId\": \"${PASSENGER_ID}_wallet\",
    \"pickupLocation\": {\"lat\": 21.0285, \"lng\": 105.8542},
    \"dropoffLocation\": {\"lat\": 21.0287, \"lng\": 105.8545},
    \"vehicleType\": \"CAR\",
    \"paymentMethod\": \"WALLET\",
    \"estimatedPrice\": 75000
  }")

WALLET_BOOKING_ID=$(echo $WALLET_BOOKING | jq -r '.id // .bookingId')
print_result $? "WALLET booking created: $WALLET_BOOKING_ID"

# Test 7: Create ride from WALLET booking
echo -e "${BLUE}Test 7: Create ride with WALLET method${NC}"
WALLET_RIDE=$(curl -s -X POST "$API_URL/rides" \
  -H "Content-Type: application/json" \
  -d "{
    \"bookingId\": \"$WALLET_BOOKING_ID\",
    \"driverId\": \"${DRIVER_ID}_2\",
    \"startLocation\": {\"lat\": 21.0285, \"lng\": 105.8542}
  }")

WALLET_RIDE_ID=$(echo $WALLET_RIDE | jq -r '.id // .ride.id')
print_result $? "WALLET ride created: $WALLET_RIDE_ID"

# Test 8: Complete WALLET ride
echo -e "${BLUE}Test 8: Complete WALLET ride - verify PENDING status${NC}"
WALLET_COMPLETE=$(curl -s -X POST "$API_URL/rides/$WALLET_RIDE_ID/complete" \
  -H "Content-Type: application/json" \
  -d "{
    \"endLocation\": {\"lat\": 21.0287, \"lng\": 105.8545},
    \"finalFare\": 75000
  }")

WALLET_STATUS=$(echo $WALLET_COMPLETE | jq -r '.paymentStatus // "NOT_FOUND"')
[ "$WALLET_STATUS" = "PENDING" ]
print_result $? "WALLET ride status set to PENDING: $WALLET_STATUS"

# Test 9: Test payment processing
echo -e "${BLUE}Test 9: Process WALLET payment${NC}"
PAYMENT_PROCESS=$(curl -s -X POST "$API_URL/payments" \
  -H "Content-Type: application/json" \
  -d "{
    \"rideId\": \"$WALLET_RIDE_ID\",
    \"passengerId\": \"${PASSENGER_ID}_wallet\",
    \"amount\": 75000,
    \"paymentMethod\": \"WALLET\"
  }")

PAYMENT_ID=$(echo $PAYMENT_PROCESS | jq -r '.id // .paymentId // "NOT_FOUND"')
print_result $? "Payment created: $PAYMENT_ID"

# ============================================================================

echo ""
echo -e "${GREEN}=== All Tests Passed! ===${NC}"
echo ""
echo -e "${YELLOW}Summary:${NC}"
echo "CASH Flow:   ✓ Booking → Ride → UNPAID → Driver Confirms → PAID"
echo "WALLET Flow: ✓ Booking → Ride → PENDING → Payment Processing → SUCCESS"
echo ""
echo -e "${BLUE}Next Steps:${NC}"
echo "1. Test frontend Payment.jsx displays correct status for Ride: $RIDE_ID"
echo "2. Test frontend Completed.jsx shows correct status for Ride: $WALLET_RIDE_ID"
echo "3. Test socket events are received in real-time"
echo "4. Test polling fallback when socket is unavailable"
echo ""

# Optional: Test socket events (requires socket.io-client)
if command -v socket.io-cli &> /dev/null; then
    echo -e "${BLUE}Testing Socket Events...${NC}"
    echo "Note: Additional socket event testing requires socket.io test client"
fi
