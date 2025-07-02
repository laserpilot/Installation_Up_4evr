/**
 * @file ui.js
 * @description UI helper functions for Installation Up 4evr.
 */

export function showToast(message, type = 'info') {
    const toastContainer = document.getElementById('toast-container');
    if (!toastContainer) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;

    toastContainer.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, 5000);
}

export function showLoading(message = 'Loading...') {
    const loadingOverlay = document.getElementById('loading-overlay');
    const loadingMessage = document.getElementById('loading-message');
    if (loadingOverlay) {
        if (loadingMessage) {
            loadingMessage.textContent = message;
        }
        loadingOverlay.style.display = 'flex';
    }
}

export function hideLoading() {
    const loadingOverlay = document.getElementById('loading-overlay');
    if (loadingOverlay) {
        loadingOverlay.style.display = 'none';
    }
}

export function updateStatus(elementId, status, text) {
    const element = document.getElementById(elementId);
    if (!element) {
        console.warn(`[STATUS] Element ${elementId} not found`);
        return;
    }
    element.className = `status-indicator ${status}`;
    element.innerHTML = `<i class="fas fa-circle"></i> ${text}`;
    console.log(`[STATUS] Updated ${elementId}: ${status} - ${text}`);
}

export function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
