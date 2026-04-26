/**
 * Button - Reusable button component
 *
 * RESPONSIBILITY:
 * - Render button with variants
 * - Emit click events
 * - Handle disabled state
 * - Support ARIA labels for accessibility
 */

import BaseComponent from '../../../base/BaseComponent.js';

class Button extends BaseComponent {
    constructor(container, props = {}) {
        super(container, props);
        this.isLoading = false;
    }

    /**
     * Render button
     */
    render() {
        const {
            label = 'Button',
            variant = 'primary',
            size = 'md',
            disabled = false,
            icon = null,
            id = '',
            ariaLabel = null
        } = this.props;

        const classNames = [
            'btn',
            `btn-${variant}`,
            `btn-${size}`,
            disabled ? 'btn-disabled' : '',
            this.isLoading ? 'btn-loading' : ''
        ].filter(Boolean).join(' ');

        // Use ariaLabel if provided, otherwise use label text
        const finalAriaLabel = ariaLabel || label;

        return `
            <button 
                id="${id}" 
                class="${classNames}"
                aria-label="${this.escapeHtml(finalAriaLabel)}"
                ${disabled ? 'disabled' : ''}
            >
                ${icon ? `<i class="${icon}" aria-hidden="true"></i>` : ''}
                <span>${this.escapeHtml(label)}</span>
                ${this.isLoading ? '<div class="loading-spinner-inline"></div>' : ''}
            </button>
        `;
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        const button = this.querySelector('button');
        if (button) {
            this.attachListener(button, 'click', (e) => {
                if (!this.props.disabled && !this.isLoading) {
                    this.emit('click', {event: e});
                }
            });
        }
    }

    /**
     * Set loading state
     */
    setLoading(loading) {
        this.isLoading = loading;
        if (this.isMounted) {
            this.mount();
        }
    }
}

export default Button;
