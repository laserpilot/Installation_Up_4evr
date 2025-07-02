/**
 * @file system.js
 * @description System-related API routes for Installation Up 4evr.
 */

const express = require('express');
const router = express.Router();

module.exports = (platformManager) => {

    /**
     * @swagger
     * /api/system/settings:
     *   get:
     *     summary: Get system settings
     *     description: Retrieve all system settings, with optional filtering.
     *     parameters:
     *       - in: query
     *         name: filter
     *         schema:
     *           type: string
     *           enum: [all, required, optional]
     *         description: Filter settings by type.
     *     responses:
     *       200:
     *         description: A list of system settings.
     */
    router.get('/settings', async (req, res) => {
        try {
            const { filter } = req.query;
            const result = await platformManager.handleAPIRequest('/system/settings', 'GET');
            const settings = result.data || {};

            if (filter === 'required') {
                const requiredSettings = Object.entries(settings)
                    .filter(([key, setting]) => setting.required)
                    .reduce((acc, [key, setting]) => ({ ...acc, [key]: setting }), {});
                res.json({ success: true, data: requiredSettings });
            } else if (filter === 'optional') {
                const optionalSettings = Object.entries(settings)
                    .filter(([key, setting]) => !setting.required)
                    .reduce((acc, [key, setting]) => ({ ...acc, [key]: setting }), {});
                res.json({ success: true, data: optionalSettings });
            } else {
                res.json({ success: true, data: settings });
            }
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    /**
     * @swagger
     * /api/system/settings/status:
     *   get:
     *     summary: Get the status of all system settings
     *     responses:
     *       200:
     *         description: The status of all system settings.
     */
    router.get('/settings/status', async (req, res) => {
        try {
            const result = await platformManager.handleAPIRequest('/system/settings/status', 'GET');
            if (result.success) {
                res.json(result.data);
            } else {
                res.status(500).json({ error: result.error });
            }
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    /**
     * @swagger
     * /api/system/settings/apply:
     *   post:
     *     summary: Apply system settings
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             properties:
     *               settings:
     *                 type: array
     *                 items:
     *                   type: string
     *     responses:
     *       200:
     *         description: The result of the apply operation.
     */
    router.post('/settings/apply', async (req, res) => {
        try {
            const result = await platformManager.handleAPIRequest('/system/settings/apply', 'POST', req.body);
            if (result.success) {
                res.json(result);
            } else {
                res.status(500).json({ error: result.error });
            }
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    /**
     * @swagger
     * /api/system/sip-status:
     *   get:
     *     summary: Get SIP status
     *     responses:
     *       200:
     *         description: The SIP status.
     */
    router.get('/sip-status', async (req, res) => {
        try {
            const result = await platformManager.handleAPIRequest('/system/sip-status', 'GET');
            res.json(result.data);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    return router;
};
