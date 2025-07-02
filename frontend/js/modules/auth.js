/**
 * @file auth.js
 * @description Authentication and session management for Installation Up 4evr.
 */

import { apiCall } from '../utils/api.js';
import { showToast } from '../utils/ui.js';

/**
 * Handles persistent authentication sessions with timeout
 */
export class AuthSessionManager {
    constructor() {
        this.storageKey = 'up4evr_auth_session';
        this.defaultTimeout = 45 * 60 * 1000; // 45 minutes
        this.warningTime = 5 * 60 * 1000; // 5 minutes before expiration
        this.warningShown = false;
    }

    isSessionValid() {
        try {
            const session = JSON.parse(localStorage.getItem(this.storageKey) || '{}');
            if (!session.expires) return false;
            
            const now = Date.now();
            const isValid = now < session.expires;
            
            if (isValid && !this.warningShown && (session.expires - now) < this.warningTime) {
                this.showExpirationWarning(session.expires);
            }
            
            return isValid;
        } catch (error) {
            console.error('[SESSION] Error checking session validity:', error);
            return false;
        }
    }

    createSession(method = 'unknown', customTimeout = null) {
        const now = Date.now();
        const timeout = customTimeout || this.defaultTimeout;
        const expires = now + timeout;
        
        const session = {
            created: now,
            expires: expires,
            method: method,
            timestamp: new Date(now).toISOString(),
            expiresAt: new Date(expires).toISOString()
        };
        
        localStorage.setItem(this.storageKey, JSON.stringify(session));
        this.warningShown = false;
        
        console.log(`[SESSION] Created session (${method}) expires at ${session.expiresAt}`);
        return session;
    }

    getSession() {
        try {
            return JSON.parse(localStorage.getItem(this.storageKey) || '{}');
        } catch (error) {
            return {};
        }
    }

    clearSession() {
        localStorage.removeItem(this.storageKey);
        this.warningShown = false;
        console.log('[SESSION] Session cleared');
    }

    getTimeRemaining() {
        const session = this.getSession();
        if (!session.expires) return 0;
        
        const remaining = session.expires - Date.now();
        return Math.max(0, Math.ceil(remaining / (60 * 1000)));
    }

    showExpirationWarning(expiresAt) {
        this.warningShown = true;
        const remainingMinutes = Math.ceil((expiresAt - Date.now()) / (60 * 1000));
        
        console.warn(`[SESSION] Authentication expires in ${remainingMinutes} minutes`);
        showToast(`Authentication expires in ${remainingMinutes} minutes`, 'warning');
    }

    extendSession(additionalMinutes = 45) {
        const session = this.getSession();
        if (!session.expires) return false;
        
        const newExpires = Date.now() + (additionalMinutes * 60 * 1000);
        session.expires = newExpires;
        session.expiresAt = new Date(newExpires).toISOString();
        
        localStorage.setItem(this.storageKey, JSON.stringify(session));
        this.warningShown = false;
        
        console.log(`[SESSION] Extended session to ${session.expiresAt}`);
        return true;
    }
}

export async function requireAuthentication(authSession) {
    console.log('[AUTH] Requiring authentication...');
    
    if (authSession.isSessionValid()) {
        const remaining = authSession.getTimeRemaining();
        console.log(`[AUTH] Using cached authentication (${remaining} minutes remaining)`);
        showToast(`Using cached authentication (${remaining}m remaining)`, 'info');
        return Promise.resolve();
    }
    
    console.log('[AUTH] No valid session, showing authentication dialog');
    
    // This part needs to be refactored to handle the UI interaction for authentication
    // For now, we'll just reject the promise
    return Promise.reject(new Error('Authentication required'));
}
