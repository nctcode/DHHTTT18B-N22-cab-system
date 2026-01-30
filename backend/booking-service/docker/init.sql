-- docker/init.sql
-- This file is for MySQL/PostgreSQL initialization
-- Since we're using MongoDB, this file can be empty or contain setup for other services

-- For future use if adding SQL-based services
CREATE DATABASE IF NOT EXISTS cab_booking_analytics;
USE cab_booking_analytics;

-- Analytics tables could be added here
CREATE TABLE IF NOT EXISTS booking_analytics (
    id INT AUTO_INCREMENT PRIMARY KEY,
    booking_id VARCHAR(50) UNIQUE,
    passenger_id VARCHAR(50),
    driver_id VARCHAR(50),
    pickup_location VARCHAR(255),
    destination_location VARCHAR(255),
    distance_km DECIMAL(10,2),
    duration_min INT,
    fare_amount DECIMAL(10,2),
    vehicle_type VARCHAR(50),
    status VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_passenger (passenger_id),
    INDEX idx_driver (driver_id),
    INDEX idx_created_at (created_at),
    INDEX idx_status (status)
);

-- For reporting and BI purposes
CREATE TABLE IF NOT EXISTS daily_summary (
    date DATE PRIMARY KEY,
    total_bookings INT DEFAULT 0,
    completed_bookings INT DEFAULT 0,
    cancelled_bookings INT DEFAULT 0,
    total_revenue DECIMAL(15,2) DEFAULT 0,
    avg_distance DECIMAL(10,2) DEFAULT 0,
    avg_duration DECIMAL(10,2) DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Driver performance
CREATE TABLE IF NOT EXISTS driver_performance (
    driver_id VARCHAR(50) PRIMARY KEY,
    total_trips INT DEFAULT 0,
    total_earnings DECIMAL(15,2) DEFAULT 0,
    avg_rating DECIMAL(3,2) DEFAULT 0,
    last_active TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);