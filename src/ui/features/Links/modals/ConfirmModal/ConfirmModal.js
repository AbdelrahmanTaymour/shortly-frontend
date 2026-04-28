/**
 * ConfirmModal — Generic confirmation dialog.
 */

import BaseComponent from '../../../../base/BaseComponent.js';

export default class ConfirmModal extends BaseComponent {

    // ─── Private DOM event dispatcher ─────────────────────────────────────────

    #dispatchDOMEvent(eventName, detail = {}) {
        this.container?.dispatchEvent(
            new CustomEvent(eventName, {detail, bubbles: true})
        );
    }

    // ─── Rendering ────────────────────────────────────────────────────────────

    render() {
        const {
            title = 'Confirm Action',
            message = 'Are you sure you want to continue? This action cannot be undone.',
            confirmLabel = 'Confirm',
            confirmIcon = 'fa-solid fa-check',
            variant = 'danger',
        } = this.props;

        const variantMap = {
            danger: {
                headerIcon: 'fa-solid fa-triangle-exclamation',
                color: 'var(--error-color)',
                btnClass: 'btn-danger'
            },
            warning: {
                headerIcon: 'fa-solid fa-circle-exclamation',
                color: 'var(--warning-color)',
                btnClass: 'btn-warning'
            },
            info: {headerIcon: 'fa-solid fa-circle-info', color: '#667eea', btnClass: 'btn-primary'},
        };
        const v = variantMap[variant] ?? variantMap.danger;

        return `
            <div class="modal-overlay open" id="confirmModalOverlay"
                role="alertdialog" aria-modal="true"
                aria-labelledby="confirmTitle" aria-describedby="confirmMsg">
                <div class="modal-container confirm-modal-container" role="document">

                    <div class="modal-header">
                        <div class="confirm-modal-title-row">
                            <span class="confirm-modal-icon" style="color: ${v.color};" aria-hidden="true">
                                <i class="${v.headerIcon}"></i>
                            </span>
                            <h2 class="modal-title" id="confirmTitle">${this.escapeHtml(title)}</h2>
                        </div>
                        <button class="modal-close-btn" id="closeBtn" aria-label="Close dialog">
                            <i class="fa-solid fa-xmark" aria-hidden="true"></i>
                        </button>
                    </div>

                    <div class="modal-body">
                        <p class="confirm-modal-message" id="confirmMsg">
                            ${this.escapeHtml(message)}
                        </p>
                    </div>

                    <div class="modal-footer">
                        <button class="btn btn-outline" id="cancelBtn">Cancel</button>
                        <button class="btn ${v.btnClass}" id="confirmBtn">
                            <i class="${confirmIcon}" aria-hidden="true"></i>
                            ${this.escapeHtml(confirmLabel)}
                        </button>
                    </div>

                </div>
            </div>
        `;
    }

    // ─── Event listeners ──────────────────────────────────────────────────────

    setupEventListeners() {
        // Escape key — addCleanupTask() guarantees removal even without explicit close call
        const escapeHandler = (e) => {
            if (e.key === 'Escape') this.#cancel();
        };
        document.addEventListener('keydown', escapeHandler);
        this.addCleanupTask(() => document.removeEventListener('keydown', escapeHandler));

        // Overlay click-outside
        this.attachListener(this.querySelector('#confirmModalOverlay'), 'click', (e) => {
            if (e.target.id === 'confirmModalOverlay') this.#cancel();
        });

        this.attachListener(this.querySelector('#closeBtn'), 'click', () => this.#cancel());
        this.attachListener(this.querySelector('#cancelBtn'), 'click', () => this.#cancel());
        this.attachListener(this.querySelector('#confirmBtn'), 'click', () => this.#confirm());

        // Move focus to confirm button for keyboard users — danger actions are opt-in
        requestAnimationFrame(() => this.querySelector('#confirmBtn')?.focus());
    }

    // ─── Private helpers ──────────────────────────────────────────────────────

    #confirm() {
        // Call the prop callback first (LinksPage uses onConfirm for inline handlers)
        if (typeof this.props.onConfirm === 'function') this.props.onConfirm();
        this.#close('confirm');
    }

    #cancel() {
        if (typeof this.props.onCancel === 'function') this.props.onCancel();
        this.#close('cancel');
    }

    /**
     * Dispatch events BEFORE unmount() — the container is cleared by unmount().
     * @param {'confirm'|'cancel'} eventName
     */
    #close(eventName) {
        this.#dispatchDOMEvent(eventName);
        this.#dispatchDOMEvent('modal:close');
        this.unmount();
    }

    // ─── Public API ───────────────────────────────────────────────────────────

    /** Reconfigure and re-mount with new props (useful for reusing the same instance). */
    async reconfigure(newProps) {
        this.props = {...this.props, ...newProps};
        await this.unmount();
        await this.mount();
    }
}