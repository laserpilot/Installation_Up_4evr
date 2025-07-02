/**
 * @file profiles.js
 * @description Profiles API routes.
 */

const express = require('express');
const router = express.Router();
const profiles = require('../legacy/profiles.js'); // Assuming legacy profiles are still used

router.get('/', async (req, res) => {
    try {
        const profilesList = await profiles.listProfiles();
        res.json(profilesList);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/save', async (req, res) => {
    try {
        const { name, description, settings } = req.body;
        const result = await profiles.saveProfile(name, description, settings);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/load', async (req, res) => {
    try {
        const { profileId } = req.body;
        const result = await profiles.loadProfile(profileId);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
