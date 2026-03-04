#!/bin/bash
# Health Check Script - Bash version
# Tests all microservices health endpoints

set -e

BASE_URL="http://localhost"
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "========================================="
echo "   CAB Booking System - Health Check"
echo "========================================="
echo ""

# Function to check health
check_health() {
    local service=$1
    local port=$2
    local url="${BASE_URL}:${port}/health"
    
    echo -n "Checking ${service} (port ${port})... "
    
    if response=$(curl -s -f -m 5 "$url" 2>/dev/null); then
        echo -e "${GREEN}✅ OK${NC}"
        return 0
    else
        echo -e "${RED}❌ FAILED${NC}"
        return 1
    fi
}

# Track results
total=0
passed=0

# Test all services
services=(
    "API Gateway:3000"
    "Auth Service:3001"
    "User Service:3002"
    "Driver Service:3003"
    "Booking Service:3004"
    "Ride Service:3005"
    "Payment Service:3006"
    "Pricing Service:3007"
    "Notification Service:3008"
    "Review Service:3009"
)

for service_info in "${services[@]}"; do
    IFS=':' read -r service port <<< "$service_info"
    total=$((total + 1))
    if check_health "$service" "$port"; then
        passed=$((passed + 1))
    fi
done

echo ""
echo "========================================="
echo -e "Results: ${GREEN}${passed}/${total}${NC} services healthy"
echo "========================================="

if [ $passed -eq $total ]; then
    echo -e "${GREEN}All services are running! ✅${NC}"
    exit 0
else
    echo -e "${RED}Some services are down! ❌${NC}"
    exit 1
fi
