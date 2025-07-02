/**
 * @file validation.js
 * @description Validation workflow API route.
 */

const express = require('express');
const router = express.Router();

module.exports = (platformManager) => {
    router.post('/test', async (req, res) => {
        try {
            const result = await platformManager.handleAPIRequest('/validation/run', 'POST', req.body);
            res.json(result);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    return router;
};
