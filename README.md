# CAB Booking System – Modern Microservices Architecture

A comprehensive, scalable, and real-time taxi booking platform built with a microservices architecture, event-driven design, AI integration, and Zero Trust security principles.

---

## 🚀 **Overview**

This project implements a modern **Cab Booking System** inspired by platforms like Grab/Uber. It is designed for **high scalability, real-time updates, event-driven communication, AI-powered services, and enterprise-grade security** using a Zero Trust model.

The system is **cloud-native**, containerized with Docker, orchestrated with Kubernetes, and ready for deployment on AWS/GCP/Azure.

---

## 📁 **Project Structure**
```
CAB-BOOKING-SYSTEM/
├── backend/ # All microservices
│ ├── api-gateway/ # API Gateway (entry point)
│ ├── auth-service/ # Authentication & authorization
│ ├── booking-service/ # Ride booking logic
│ ├── driver-service/ # Driver management
│ ├── notification-service/ # Push/SMS/Email notifications
│ ├── payment-service/ # Payment processing (Saga pattern)
│ ├── pricing-service/ # Dynamic & surge pricing
│ ├── ride-service/ # Real-time ride tracking
│ ├── review-service/ # Ratings & feedback
│ └── user-service/ # User profile management
├── frontend/ # Frontend applications
│ ├── web-app/ # Customer PWA (React/Next.js)
│ └── packages/ # Shared frontend modules
├── event-bus/ # Kafka/RabbitMQ config & schemas
├── monitoring/ # Grafana, Prometheus, ELK configs
├── docker-compose.yml # Local development setup
├── docker-compose/ # Multi-environment compose files
├── scripts/ # Deployment & utility scripts
├── docs/ # Architecture diagrams & specs
├── lerna.json # Monorepo management
├── Makefile # Common commands
├── package.json # Root dependencies
├── .env.example # Environment variables template
└── README.md # This file
```

---

## 🛠️ **Technology Stack**

| Layer              | Technologies Used |
|--------------------|-------------------|
| **Frontend**       | React.js, Next.js, TypeScript, Tailwind CSS, Socket.IO Client, Mapbox/Google Maps SDK |
| **Backend**        | Node.js, NestJS/Express, TypeScript, REST APIs, gRPC, WebSocket |
| **Event Bus**      | Apache Kafka / RabbitMQ, Schema Registry |
| **Databases**      | PostgreSQL (transactional), MongoDB (NoSQL), Redis (cache & geospatial) |
| **AI/ML**          | Python, FastAPI, TensorFlow/PyTorch, Feast (Feature Store) |
| **Infrastructure** | Docker, Kubernetes, Terraform, AWS/GCP/Azure |
| **Security**       | JWT, OAuth2, mTLS, HashiCorp Vault, WAF, Zero Trust Architecture |
| **Monitoring**     | Prometheus, Grafana, ELK Stack, Jaeger |
| **CI/CD**          | GitHub Actions, GitLab CI, ArgoCD |

---

## ✨ **Key Features**

- **Microservices Architecture** – Decoupled, independently scalable services.
- **Real-time Updates** – Live GPS tracking, driver matching, ETA, notifications via WebSocket.
- **Event-Driven Communication** – Kafka/RabbitMQ for reliable async messaging.
- **AI-Powered Services** – Smart driver matching, surge pricing, ETA prediction.
- **Zero Trust Security** – mTLS, JWT rotation, RBAC/ABAC, API Gateway as PEP.
- **Saga Pattern for Payments** – Reliable distributed transactions with compensation.
- **Cloud-Native Deployment** – Kubernetes, Helm, multi-region support.
- **Observability** – Centralized logs, metrics, tracing, alerting.

---

## 🧩 **Core Services**

| Service | Responsibility |
|---------|----------------|
| **auth-service** | Handles user/driver authentication, JWT issuance, refresh tokens, OAuth2. |
| **booking-service** | Manages ride booking, state transitions, idempotency. |
| **ride-service** | Real-time ride tracking, GPS updates, WebSocket connections. |
| **pricing-service** | Calculates fare, surge pricing, discounts. |
| **payment-service** | Processes payments, handles PSP integration, Saga orchestration. |
| **driver-service** | Driver management, availability, KYC. |
| **ai-matching-service** | AI model for optimal driver-rider matching. |
| **notification-service** | Sends push, SMS, email notifications. |
| **review-service** | Manages ratings and feedback. |
| **api-gateway** | Single entry point, routing, rate limiting, security enforcement. |

---

## 🚦 **Getting Started**

### Prerequisites

- Docker & Docker Compose
- Node.js 18+
- Kubernetes (for production)
- Kafka / RabbitMQ (or use provided docker-compose)

### Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/cab-booking-system.git
   cd cab-booking-system
2. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your config

3. **Start services with Docker Compose**
   ```bash
   docker-compose up -d

4. **Access services**
- API Gateway: http://localhost:3000

- Frontend: http://localhost:3001

- Kafka UI: http://localhost:8080

- PGAdmin: http://localhost:5050

- Grafana: http://localhost:3002

# Running Tests
    ```bash
    # Run tests for a specific service
    cd backend/auth-service
    npm test

    # Run all tests from root
    npm run test:all
---
## 🧪**Testing & Quality**
- Unit tests: Jest

- Integration tests: Supertest

- E2E tests: Cypress (frontend), TestContainers (backend)

- Code coverage: Istanbul

- Linting: ESLint, Prettier
---
## 📊**Monitoring & Logging**
- Metrics: Prometheus + Grafana dashboards

- Logs: ELK Stack (Elasticsearch, Logstash, Kibana)

- Tracing: Jaeger for distributed tracing

- Alerting: Alertmanager integrated with Slack/Email
---
## 🔒**Security Highlights**
Zero Trust Architecture – Verify every request.

- mTLS for service-to-service communication.

- JWT with short expiry + refresh tokens.

- RBAC & ABAC for fine-grained authorization.

- Secrets management with HashiCorp Vault.

- WAF & DDoS protection at API Gateway.

- Audit logging for all critical actions.
---
## 🧠**AI/ML Integration**
- Driver Matching: Combines distance, rating, history, and real-time traffic.

- Surge Pricing: Dynamic pricing based on demand, time, and location.

- ETA Prediction: Machine learning models for accurate arrival time.  

- Feature Store: Centralized feature management for ML models.
---
## 📈**Deployment**
# Kubernetes (Production)
    ```bash
    # Apply Kubernetes manifests
    kubectl apply -f k8s
# Helm Charts
    ```bash
    helm install cab-booking ./charts/cab-booking-system
# Terraform (Infrastructure as Code)
    ```bash
    cd terraform/
    terraform init
    terraform plan
    terraform apply
---
## 📚**Documentation**
Detailed documentation is available in the docs/ folder:

- System Architecture Diagrams

- Sequence Diagrams (Booking, Payment, Matching, etc.)

- API Specifications (OpenAPI 3.0)

- Database Schema (ERD)

- Failure Scenarios & Recovery Strategies

- Cost Estimation & Scaling Guide
---
## 🤝**Contributing**

We welcome contributions! Please see CONTRIBUTING.md for guidelines.

---
## 📄**License**

This project is licensed under the MIT License. See LICENSE for details.

---

## 👥**Authors & Acknowledgement**
- IUH Students – Modern System Architecture Design for Large Demands

- Supervisors & Advisors

- Open Source Community – Thanks to all tools & libraries used.
  
---

## 📬**Contact**

For questions or support, please open an issue or contact the maintainers.


⭐ Star this repo if you find it useful!


