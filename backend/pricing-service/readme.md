# Pricing Service - CAB Booking System

Microservice xử lý tính toán giá cước cho hệ thống đặt xe taxi.

## 🚀 Tính năng

- Tính toán giá cước dựa trên khoảng cách và loại xe
- Hỗ trợ surge pricing theo khu vực
- Caching với Redis để tăng hiệu năng
- RESTful API với validation
- Health check endpoint
- Rate limiting
- Docker support

## 🛠 Công nghệ

- Node.js 18 + Express
- Redis (cache và surge multipliers)
- Docker + Docker Compose
- Winston (logging)

## 📡 API Endpoints

### `POST /pricing/calculate`
Tính toán giá cước

**Request:**
```json
{
  "distance": 10.5,
  "vehicleType": "SEDAN",
  "zoneId": "district-1",
  "useCache": true
}