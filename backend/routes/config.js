/**
 * @file config.js
 * @description Configuration API routes.
 */

const express = require('express');
const router = express.Router();

module.exports = (platformManager) => {
    router.get('/', async (req, res) => {
        try {
            const config = await platformManager.handleAPIRequest("/config", "GET");
            res.json(config);
        } catch (error) {
            res.status(500).json({ 
                error: error.message,
                note: 'Configuration management requires platform manager mode'
            });
        }
    });

    router.put('/', async (req, res) => {
        try {
            const { path, value } = req.body;
            const result = await platformManager.handleAPIRequest("/config", "PUT")(path, value);
            res.json(result);
        } catch (error) {
            res.status(500).json({ 
                error: error.message,
                note: 'Configuration management requires platform manager mode'
            });
        }
    });

    router.get('/user-preferences', async (req, res) => {
        try {
            const config = platformManager.getConfig();
            const preferences = config.get('userPreferences') || {};
            res.json({ success: true, data: preferences });
        } catch (error) {
            res.status(500).json({ 
                success: false,
                error: error.message 
            });
        }
    });

    router.post('/user-preferences', async (req, res) => {
        try {
            const config = platformManager.getConfig();
            const currentPrefs = config.get('userPreferences') || {};
            const updatedPrefs = { ...currentPrefs, ...req.body };
            
            await config.update('userPreferences', updatedPrefs);
            res.json({ 
                success: true, 
                message: 'User preferences updated',
                data: updatedPrefs
            });
        } catch (error) {
            res.status(500).json({ 
                success: false,
                error: error.message 
            });
        }
    });

    router.post('/', async (req, res) => {
        try {
            const result = await platformManager.handleAPIRequest("/config", "POST", req.body);
            res.json(result);
        } catch (error) {
            res.status(500).json({ 
                error: error.message,
                note: 'Configuration management requires platform manager mode'
            });
        }
    });

    router.post('/apply', async (req, res) => {
        try {
            const result = await platformManager.handleAPIRequest("/config/apply", "POST", req.body);
            res.json(result);
        } catch (error) {
            res.status(500).json({ 
                error: error.message,
                note: 'Configuration management requires platform manager mode'
            });
        }
    });

    return router;
};
