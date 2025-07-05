#!/usr/bin/env node

/**
 * Debug script to test frontend tab navigation
 * This simulates the browser environment to check if the issue is server-side
 */

const { JSDOM } = require('jsdom');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

async function testFrontendNavigation() {
    console.log('[DEBUG] Testing frontend tab navigation...');
    
    try {
        // Fetch the HTML from localhost:3001
        console.log('[DEBUG] Fetching HTML from localhost:3001...');
        const response = await fetch('http://localhost:3001/');
        const html = await response.text();
        
        // Create JSDOM environment
        const dom = new JSDOM(html, {
            runScripts: "dangerously",
            resources: "usable",
            url: "http://localhost:3001"
        });
        
        const { window } = dom;
        global.window = window;
        global.document = window.document;
        global.navigator = window.navigator;
        
        // Check if sidebar buttons exist
        const sidebarButtons = window.document.querySelectorAll('.sidebar-button');
        console.log(`[DEBUG] Found ${sidebarButtons.length} sidebar buttons`);
        
        sidebarButtons.forEach((button, index) => {
            const dataTab = button.getAttribute('data-tab');
            console.log(`[DEBUG] Button ${index + 1}: data-tab="${dataTab}"`);
        });
        
        // Check if tab content panes exist
        const tabPanes = window.document.querySelectorAll('.tab-pane');
        console.log(`[DEBUG] Found ${tabPanes.length} tab panes`);
        
        tabPanes.forEach((pane, index) => {
            console.log(`[DEBUG] Tab pane ${index + 1}: id="${pane.id}"`);
        });
        
        // Simulate clicking a button
        const systemPrefsButton = window.document.querySelector('.sidebar-button[data-tab="system-prefs"]');
        if (systemPrefsButton) {
            console.log('[DEBUG] Found system-prefs button, simulating click...');
            
            // Check if click event listeners are attached
            const hasClickListener = systemPrefsButton._events && systemPrefsButton._events.click;
            console.log(`[DEBUG] Button has click listener: ${hasClickListener ? 'Yes' : 'No'}`);
            
            // Try manual click simulation
            const clickEvent = new window.Event('click', { bubbles: true });
            systemPrefsButton.dispatchEvent(clickEvent);
            
            console.log('[DEBUG] Click event dispatched');
        } else {
            console.log('[DEBUG] ❌ system-prefs button not found');
        }
        
        // Wait a moment then check if app was created
        setTimeout(() => {
            if (window.app) {
                console.log('[DEBUG] ✅ window.app created successfully');
                console.log(`[DEBUG] App type: ${typeof window.app}`);
                console.log(`[DEBUG] App has navigateToTab: ${typeof window.app.navigateToTab}`);
            } else {
                console.log('[DEBUG] ❌ window.app not created');
            }
            
            // Try calling navigateToTab directly
            if (window.navigateToTab) {
                console.log('[DEBUG] ✅ Global navigateToTab function exists');
                try {
                    window.navigateToTab('system-prefs');
                    console.log('[DEBUG] ✅ navigateToTab called successfully');
                } catch (error) {
                    console.log(`[DEBUG] ❌ navigateToTab error: ${error.message}`);
                }
            } else {
                console.log('[DEBUG] ❌ Global navigateToTab function not found');
            }
        }, 500);
        
    } catch (error) {
        console.error('[DEBUG] Error:', error.message);
    }
}

// Run the test
testFrontendNavigation();