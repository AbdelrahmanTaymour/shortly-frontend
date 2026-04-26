/**
 * Toast - Notification component
 */

import './Toast.css';
import BaseComponent from '../../../base/BaseComponent.js';

class Toast extends BaseComponent {
    constructor(container, props = {}) {
        super(container, props);
        this.autoHideTimer = null;
    }

    render() {
        const {message = '', type = 'info', duration = 3000} = this.props;

        const icons = {
            success: 'fa-check-circle',
            error: 'fa-exclamation-circle',
            info: 'fa-info-circle',
            warning: 'fa-exclamation-triangle'
        };
        const icon = icons[type] || icons.info;

        return `
            <div class="toast toast-${type}">
                <div class="toast-content">
                    <i class="fa-solid ${icon} toast-type-icon"></i>
                    <span class="toast-message">${message}</span>
                </div>
                <button class="toast-close" type="button" aria-label="Close">
                    <i class="fa-solid fa-xmark"></i>
                </button>
            </div>
        `;
    }

    async mount() {
        await super.mount();
        this.setupEventListeners();

        // Auto hide
        const duration = this.props.duration || 3000;
        if (duration > 0) {
            this.autoHideTimer = setTimeout(() => {
                this.unmount();
            }, duration);
        }
    }

    setupEventListeners() {
        const closeBtn = this.querySelector('.toast-close');
        if (closeBtn) {
            this.attachListener(closeBtn, 'click', () => this.unmount());
        }
    }

    destroy() {
        if (this.autoHideTimer) {
            clearTimeout(this.autoHideTimer);
        }
        super.destroy();
    }
}

export default Toast;
