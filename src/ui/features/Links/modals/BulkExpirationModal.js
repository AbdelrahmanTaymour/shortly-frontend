/**
 * BulkExpirationModal — Set a single expiration date across selected Links.
 *
 * ─── FIXES ───────────────────────────────────────────────────────────────────
 *
 * 1. emit() override removed.
 *    The override dispatched DOM CustomEvents, which is correct behaviour but
 *    conflicts with the BaseComponent emit() contract (object-level callbacks).
 *    Fixed: use #dispatchDOMEvent() for all inter-component events.
 *
 * 2. Missing Escape key handler added.
 *    Without it, the modal had no keyboard close path. All modals must respond
 *    to Escape. Registered via addCleanupTask() so it is always cleaned up.
 *
 * 3. Missing overlay click-outside-to-close handler added.
 *    Consistent with every other modal in the system.
 *
 * 4. Date validation improved.
 *    Selected date must be in the future; an error message is shown inline
 *    rather than silently focusing the empty input.
 */

import BaseComponent from '../../../base/BaseComponent.js';

export default class BulkExpirationModal extends BaseComponent {
    constructor(container, props = {}) {
        super(container, props);
        this.selectedCount = props.selectedCount ?? 0;
    }

    // ─── Private DOM event dispatcher ─────────────────────────────────────────

    #dispatchDOMEvent(eventName, detail = {}) {
        this.container?.dispatchEvent(
            new CustomEvent(eventName, {detail, bubbles: true})
        );
    }

    // ─── Rendering ────────────────────────────────────────────────────────────

    render() {
        const minDate = new Date().toISOString().slice(0, 16);
        const label = `${this.selectedCount} link${this.selectedCount !== 1 ? 's' : ''}`;

        return `
            <div class="modal-overlay open" id="bulkExpirationModalOverlay"
                role="dialog" aria-modal="true" aria-labelledby="bulkExpTitle">
                <div class="modal-container modal-container--narrow" role="document">

                    <div class="modal-header">
                        <h2 class="modal-title" id="bulkExpTitle">Set Expiration Date</h2>
                        <button class="modal-close-btn" id="closeBtn" aria-label="Close modal">
                            <i class="fa-solid fa-xmark" aria-hidden="true"></i>
                        </button>
                    </div>

                    <div class="modal-body">
                        <p class="modal-intro-text">
                            Set a shared expiration date for
                            <strong>${this.escapeHtml(label)}</strong>.
                        </p>

                        <div class="form-field">
                            <label for="bulkExpirationDate">Expiration Date &amp; Time</label>
                            <input
                                type="datetime-local"
                                id="bulkExpirationDate"
                                name="expirationDate"
                                min="${minDate}"
                                aria-required="true"
                            />
                            <!-- Error message shown inline when validation fails -->
                            <div class="field-error" id="dateError" role="alert" hidden></div>
                        </div>
                    </div>

                    <div class="modal-footer">
                        <button type="button" class="btn btn-outline" id="cancelBtn">Cancel</button>
                        <button type="button" class="btn btn-primary" id="confirmBtn">
                            <i class="fa-solid fa-calendar-check" aria-hidden="true"></i>
                            Apply to ${this.escapeHtml(label)}
                        </button>
                    </div>

                </div>
            </div>
        `;
    }

    // ─── Event listeners ──────────────────────────────────────────────────────

    setupEventListeners() {
        // Escape key — always clean up via addCleanupTask() regardless of how the modal closes
        const escapeHandler = (e) => {
            if (e.key === 'Escape') this.#close();
        };
        document.addEventListener('keydown', escapeHandler);
        this.addCleanupTask(() => document.removeEventListener('keydown', escapeHandler));

        // Overlay click-outside
        this.attachListener(this.querySelector('#bulkExpirationModalOverlay'), 'click', (e) => {
            if (e.target.id === 'bulkExpirationModalOverlay') this.#close();
        });

        this.attachListener(this.querySelector('#closeBtn'), 'click', () => this.#close());
        this.attachListener(this.querySelector('#cancelBtn'), 'click', () => this.#close());
        this.attachListener(this.querySelector('#confirmBtn'), 'click', () => this.#handleConfirm());

        // Clear inline error on input change
        this.attachListener(this.querySelector('#bulkExpirationDate'), 'input', () => {
            this.#clearError();
        });

        // Focus the date input on open
        requestAnimationFrame(() => this.querySelector('#bulkExpirationDate')?.focus());
    }

    // ─── Private helpers ──────────────────────────────────────────────────────

    #handleConfirm() {
        const input = this.querySelector('#bulkExpirationDate');
        const value = input?.value;

        if (!value) {
            this.#showError('Please select an expiration date.');
            input?.focus();
            return;
        }

        const selectedDate = new Date(value);
        if (selectedDate <= new Date()) {
            this.#showError('Expiration date must be in the future.');
            input?.focus();
            return;
        }

        // Dispatch BEFORE unmount so LinksPage receives the event
        this.#dispatchDOMEvent('confirm', {expirationDate: selectedDate.toISOString()});
        this.unmount();
    }

    #close() {
        // Dispatch BEFORE unmount — container cleared by unmount loses the event
        this.#dispatchDOMEvent('cancel');
        this.unmount();
    }

    #showError(message) {
        const errorEl = this.querySelector('#dateError');
        const input = this.querySelector('#bulkExpirationDate');
        if (errorEl) {
            errorEl.textContent = message;
            errorEl.hidden = false;
        }
        input?.setAttribute('aria-invalid', 'true');
    }

    #clearError() {
        const errorEl = this.querySelector('#dateError');
        const input = this.querySelector('#bulkExpirationDate');
        if (errorEl) {
            errorEl.textContent = '';
            errorEl.hidden = true;
        }
        input?.removeAttribute('aria-invalid');
    }
}