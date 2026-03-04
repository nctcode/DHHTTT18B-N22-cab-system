const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8000;

// Middleware
app.use(express.json());
app.use(cors());
app.use(helmet());
app.use(morgan('dev'));

// Routes
app.get('/', (req, res) => {
  res.json({
    status: 'success',
    message: 'AI Service (Node.js) is running',
    version: '1.0.0'
  });
});

/**
 * POST /api/match
 * AI Matching Algorithm (Mocked)
 */
app.post('/api/match', (req, res) => {
    try {
        const { drivers, pickup } = req.body;

        if (!drivers || !Array.isArray(drivers) || drivers.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No drivers provided'
            });
        }

        if (!pickup || !pickup.lat || !pickup.lng) {
            return res.status(400).json({
                success: false,
                message: 'Pickup location required'
            });
        }

        // Simple scoring logic: 
        // Score = (Rating * 2) - (Distance * 1000)
        let bestDriver = null;
        let bestScore = -Infinity;

        drivers.forEach(driver => {
            const distanceApprox = Math.abs(driver.lat - pickup.lat) + Math.abs(driver.lng - pickup.lng);
            const rating = driver.rating || 4.5; // Default rating
            
            const score = (rating * 2) - (distanceApprox * 1000);
            
            if (score > bestScore) {
                bestScore = score;
                bestDriver = driver;
            }
        });

        if (bestDriver) {
            return res.json({
                success: true,
                driverId: bestDriver.id,
                score: bestScore
            });
        } else {
            return res.json({
                success: true,
                driverId: drivers[0].id,
                score: 0
            });
        }
    } catch (error) {
        console.error('Match error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

/**
 * POST /api/predict-price
 * AI Surge Pricing Model
 */
app.post('/api/predict-price', (req, res) => {
    try {
        const { distance_km, time_min } = req.body;
        
        const dist = parseFloat(distance_km) || 0;
        const time = parseFloat(time_min) || 0;

        const basePrice = 10000 + (dist * 5000) + (time * 2000);
        
        // Random surge logic
        let surge = 1.0;
        if (Math.random() > 0.7) {
            surge = 1.2 + (Math.random() * 0.5); // 1.2x - 1.7x
        }

        const finalPrice = basePrice * surge;

        res.json({
            success: true,
            price: Math.round(finalPrice / 1000) * 1000,
            surge_multiplier: parseFloat(surge.toFixed(2))
        });
    } catch (error) {
        console.error('Pricing error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`🤖 AI Service running on port ${PORT}`);
});
