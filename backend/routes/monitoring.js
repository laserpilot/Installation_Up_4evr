/**
 * @file monitoring.js
 * @description Monitoring-related API routes for Installation Up 4evr.
 */

const express = require('express');
const router = express.Router();

module.exports = (platformManager) => {

    /**
     * @swagger
     * /api/monitoring/status:
     *   get:
     *     summary: Get monitoring status
     *     responses:
     *       200:
     *         description: The monitoring status.
     */
    router.get('/status', async (req, res) => {
        try {
            const result = await platformManager.handleAPIRequest('/monitoring/status', 'GET');
            res.json(result.success ? result.data : { error: result.error });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    /**
     * @swagger
     * /api/monitoring/applications:
     *   get:
     *     summary: Get monitored applications
     *     responses:
     *       200:
     *         description: A list of monitored applications.
     */
    router.get('/applications', async (req, res) => {
        try {
            const result = await platformManager.handleAPIRequest('/monitoring/applications', 'GET');
            if (result.success) {
                res.json(result.data || []);
            } else {
                res.status(500).json({ error: result.error || 'Failed to get applications data' });
            }
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    /**
     * @swagger
     * /api/monitoring/app-health:
     *   get:
     *     summary: Get application health
     *     responses:
     *       200:
     *         description: The application health.
     */
    router.get('/app-health', async (req, res) => {
        try {
            const result = await platformManager.handleAPIRequest('/monitoring/app-health', 'GET');
            res.json(result.data);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    /**
     * @swagger
     * /api/monitoring/config:
     *   get:
     *     summary: Get monitoring configuration
     *     responses:
     *       200:
     *         description: The monitoring configuration.
     */
    router.get('/config', async (req, res) => {
        try {
            const result = await platformManager.handleAPIRequest('/monitoring/config', 'GET');
            res.json(result.success ? result.data : { error: result.error });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    /**
     * @swagger
     * /api/monitoring/config:
     *   post:
     *     summary: Save monitoring configuration
     *     responses:
     *       200:
     *         description: Configuration saved successfully.
     */
    router.post('/config', async (req, res) => {
        try {
            const result = await platformManager.handleAPIRequest('/monitoring/config', 'POST', req.body);
            res.json(result.success ? result.data : { error: result.error });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    /**
     * @swagger
     * /api/monitoring/config/reset:
     *   post:
     *     summary: Reset monitoring configuration to defaults
     *     responses:
     *       200:
     *         description: Configuration reset successfully.
     */
    router.post('/config/reset', async (req, res) => {
        try {
            const result = await platformManager.handleAPIRequest('/monitoring/config/reset', 'POST');
            res.json(result.success ? result.data : { error: result.error });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    /**
     * @swagger
     * /api/monitoring/config/apply:
     *   post:
     *     summary: Apply monitoring configuration changes
     *     responses:
     *       200:
     *         description: Configuration applied successfully.
     */
    router.post('/config/apply', async (req, res) => {
        try {
            const result = await platformManager.handleAPIRequest('/monitoring/config/apply', 'POST', req.body);
            res.json(result.success ? result.data : { error: result.error });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    return router;
};
