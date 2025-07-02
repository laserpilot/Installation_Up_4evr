/**
 * @file ConfigSection.js
 * @description A reusable component for configuration sections with Load/Save/Reset/Apply buttons.
 */

export class ConfigSection {
    constructor(id, { load, save, reset, apply }) {
        this.id = id;
        this.load = load;
        this.save = save;
        this.reset = reset;
        this.apply = apply;

        this.container = document.getElementById(id);
        if (!this.container) {
            console.error(`ConfigSection: container with id ${id} not found.`);
            return;
        }

        this.init();
    }

    init() {
        this.container.querySelector('.load-config')?.addEventListener('click', () => this.load());
        this.container.querySelector('.save-config')?.addEventListener('click', () => this.save());
        this.container.querySelector('.reset-config')?.addEventListener('click', () => this.reset());
        this.container.querySelector('.apply-config')?.addEventListener('click', () => this.apply());
    }
}
