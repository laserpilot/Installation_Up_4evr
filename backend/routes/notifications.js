/**
 * @file notifications.js
 * @description Notification API routes for Installation Up 4evr.
 */

const express = require('express');
const router = express.Router();

module.exports = (platformManager) => {

    /**
     * @swagger
     * /api/notifications/config:
     *   get:
     *     summary: Get notification configuration
     *     description: Retrieve current notification channel configurations.
     *     responses:
     *       200:
     *         description: Current notification configuration.
     */
    router.get('/config', async (req, res) => {
        try {
            const result = await platformManager.handleAPIRequest('/notifications/config', 'GET');
            res.json(result);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    /**
     * @swagger
     * /api/notifications/config:
     *   post:
     *     summary: Save notification configuration
     *     description: Update notification channel configurations.
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             properties:
     *               config:
     *                 type: object
     *     responses:
     *       200:
     *         description: Configuration saved successfully.
     */
    router.post('/config', async (req, res) => {
        try {
            const result = await platformManager.handleAPIRequest('/notifications/config', 'POST', req.body);
            res.json(result);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    /**
     * @swagger
     * /api/notifications/test/{channel}:
     *   post:
     *     summary: Test notification channel
     *     description: Send a test notification to the specified channel.
     *     parameters:
     *       - in: path
     *         name: channel
     *         required: true
     *         schema:
     *           type: string
     *           enum: [slack, discord, webhook]
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             properties:
     *               config:
     *                 type: object
     *               message:
     *                 type: string
     *     responses:
     *       200:
     *         description: Test notification sent successfully.
     */
    router.post('/test/:channel', async (req, res) => {
        try {
            const { channel } = req.params;
            const result = await platformManager.handleAPIRequest(`/notifications/test/${channel}`, 'POST', req.body);
            res.json(result);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    return router;
};