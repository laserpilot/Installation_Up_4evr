/**
 * @file platform.js
 * @description Platform information API route.
 */

const express = require('express');
const router = express.Router();

module.exports = (platformManager) => {
    router.get('/', async (req, res) => {
        try {
            const result = await platformManager.handleAPIRequest('/platform', 'GET');
            const platformInfo = result.data;
            res.json(platformInfo);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    return router;
};
