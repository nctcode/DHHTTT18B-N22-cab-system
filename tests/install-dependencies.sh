#!/bin/bash
# install-dependencies.sh
# Script to install all new dependencies for security and resilience features

echo "🚀 Installing dependencies for Scalability & Resilience features..."

# Colors for output
GREEN='\033[0.32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}================================${NC}"
echo -e "${BLUE}Installing Shared Resilience Module${NC}"
echo -e "${BLUE}================================${NC}"
cd backend/shared/resilience
npm install
echo -e "${GREEN}✓ Shared resilience module installed${NC}\n"

echo -e "${BLUE}================================${NC}"
echo -e "${BLUE}Installing API Gateway Dependencies${NC}"
echo -e "${BLUE}================================${NC}"
cd ../../api-gateway
npm install
echo -e "${GREEN}✓ API Gateway dependencies installed${NC}\n"

echo -e "${BLUE}================================${NC}"
echo -e "${BLUE}Installing Auth Service Dependencies${NC}"
echo -e "${BLUE}================================${NC}"
cd ../auth-service
npm install
echo -e "${GREEN}✓ Auth Service dependencies installed${NC}\n"

echo -e "${BLUE}================================${NC}"
echo -e "${BLUE}Checking Other Services${NC}"
echo -e "${BLUE}================================${NC}"

# Install for other services that might need resilience
for service in booking-service ride-service driver-service payment-service; do
  if [ -d "../$service" ]; then
    echo -e "${YELLOW}Installing $service...${NC}"
    cd ../$service
    npm install
    echo -e "${GREEN}✓ $service installed${NC}"
  fi
done

echo -e "\n${GREEN}================================${NC}"
echo -e "${GREEN}✅ All dependencies installed!${NC}"
echo -e "${GREEN}================================${NC}\n"

echo -e "${YELLOW}⚠️  IMPORTANT NEXT STEPS:${NC}"
echo -e "1. Update JWT_SECRET in all .env files with secure values"
echo -e "2. Generate service API keys for service-to-service auth"
echo -e "3. Run: ${BLUE}docker-compose build${NC} to rebuild images"
echo -e "4. Run: ${BLUE}docker-compose up -d${NC} to start services\n"

echo -e "${BLUE}To generate secure secrets, run:${NC}"
echo -e "${YELLOW}node -e \"console.log(require('crypto').randomBytes(64).toString('hex'))\"${NC}\n"
