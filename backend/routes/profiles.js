/**
 * @file profiles.js
 * @description Profiles API routes.
 */

const express = require('express');
const router = express.Router();
const ConfigurationProfiles = require('../src/core/config-profiles.js');

// Initialize profiles instance - we'll need to pass a config manager
let profiles;

router.get('/', async (req, res) => {
  try {
    if (!profiles) {
      return res.status(500).json({ error: 'Profiles not initialized' });
    }
    const profilesList = await profiles.listProfiles();
    res.json(profilesList);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/save', async (req, res) => {
  try {
    if (!profiles) {
      return res.status(500).json({ error: 'Profiles not initialized' });
    }
    const { name, description, settings } = req.body;
    const result = await profiles.saveProfile(name, description, settings);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/load', async (req, res) => {
  try {
    if (!profiles) {
      return res.status(500).json({ error: 'Profiles not initialized' });
    }
    const { profileId } = req.body;
    const result = await profiles.loadProfile(profileId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Initialize function to be called from server
router.init = (configManager) => {
  profiles = new ConfigurationProfiles(configManager);
  return profiles.initialize();
};

module.exports = router;
