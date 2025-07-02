/**
 * @file auth.js
 * @description Authentication-related API routes.
 */

const express = require('express');
const router = express.Router();
const sudo = require('@expo/sudo-prompt');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

router.get('/sudo-status', async (req, res) => {
    try {
        try {
            await execAsync('sudo -n true', { timeout: 3000 });
            res.json({
                success: true,
                hasSudoAccess: true,
                message: 'Administrator access is available',
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            res.json({
                success: true,
                hasSudoAccess: false,
                message: 'Administrator access required',
                timestamp: new Date().toISOString()
            });
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to check sudo status',
            details: error.message
        });
    }
});

router.post('/sudo-grant', async (req, res) => {
    try {
        const { password, method } = req.body;
        const isElectron = process.env.ELECTRON_RUN_AS_NODE ||
                          process.versions.electron ||
                          req.headers['user-agent']?.includes('Electron');

        if (method === 'native' || (isElectron && !password)) {
            const options = {
                name: 'Installation Up 4evr',
                icns: '/Applications/Utilities/Terminal.app/Contents/Resources/Terminal.icns'
            };
            sudo.exec('true', options, (error) => {
                if (error) {
                    return res.status(401).json({
                        success: false,
                        error: 'Authentication failed',
                        message: error.message.includes('cancelled') ? 'User cancelled request' : 'Invalid credentials',
                        method: 'native'
                    });
                }
                res.json({
                    success: true,
                    message: 'Administrator access granted via native dialog',
                    method: 'native',
                    timestamp: new Date().toISOString()
                });
            });
        } else if (password) {
            try {
                await execAsync(`echo "${password}" | sudo -S true`, { timeout: 5000 });
                res.json({
                    success: true,
                    message: 'Administrator access granted via password',
                    method: 'password',
                    timestamp: new Date().toISOString()
                });
            } catch (error) {
                res.status(401).json({
                    success: false,
                    error: 'Authentication failed',
                    message: 'Invalid administrator password',
                    method: 'password'
                });
            }
        } else {
            res.status(400).json({
                success: false,
                error: 'Authentication method required',
            });
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to process authentication',
            details: error.message
        });
    }
});

module.exports = router;
