// Debug script to test the packaged app
const { execSync } = require('child_process');
const path = require('path');

const appPath = '/Users/laser/Dropbox/Articles/Article_Gits/Installation_Up_4evr/dist/mac/Installation Up 4evr.app/Contents/MacOS/Installation Up 4evr';

console.log('Starting debug of packaged app...');

// Run the app and capture output
try {
    const result = execSync(`"${appPath}"`, { 
        encoding: 'utf8', 
        timeout: 10000,
        stdio: 'pipe'
    });
    console.log('App output:', result);
} catch (error) {
    console.log('App stderr:', error.stderr);
    console.log('App stdout:', error.stdout);
    console.log('Error:', error.message);
}