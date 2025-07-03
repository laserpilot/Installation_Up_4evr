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

    // Master Configuration Management
    router.get('/master', async (req, res) => {
        try {
            const config = platformManager.getConfig();
            const masterProfile = await config.getMasterProfile();
            res.json({ 
                success: true, 
                data: masterProfile,
                message: 'Master profile retrieved successfully'
            });
        } catch (error) {
            res.status(500).json({ 
                success: false,
                error: error.message 
            });
        }
    });

    router.post('/master', async (req, res) => {
        try {
            const { name, description, ...options } = req.body;
            const config = platformManager.getConfig();
            const masterProfile = await config.createMasterProfile(name, description, options);
            res.json({ 
                success: true, 
                data: masterProfile,
                message: 'Master profile created successfully'
            });
        } catch (error) {
            res.status(500).json({ 
                success: false,
                error: error.message 
            });
        }
    });

    router.put('/master', async (req, res) => {
        try {
            const config = platformManager.getConfig();
            const updatedProfile = await config.updateMasterProfile(req.body);
            res.json({ 
                success: true, 
                data: updatedProfile,
                message: 'Master profile updated successfully'
            });
        } catch (error) {
            res.status(500).json({ 
                success: false,
                error: error.message 
            });
        }
    });

    // Master Profile Export/Import
    router.get('/master/export', async (req, res) => {
        try {
            const config = platformManager.getConfig();
            const exportPath = await config.exportMasterProfile();
            res.json({ 
                success: true, 
                data: { exportPath },
                message: 'Master profile exported successfully'
            });
        } catch (error) {
            res.status(500).json({ 
                success: false,
                error: error.message 
            });
        }
    });

    router.post('/master/import', async (req, res) => {
        try {
            const { filePath } = req.body;
            const config = platformManager.getConfig();
            const importedProfile = await config.importMasterProfile(filePath);
            res.json({ 
                success: true, 
                data: importedProfile,
                message: 'Master profile imported successfully'
            });
        } catch (error) {
            res.status(500).json({ 
                success: false,
                error: error.message 
            });
        }
    });

    // System Preferences State Management
    router.get('/system-preferences/state', async (req, res) => {
        try {
            const config = platformManager.getConfig();
            const state = config.getSystemPreferencesState();
            res.json({ 
                success: true, 
                data: state,
                message: 'System preferences state retrieved successfully'
            });
        } catch (error) {
            res.status(500).json({ 
                success: false,
                error: error.message 
            });
        }
    });

    router.post('/system-preferences/state', async (req, res) => {
        try {
            const { applied, currentState } = req.body;
            const config = platformManager.getConfig();
            await config.updateSystemPreferencesState(applied, currentState);
            res.json({ 
                success: true, 
                message: 'System preferences state updated successfully'
            });
        } catch (error) {
            res.status(500).json({ 
                success: false,
                error: error.message 
            });
        }
    });

    // Launch Agents Management
    router.get('/launch-agents', async (req, res) => {
        try {
            const config = platformManager.getConfig();
            const agents = config.getLaunchAgents();
            const webApps = config.getWebApps();
            res.json({ 
                success: true, 
                data: { agents, webApps },
                message: 'Launch agents retrieved successfully'
            });
        } catch (error) {
            res.status(500).json({ 
                success: false,
                error: error.message 
            });
        }
    });

    router.post('/launch-agents', async (req, res) => {
        try {
            const config = platformManager.getConfig();
            await config.addLaunchAgent(req.body);
            res.json({ 
                success: true, 
                message: 'Launch agent added successfully'
            });
        } catch (error) {
            res.status(500).json({ 
                success: false,
                error: error.message 
            });
        }
    });

    router.delete('/launch-agents/:id', async (req, res) => {
        try {
            const config = platformManager.getConfig();
            await config.removeLaunchAgent(req.params.id);
            res.json({ 
                success: true, 
                message: 'Launch agent removed successfully'
            });
        } catch (error) {
            res.status(500).json({ 
                success: false,
                error: error.message 
            });
        }
    });

    router.post('/web-apps', async (req, res) => {
        try {
            const config = platformManager.getConfig();
            await config.addWebApp(req.body);
            res.json({ 
                success: true, 
                message: 'Web app added successfully'
            });
        } catch (error) {
            res.status(500).json({ 
                success: false,
                error: error.message 
            });
        }
    });

    return router;
};
