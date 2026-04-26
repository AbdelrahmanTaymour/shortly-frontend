/**
 * CreateLinkModal — Single and bulk link creation dialog.
 *
 * ─── FIXES ───────────────────────────────────────────────────────────────────
 *
 * 1. emit() → this.#dispatchDOMEvent() for all inter-component events.
 *    The old code called this.emit('link:submit', data) which dispatches to
 *    object-level .on() callbacks — not to DOM event listeners. LinksPage
 *    wires modal events via attachListener(el, 'link:submit', handler), which
 *    listens for DOM CustomEvents. Mismatch → LinksPage never heard any event.
 *
 * 2. closeModal() emitted 'modal:close' AFTER unmount().
 *    unmount() removes all DOM content. Dispatching on the container after
 *    that fires on an empty element — the event was lost. Fixed: dispatch
 *    BEFORE calling unmount().
 *
 * 3. Escape handler already correctly uses addCleanupTask() ✓
 *    No change needed here — kept as-is.
 */

import BaseComponent from '../../../base/BaseComponent.js';

export default class CreateLinkModal extends BaseComponent {
    constructor(container, props = {}) {
        super(container, props);
        this.state = {
            createMode: 'single',
            advancedVisible: false,
            trackingEnabled: true,
            isPrivate: false,
            isProtected: false,
        };
    }

    // ─── Private DOM event dispatcher ─────────────────────────────────────────

