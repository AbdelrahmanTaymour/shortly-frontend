/**
 * Input - Reusable input component
 *
 * RESPONSIBILITY:
 * - Render input with types and validation
 * - Emit change and focus events
 * - Handle value updates
 */

import BaseComponent from '../../../base/BaseComponent.js';

class Input extends BaseComponent {
    constructor(container, props = {}) {
        super(container, props);
        this.value = props.value || '';
    }

    /**
     * Render input
     */
    render() {
        const {
            type = 'text',
            placeholder = '',
            id = '',
            label = '',
            required = false,
            error = '',
            disabled = false,
            maxLength = null
        } = this.props;

        const classNames = [
            'form-input',
            error ? 'form-input-error' : '',
            disabled ? 'form-input-disabled' : ''
        ].filter(Boolean).join(' ');

        return `
            <div class="form-field">
                ${label ? `<label for="${id}" class="form-label">${this.escapeHtml(label)}${required ? ' <span class="required">*</span>' : ''}</label>` : ''}
                <input
                    id="${id}"
                    type="${type}"
                    class="${classNames}"
                    placeholder="${placeholder}"
                    value="${this.escapeHtml(this.value)}"
                    ${required ? 'required' : ''}
                    ${disabled ? 'disabled' : ''}
                    ${maxLength ? `maxlength="${maxLength}"` : ''}
                />
                ${error ? `<small class="form-error">${this.escapeHtml(error)}</small>` : ''}
            </div>
        `;
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        const input = this.querySelector('input');
        if (input) {
            this.attachListener(input, 'change', (e) => {
                this.value = e.target.value;
                this.emit('change', {value: this.value});
            });

            this.attachListener(input, 'input', (e) => {
                this.value = e.target.value;
                this.emit('input', {value: this.value});
            });

            this.attachListener(input, 'focus', () => {
                this.emit('focus');
            });

            this.attachListener(input, 'blur', () => {
                this.emit('blur');
            });
        }
    }

    /**
     * Get current value
     */
    getValue() {
        return this.value;
    }

    /**
     * Set value
     */
    setValue(value) {
        this.value = value;
        const input = this.querySelector('input');
        if (input) {
            input.value = value;
        }
    }
}

export default Input;
