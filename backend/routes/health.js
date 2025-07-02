/**
 * @file health.js
 * @description Health check API routes.
 */

const express = require('express');
const router = express.Router();

module.exports = (platformManager) => {
    router.get('/', async (req, res) => {
        try {
            const result = await platformManager.handleAPIRequest('/health', 'GET');
            res.json(result);
        } catch (error) {
            res.status(500).json({ 
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    });

    router.get('/score', async (req, res) => {
        try {
            const result = await platformManager.handleAPIRequest('/health/score', 'GET');
            res.json(result);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    return router;
};