    /**
     * Dispatches a bubbling DOM CustomEvent on the container.
     * Used for all events that LinksPage listens for via attachListener().
     * @private
     */
    #dispatchDOMEvent(eventName, detail = {}) {
        this.container?.dispatchEvent(
            new CustomEvent(eventName, {detail, bubbles: true})
        );
    }

    // ─── Rendering ────────────────────────────────────────────────────────────

    render() {
        const now = new Date().toISOString().slice(0, 16);
        const isBulk = this.state.createMode === 'bulk';

        return `
            <div class="modal-overlay open" id="createLinkModalOverlay"
                role="dialog" aria-modal="true" aria-labelledby="modalTitle">
                <div class="modal-container" role="document">
                    <div class="modal-header">
                        <h2 class="modal-title" id="modalTitle">Create New Link</h2>
                        <button class="modal-close-btn" id="closeBtn" aria-label="Close modal">
                            <i class="fa-solid fa-xmark" aria-hidden="true"></i>
                        </button>
                    </div>

                    <div class="modal-body">
                        <form id="createLinkForm" class="create-link-form" novalidate>

                            <!-- Mode toggle -->
                            <div class="mode-toggle" role="tablist">
                                <button type="button" role="tab"
                                    class="mode-toggle-btn ${!isBulk ? 'active' : ''}"
                                    aria-selected="${!isBulk}"
                                    data-mode="single">Single URL</button>
                                <button type="button" role="tab"
                                    class="mode-toggle-btn ${isBulk ? 'active' : ''}"
                                    aria-selected="${isBulk}"
                                    data-mode="bulk">Bulk URLs</button>
                            </div>

                            <!-- Single URL field -->
                            <div class="form-field ${isBulk ? 'hidden' : ''}"
                                id="singleUrlField" ${isBulk ? 'inert' : ''}>
                                <label for="destinationUrl">
                                    Destination URL <span class="required" aria-hidden="true">*</span>
                                </label>
                                <input type="url" name="destinationUrl" id="destinationUrl"
                                    placeholder="https://example.com/your-long-url"
                                    ${!isBulk ? 'required' : ''}>
                            </div>

                            <!-- Bulk URLs field -->
                            <div class="form-field ${!isBulk ? 'hidden' : ''}"
                                id="bulkUrlField" ${!isBulk ? 'inert' : ''}>
                                <label for="bulkUrls">
                                    Destination URLs <span class="required" aria-hidden="true">*</span>
                                </label>
                                <span class="form-hint hidden" id="urlCounter">0 URLs detected</span>
                                <textarea name="bulkUrls" id="bulkUrls" rows="5"
                                    placeholder="https://site1.com&#10;https://site2.com"
                                    ${isBulk ? 'required' : ''}></textarea>
                                <span class="form-hint">Separate URLs with new lines or commas</span>
                            </div>

                            <!-- Advanced toggle -->
                            <button type="button" class="advanced-options-toggle" id="advancedToggle"
                                aria-expanded="${this.state.advancedVisible}"
                                aria-controls="advancedOptions">
                                <i class="fa-solid fa-chevron-down ${this.state.advancedVisible ? 'rotate-180' : ''}"
                                   aria-hidden="true"></i>
                                <span>Advanced Options</span>
                            </button>

                            <div class="advanced-options ${this.state.advancedVisible ? 'visible' : 'hidden'}"
                                id="advancedOptions" role="region" aria-label="Advanced options">

                                <!-- Alias + Domain (hidden in bulk mode) -->
                                <div class="form-row-inline ${isBulk ? 'hidden' : ''}" id="aliasDomainRow"
                                    ${isBulk ? 'inert' : ''}>
                                    <div class="form-field">
                                        <label for="customAlias">
                                            Custom Alias <span class="optional">(optional)</span>
                                        </label>
                                        <input type="text" name="customAlias" id="customAlias"
                                            placeholder="my-custom-alias">
                                    </div>
                                    <div class="form-field">
                                        <label for="domainSelect">Domain</label>
                                        <select id="domainSelect" name="domain" disabled>
                                            <option value="short.ly">short.ly</option>
                                        </select>
                                    </div>
                                </div>

                                <div class="form-field">
                                    <label for="linkTitle">Title <span class="optional">(optional)</span></label>
                                    <input type="text" name="title" id="linkTitle" maxlength="50"
                                        placeholder="${isBulk ? 'Title applied to all Links' : 'My awesome link'}">
                                </div>

                                <div class="form-field">
                                    <label for="linkDescription">
                                        Description <span class="optional">(optional)</span>
                                    </label>
                                    <textarea name="description" id="linkDescription" rows="3" maxlength="500"
                                        placeholder="${isBulk ? 'Description applied to all Links' : 'My awesome link description'}"></textarea>
                                    <span class="form-hint" id="descCounter">0 / 500</span>
                                </div>

                                <div class="form-row-inline">
                                    <div class="form-field">
                                        <label for="clickLimit">
                                            Click Limit <span class="optional">(-1 = unlimited)</span>
                                        </label>
                                        <input type="number" name="clickLimit" id="clickLimit"
                                            value="-1" min="-1">
                                    </div>
                                    <div class="form-field">
                                        <label for="expiresAt">Expires At</label>
                                        <input type="datetime-local" name="expiresAt" id="expiresAt" min="${now}">
                                    </div>
                                </div>

                                <!-- Toggle: Tracking -->
                                <div class="toggle-switch-wrapper" id="trackingToggleBtn"
                                    role="checkbox" aria-checked="${this.state.trackingEnabled}" tabindex="0">
                                    <div class="toggle-switch-label">
                                        <span>Enable Tracking</span>
                                        <small>Track clicks, locations, devices</small>
                                    </div>
                                    <div class="toggle-switch ${this.state.trackingEnabled ? 'active' : ''}"></div>
                                </div>

                                <!-- Toggle: Private -->
                                <div class="toggle-switch-wrapper" id="privateToggleBtn"
                                    role="checkbox" aria-checked="${this.state.isPrivate}" tabindex="0">
                                    <div class="toggle-switch-label">
                                        <span>Make Private</span>
                                        <small>Hide link from public view</small>
                                    </div>
                                    <div class="toggle-switch ${this.state.isPrivate ? 'active' : ''}"></div>
                                </div>

                                <!-- Toggle: Password Protection -->
                                <div class="toggle-switch-wrapper" id="protectedToggleBtn"
                                    role="checkbox" aria-checked="${this.state.isProtected}" tabindex="0">
                                    <div class="toggle-switch-label">
                                        <span>Make Protected</span>
                                        <small>Require password to access the URL</small>
                                    </div>
                                    <div class="toggle-switch ${this.state.isProtected ? 'active' : ''}"></div>
                                </div>

                                <div class="form-field ${this.state.isProtected ? '' : 'hidden'}" id="urlPasswordRow">
                                    <label for="urlPassword">
                                        URL Password <span class="required" aria-hidden="true">*</span>
                                    </label>
                                    <input type="password" name="urlPassword" id="urlPassword"
                                        placeholder="my@Strong_Password!123"
                                        ${!this.state.isProtected ? 'disabled' : ''}>
                                </div>

                            </div>
                        </form>
                    </div>

                    <div class="modal-footer">
                        <button type="button" class="btn btn-outline" id="cancelBtn">Cancel</button>
                        <button type="submit" class="btn btn-primary" form="createLinkForm" id="submitBtn">
                            <i class="fa-solid fa-link" aria-hidden="true"></i> Shorten
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    // ─── Event listeners ──────────────────────────────────────────────────────

    setupEventListeners() {
        // ── Escape key + Tab focus trap ────────────────────────────────────────
        // addCleanupTask() ensures the document listener is removed even if
        // closeModal() is never called (e.g., if the page unmounts abruptly).
        const keyHandler = (e) => {
            if (e.key === 'Escape') this.closeModal();
            if (e.key === 'Tab') this.#handleFocusTrap(e);
        };
        document.addEventListener('keydown', keyHandler);
        this.addCleanupTask(() => document.removeEventListener('keydown', keyHandler));

        // ── Closing triggers ──────────────────────────────────────────────────
        ['#closeBtn', '#cancelBtn', '#createLinkModalOverlay'].forEach(sel => {
            this.attachListener(this.querySelector(sel), 'click', (e) => {
                if (sel === '#createLinkModalOverlay' && e.target.id !== 'createLinkModalOverlay') return;
                this.closeModal();
            });
        });

        // ── Form submit ───────────────────────────────────────────────────────
        this.attachListener(this.querySelector('#createLinkForm'), 'submit', async (e) => {
            e.preventDefault();
            await this.#handleSubmit();
        });

        // ── Mode toggle (Single / Bulk) ────────────────────────────────────────
        this.querySelectorAll('.mode-toggle-btn').forEach(btn => {
            this.attachListener(btn, 'click', () => {
                if (this.state.createMode === btn.dataset.mode) return;
                this.state.createMode = btn.dataset.mode;
                this.#syncModeUI();
            });
        });

        // ── Bulk URL counter ──────────────────────────────────────────────────
        const bulkInput = this.querySelector('#bulkUrls');
        const urlCounter = this.querySelector('#urlCounter');
        if (bulkInput && urlCounter) {
            this.attachListener(bulkInput, 'input', () => {
                const urls = bulkInput.value
                    .split(/[,\n]/).map(u => u.trim()).filter(Boolean);
                urlCounter.classList.toggle('hidden', urls.length === 0);
                urlCounter.textContent = `${urls.length} URL${urls.length !== 1 ? 's' : ''} detected`;
                urlCounter.style.color = urls.length > 50
                    ? 'var(--warning-color)' : 'var(--text-secondary)';
            });
        }

        // ── Advanced options panel ────────────────────────────────────────────
        this.attachListener(this.querySelector('#advancedToggle'), 'click', (e) => {
            this.state.advancedVisible = !this.state.advancedVisible;
            const panel = this.querySelector('#advancedOptions');
            const icon = e.currentTarget.querySelector('i');
            e.currentTarget.setAttribute('aria-expanded', this.state.advancedVisible);
            panel?.classList.toggle('hidden', !this.state.advancedVisible);
            panel?.classList.toggle('visible', this.state.advancedVisible);
            icon?.classList.toggle('rotate-180', this.state.advancedVisible);
        });

        // ── Toggle switches ───────────────────────────────────────────────────
        this.#setupToggle('#trackingToggleBtn', 'trackingEnabled');
        this.#setupToggle('#privateToggleBtn', 'isPrivate');
        this.#setupToggle('#protectedToggleBtn', 'isProtected', (isActive) => {
            const row = this.querySelector('#urlPasswordRow');
            const input = row?.querySelector('input');
            row?.classList.toggle('hidden', !isActive);
            if (input) {
                input.disabled = !isActive;
                if (isActive) input.focus();
            }
        });

        // Focus the first input on open
        requestAnimationFrame(() => {
            this.querySelector('#destinationUrl, #bulkUrls')?.focus();
        });
    }

    // ─── Private helpers ──────────────────────────────────────────────────────

    #setupToggle(selector, stateKey, callback = null) {
        const el = this.querySelector(selector);
        if (!el) return;

        const toggle = () => {
            this.state[stateKey] = !this.state[stateKey];
            el.querySelector('.toggle-switch')?.classList.toggle('active', this.state[stateKey]);
            el.setAttribute('aria-checked', String(this.state[stateKey]));
            callback?.(this.state[stateKey]);
        };

        this.attachListener(el, 'click', toggle);
        this.attachListener(el, 'keydown', (e) => {
            if (e.key === ' ' || e.key === 'Enter') {
                e.preventDefault();
                toggle();
            }
        });
    }

    #syncModeUI() {
        const isBulk = this.state.createMode === 'bulk';
        const sField = this.querySelector('#singleUrlField');
        const bField = this.querySelector('#bulkUrlField');
        const aliasRow = this.querySelector('#aliasDomainRow');
        const destInput = this.querySelector('#destinationUrl');
        const bulkInput = this.querySelector('#bulkUrls');
        const titleInput = this.querySelector('#linkTitle');
        const descInput = this.querySelector('#linkDescription');

        // Sync tab buttons
        this.querySelectorAll('.mode-toggle-btn').forEach(b => {
            b.classList.toggle('active', b.dataset.mode === this.state.createMode);
            b.setAttribute('aria-selected', String(b.dataset.mode === this.state.createMode));
        });

        // Show/hide fields
        sField?.classList.toggle('hidden', isBulk);
        bField?.classList.toggle('hidden', !isBulk);
        aliasRow?.classList.toggle('hidden', isBulk);

        // Manage inert (removes fields from keyboard/AT flow when hidden)
        isBulk ? sField?.setAttribute('inert', '') : sField?.removeAttribute('inert');
        isBulk ? aliasRow?.setAttribute('inert', '') : aliasRow?.removeAttribute('inert');
        !isBulk ? bField?.setAttribute('inert', '') : bField?.removeAttribute('inert');

        // Sync required attributes
        if (destInput) destInput.required = !isBulk;
        if (bulkInput) bulkInput.required = isBulk;
        if (titleInput) titleInput.placeholder = isBulk ? 'Title applied to all Links' : 'My awesome link';
        if (descInput) descInput.placeholder = isBulk ? 'Description applied to all Links' : 'My awesome link description';

        (isBulk ? bulkInput : destInput)?.focus();
    }

    #handleFocusTrap(e) {
        const focusable = this.querySelectorAll(
            'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        ).filter(el => !el.closest('[inert]'));

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first?.focus();
        }
    }

    async #handleSubmit() {
        const form = this.querySelector('#createLinkForm');
        const submitBtn = this.querySelector('#submitBtn');
        if (!form || !submitBtn) return;

        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        if (!submitBtn.dataset.originalHtml) {
            submitBtn.dataset.originalHtml = submitBtn.innerHTML;
        }

        try {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin" aria-hidden="true"></i>';

            const formData = new FormData(form);
            const data = {
                mode: this.state.createMode,
                tracking: this.state.trackingEnabled,
                title: formData.get('title')?.trim() || null,
                description: formData.get('description')?.trim() || null,
                customAlias: formData.get('customAlias') || null,
                clickLimit: parseInt(formData.get('clickLimit')) || -1,
                expiresAt: formData.get('expiresAt') || null,
                isPasswordProtected: this.state.isProtected,
                password: this.state.isProtected ? (formData.get('urlPassword') || '') : '',
                isPrivate: this.state.isPrivate,
            };

            if (this.state.createMode === 'bulk') {
                data.urls = formData.get('bulkUrls')
                    ?.split(/[,\n]/).map(u => u.trim()).filter(Boolean) ?? [];
            } else {
                data.originalUrl = formData.get('destinationUrl');
            }

            // DOM CustomEvent — LinksPage listens via attachListener(el, 'link:submit', ...)
            this.#dispatchDOMEvent('link:submit', data);

        } catch (error) {
            console.error('[CreateLinkModal] handleSubmit error:', error);
            this.resetSubmitButton();
        }
    }

    // ─── Public API ───────────────────────────────────────────────────────────

    resetSubmitButton() {
        const submitBtn = this.querySelector('#submitBtn');
        if (submitBtn?.dataset.originalHtml) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = submitBtn.dataset.originalHtml;
        }
    }

    /**
     * Close the modal.
     * IMPORTANT: dispatch 'modal:close' BEFORE unmount().
     * unmount() clears the container DOM — dispatching after that fires on
     * an empty element and the event is lost before any listener receives it.
     */
    closeModal() {
        this.resetSubmitButton();
        // Dispatch BEFORE unmount so the event reaches LinksPage
        this.#dispatchDOMEvent('modal:close');
        this.unmount();
    }
}