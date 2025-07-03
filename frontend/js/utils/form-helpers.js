/**
 * @file form-helpers.js
 * @description Shared form utility functions to prevent duplication across modules
 */

/**
 * Set the value of an input element
 * @param {string} id - Element ID
 * @param {string|number} value - Value to set
 */
export function setValue(id, value) {
    const element = document.getElementById(id);
    if (element) {
        element.value = value;
    }
}

/**
 * Get the value of an input element
 * @param {string} id - Element ID
 * @returns {string} Element value or empty string
 */
export function getValue(id) {
    const element = document.getElementById(id);
    return element ? element.value : '';
}

/**
 * Set the checked state of a checkbox
 * @param {string} id - Element ID
 * @param {boolean} checked - Checked state
 */
export function setCheckbox(id, checked) {
    const element = document.getElementById(id);
    if (element) {
        element.checked = checked;
    }
}

/**
 * Get the checked state of a checkbox
 * @param {string} id - Element ID
 * @returns {boolean} Checked state
 */
export function getCheckbox(id) {
    const element = document.getElementById(id);
    return element ? element.checked : false;
}

/**
 * Setup standard action buttons (Load/Save/Reset/Apply pattern)
 * @param {Object} config - Button configuration
 * @param {string} config.prefix - ID prefix for buttons (e.g., 'monitoring-config')
 * @param {Function} config.load - Load function
 * @param {Function} config.save - Save function
 * @param {Function} config.reset - Reset function
 * @param {Function} config.apply - Apply function
 */
export function setupStandardActionButtons(config) {
    const { prefix, load, save, reset, apply } = config;
    
    const loadBtn = document.getElementById(`load-${prefix}`);
    const saveBtn = document.getElementById(`save-${prefix}`);
    const resetBtn = document.getElementById(`reset-${prefix}`);
    const applyBtn = document.getElementById(`apply-${prefix}`);
    
    if (loadBtn && load) {
        loadBtn.addEventListener('click', load);
    }
    if (saveBtn && save) {
        saveBtn.addEventListener('click', save);
    }
    if (resetBtn && reset) {
        resetBtn.addEventListener('click', reset);
    }
    if (applyBtn && apply) {
        applyBtn.addEventListener('click', apply);
    }
}

/**
 * Synchronize a range slider with a number input
 * @param {string} sliderId - Slider element ID
 * @param {string} inputId - Input element ID
 */
export function synchronizeSliderInput(sliderId, inputId) {
    const slider = document.getElementById(sliderId);
    const input = document.getElementById(inputId);
    
    if (slider && input) {
        slider.addEventListener('input', (e) => {
            input.value = e.target.value;
        });
        
        input.addEventListener('input', (e) => {
            slider.value = e.target.value;
        });
    }
}