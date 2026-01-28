.PHONY: help install dev test build docker-up docker-down docker-logs lint clean db-migrate db-seed monitor health api-test

help:
	@echo "Available commands:"
	@echo "  install     Install dependencies"
	@echo "  dev         Start development server"
	@echo "  test        Run tests"
	@echo "  test-coverage Run tests with coverage"
	@echo "  build       Build for production"
	@echo "  docker-up   Start all services with Docker"
	@echo "  docker-down Stop all Docker services"
	@echo "  docker-logs View service logs"
	@echo "  lint        Run ESLint"
	@echo "  lint-fix    Run ESLint and fix issues"
	@echo "  clean       Remove node_modules and build artifacts"
	@echo "  db-migrate  Run database migrations"
	@echo "  db-seed     Seed database with sample data"
	@echo "  deploy-dev  Deploy development version"
	@echo "  monitor     Show service URLs and status"
	@echo "  health      Check service health"
	@echo "  api-test    Test API endpoints"

install:
	@echo "Installing dependencies..."
	npm ci

dev:
	@echo "Starting development server..."
	npm run dev

test:
	@echo "Running tests..."
	npm test

test-coverage:
	@echo "Running tests with coverage..."
	npm test -- --coverage

build:
	@echo "Building for production..."
	npm run build

docker-up:
	@echo "Starting Docker services..."
	docker-compose up -d --build

docker-down:
	@echo "Stopping Docker services..."
	docker-compose down

docker-logs:
	@echo "Viewing service logs..."
	docker-compose logs -f booking-service

lint:
	@echo "Running ESLint..."
	npm run lint

lint-fix:
	@echo "Running ESLint and fixing issues..."
	npm run lint -- --fix

clean:
	@echo "Cleaning up..."
	rm -rf node_modules coverage dist logs

db-migrate:
	@echo "Running database migrations..."
	node scripts/migrate.js

db-seed:
	@echo "Seeding database..."
	node scripts/seed.js

deploy-dev: test build docker-up

monitor:
	@echo "Service URLs:"
	@echo "  Booking Service: http://localhost:3002"
	@echo "  MongoDB: mongodb://localhost:27017/cab_booking"
	@echo "  Redis: redis://localhost:6379"
	@echo "  RabbitMQ Management: http://localhost:15672 (guest/guest)"
	@echo ""
	@echo "Use 'make health' to check service health"
	@echo "Use 'make docker-logs' to view logs"

health:
	@echo "Checking service health..."
	curl -s http://localhost:3002/health | python3 -m json.tool || echo "Service not responding"

api-test:
	@echo "Testing API endpoints..."
	curl -s http://localhost:3002/api/v1/bookings/health/check | python3 -m json.tool || echo "API not responding"

# Additional commands
setup: install docker-up
	@echo "Setup complete! Services are starting..."
	@echo "Run 'make monitor' to see service URLs"

stop-all:
	@echo "Stopping all services..."
	docker-compose down
	pkill -f "node.*booking-service" || true

reset: stop-all clean
	@echo "Reset complete. Run 'make setup' to start fresh"

logs:
	@echo "Tailing logs..."
	tail -f logs/combined.log

stats:
	@echo "Service statistics:"
	@echo "- Memory usage:"
	ps aux | grep "node.*booking" | grep -v grep | awk '{print $$4 "% memory"}'
	@echo "- Uptime:"
	curl -s http://localhost:3002/health | grep -o '"uptime":[^,]*' | cut -d: -f2 || echo "Service not running"