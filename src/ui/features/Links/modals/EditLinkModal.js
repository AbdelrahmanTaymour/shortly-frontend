/**
 * EditLinkModal — Edit an existing link's properties.
 *
 * ─── FIXES IN THIS REVISION ─────────────────────────────────────────────────
 *
 * FIX 1: formatting.js import path corrected for folder-per-component structure.
 *   File location: src/ui/features/Links/modals/EditLinkModal/EditLinkModal.js
 *   Before: '../../../../utils/formatting.js'  → resolves to src/ui/utils/ ❌
 *   After:  '../../../../../utils/formatting.js' → resolves to src/utils/  ✅
 *   The original path was written for a FLAT file layout. Moving into its own
 *   folder (as the architecture requires) adds one more directory level, so
 *   one additional '../' is needed to reach src/.
 *
 * Previously documented fixes (retained from prior audit):
 *   - this._cleanupTasks.push() → this.addCleanupTask()
 *   - emit() → #dispatchDOMEvent() for 'link:update' and 'modal:close'
 *   - 'modal:close' dispatched BEFORE unmount()
 *   - Inline style on password row → CSS class .password-edit-row
 */

import BaseComponent from '../../../base/BaseComponent';
import {cleanString, formatForDateTimeLocal} from '../../../../utils/formatting';

export default class EditLinkModal extends BaseComponent {
    constructor(container, props = {}) {
        super(container, props);
        this.state = {
            isActive: props.linkData?.isActive ?? true,
            trackingEnabled: props.linkData?.trackingEnabled ?? true,
            isPrivate: props.linkData?.isPrivate ?? false,
            isProtected: !!props.linkData?.isPasswordProtected,
            changingPassword: false,
            linkId: props.linkData?.id,
        };
    }

    // ─── Private DOM event dispatcher ─────────────────────────────────────────

    #dispatchDOMEvent(eventName, detail = {}) {
        this.container?.dispatchEvent(
            new CustomEvent(eventName, {detail, bubbles: true})
        );
    }

    // ─── Rendering ────────────────────────────────────────────────────────────

    render() {
        const {linkData} = this.props;
        const now = new Date().toISOString().slice(0, 16);
        const expiryValue = formatForDateTimeLocal(linkData?.expiresAt) || '';
        const minDate = (expiryValue && expiryValue < now) ? expiryValue : now;
        const isAlreadyProtected = !!linkData?.isPasswordProtected;
        const isDisabled = isAlreadyProtected && !this.state.changingPassword;

        return `
            <div class="modal-overlay open" id="editLinkModalOverlay"
                role="dialog" aria-modal="true" aria-labelledby="modalTitle">
                <div class="modal-container" role="document">

                    <div class="modal-header">
                        <h2 class="modal-title" id="modalTitle">Edit Link</h2>
                        <button class="modal-close-btn" id="closeBtn" aria-label="Close modal">
                            <i class="fa-solid fa-xmark" aria-hidden="true"></i>
                        </button>
                    </div>

                    <div class="modal-body">
                        <form id="editLinkForm" class="create-link-form" novalidate>

                            <div class="form-field">
                                <label for="destinationUrl">
                                    Destination URL <span class="required" aria-hidden="true">*</span>
                                </label>
                                <input type="url" name="destinationUrl" id="destinationUrl"
                                    value="${this.escapeHtml(linkData?.originalUrl || '')}" required>
                            </div>

                            <div class="form-row-inline">
                                <div class="form-field">
                                    <label for="customAlias">Custom Alias</label>
                                    <input type="text" id="customAlias"
                                        value="${this.escapeHtml(linkData?.shortCode || '')}"
                                        disabled class="input-disabled">
                                    <span class="form-hint">Alias cannot be changed after creation</span>
                                </div>
                                <div class="form-field">
                                    <label for="domainSelect">Domain</label>
                                    <select id="domainSelect" name="domain" disabled class="input-disabled">
                                        <option value="short.ly">short.ly</option>
                                    </select>
                                </div>
                            </div>

                            <div class="form-field">
                                <label for="linkTitle">Title <span class="optional">(optional)</span></label>
                                <input type="text" name="title" id="linkTitle" maxlength="50"
                                    value="${this.escapeHtml(linkData?.title || '')}"
                                    placeholder="e.g. Social Media Campaign">
                            </div>

                            <div class="form-field">
                                <label for="linkDescription">
                                    Description <span class="optional">(optional)</span>
                                </label>
                                <textarea name="description" id="linkDescription" rows="3" maxlength="500"
                                    placeholder="Enter link details...">${this.escapeHtml(linkData?.description || '')}</textarea>
                            </div>

                            <div class="form-row-inline">
                                <div class="form-field">
                                    <label for="clickLimit">
                                        Click Limit <span class="optional">(-1 = unlimited)</span>
                                    </label>
                                    <input type="number" name="clickLimit" id="clickLimit"
                                        value="${linkData?.clickLimit ?? -1}" min="-1">
                                </div>
                                <div class="form-field">
                                    <label for="expiresAt">Expires At</label>
                                    <input type="datetime-local" name="expiresAt" id="expiresAt"
                                        min="${minDate}" value="${expiryValue}">
                                </div>
                            </div>

                            <!-- Toggle: Active Status -->
                            <div class="toggle-switch-wrapper" id="activationToggleBtn"
                                role="checkbox" aria-checked="${this.state.isActive}" tabindex="0">
                                <div class="toggle-switch-label">
                                    <span>Active Status</span>
                                    <small>Enable or disable this link redirect</small>
                                </div>
                                <div class="toggle-switch ${this.state.isActive ? 'active' : ''}"></div>
                            </div>

                            <!-- Toggle: Tracking -->
                            <div class="toggle-switch-wrapper" id="trackingToggleBtn"
                                role="checkbox" aria-checked="${this.state.trackingEnabled}" tabindex="0">
                                <div class="toggle-switch-label">
                                    <span>Enable Tracking</span>
                                    <small>Track clicks, locations, and devices</small>
                                </div>
                                <div class="toggle-switch ${this.state.trackingEnabled ? 'active' : ''}"></div>
                            </div>

                            <!-- Toggle: Private -->
                            <div class="toggle-switch-wrapper" id="privateToggleBtn"
                                role="checkbox" aria-checked="${this.state.isPrivate}" tabindex="0">
                                <div class="toggle-switch-label">
                                    <span>Make Private</span>
                                    <small>Hide from public analytics</small>
                                </div>
                                <div class="toggle-switch ${this.state.isPrivate ? 'active' : ''}"></div>
                            </div>

                            <!-- Toggle: Password Protection -->
                            <div class="toggle-switch-wrapper" id="protectedToggleBtn"
                                role="checkbox" aria-checked="${this.state.isProtected}" tabindex="0">
                                <div class="toggle-switch-label">
                                    <span>Password Protection</span>
                                    <small>Require a password to access the link</small>
                                </div>
                                <div class="toggle-switch ${this.state.isProtected ? 'active' : ''}"></div>
                            </div>

                            <div class="form-field ${this.state.isProtected ? '' : 'hidden'}" id="urlPasswordRow">
                                <label for="urlPassword">
                                    URL Password <span class="required" aria-hidden="true">*</span>
                                </label>
                                <div class="password-edit-row">
                                    <input
                                        type="password"
                                        name="urlPassword"
                                        id="urlPassword"
                                        placeholder="${isAlreadyProtected ? 'Current password is active' : 'Enter password (min. 6 characters)'}"
                                        ${isDisabled ? 'disabled' : ''}
                                        class="${isDisabled ? 'input-disabled' : ''}"
                                    >
                                    ${isAlreadyProtected ? `
                                        <button type="button" class="btn btn-outline btn--sm" id="togglePasswordEditBtn">
                                            Change
                                        </button>` : ''}
                                </div>
                            </div>

                        </form>
                    </div>

                    <div class="modal-footer">
                        <button type="button" class="btn btn-outline" id="cancelBtn">Cancel</button>
                        <button type="submit" class="btn btn-primary" form="editLinkForm" id="submitBtn">
                            <i class="fa-solid fa-floppy-disk" aria-hidden="true"></i> Save Changes
                        </button>
                    </div>

                </div>
            </div>
        `;
    }

    // ─── Event listeners ──────────────────────────────────────────────────────

    setupEventListeners() {
        // Save original button HTML for resetSubmitButton()
        const submitBtn = this.querySelector('#submitBtn');
        if (submitBtn && !submitBtn.dataset.originalHtml) {
            submitBtn.dataset.originalHtml = submitBtn.innerHTML;
        }

        // Form submit
        this.attachListener(this.querySelector('#editLinkForm'), 'submit', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            await this.#handleSubmit();
        });

        // Toggle switches
        this.#setupToggle('#activationToggleBtn', 'isActive');
        this.#setupToggle('#trackingToggleBtn', 'trackingEnabled');
        this.#setupToggle('#privateToggleBtn', 'isPrivate');
        this.#setupToggle('#protectedToggleBtn', 'isProtected', (isP) => {
            const row = this.querySelector('#urlPasswordRow');
            const input = this.querySelector('#urlPassword');
            const btn = this.querySelector('#togglePasswordEditBtn');

            row?.classList.toggle('hidden', !isP);
            if (!isP) {
                this.state.changingPassword = false;
                if (input) {
                    input.value = '';
                    input.disabled = !!this.props.linkData?.isPasswordProtected;
                    input.classList.toggle('input-disabled', !!this.props.linkData?.isPasswordProtected);
                }
                if (btn) btn.textContent = 'Change';
            }
        });

        // "Change / Cancel" password edit toggle
        const togglePassBtn = this.querySelector('#togglePasswordEditBtn');
        const passwordInput = this.querySelector('#urlPassword');
        if (togglePassBtn && passwordInput) {
            this.attachListener(togglePassBtn, 'click', () => {
                this.state.changingPassword = !this.state.changingPassword;
                if (this.state.changingPassword) {
                    passwordInput.disabled = false;
                    passwordInput.classList.remove('input-disabled');
                    passwordInput.placeholder = 'Enter new password (min. 6 characters)';
                    passwordInput.value = '';
                    passwordInput.focus();
                    togglePassBtn.textContent = 'Cancel';
                } else {
                    passwordInput.disabled = true;
                    passwordInput.classList.add('input-disabled');
                    passwordInput.placeholder = 'Current password is active';
                    passwordInput.value = '';
                    togglePassBtn.textContent = 'Change';
                }
            });
        }

        // Escape key — addCleanupTask() ensures removal even if closeModal() is never called
        const escapeHandler = async (e) => {
            if (e.key === 'Escape') await this.closeModal();
        };
        document.addEventListener('keydown', escapeHandler);
        this.addCleanupTask(() => document.removeEventListener('keydown', escapeHandler));

        // Close buttons + overlay click-outside
        ['#closeBtn', '#cancelBtn', '#editLinkModalOverlay'].forEach(sel => {
            const el = this.querySelector(sel);
            if (!el) return;
            this.attachListener(el, 'click', async (e) => {
                if (sel === '#editLinkModalOverlay' && e.target.id !== 'editLinkModalOverlay') return;
                await this.closeModal();
            });
        });
    }

    // ─── Private helpers ──────────────────────────────────────────────────────

    #setupToggle(selector, stateKey, callback = null) {
        const el = this.querySelector(selector);
        if (!el) return;
        this.attachListener(el, 'click', () => {
            this.state[stateKey] = !this.state[stateKey];
            el.querySelector('.toggle-switch')?.classList.toggle('active', this.state[stateKey]);
            el.setAttribute('aria-checked', String(this.state[stateKey]));
            callback?.(this.state[stateKey]);
        });
    }

    async #handleSubmit() {
        const form = this.querySelector('#editLinkForm');
        const submitBtn = this.querySelector('#submitBtn');
        if (!form || !submitBtn) return;

        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        const formData = new FormData(form);
        const passwordInput = this.querySelector('#urlPassword');
        const passwordValue = passwordInput?.value.trim() ?? '';
        const isAlreadyProtected = !!this.props.linkData?.isPasswordProtected;

        if (this.state.isProtected) {
            const needsNewPassword = !isAlreadyProtected || this.state.changingPassword;
            if (needsNewPassword && passwordValue.length < 6) {
                // Re-throw so LinksPage.#handleEditSubmit() catches it and shows the toast.
                throw new Error('Password must be at least 6 characters.');
            }
        }

        try {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin" aria-hidden="true"></i> Saving…';

            const payload = {
                id: Number(this.state.linkId),
                originalUrl: formData.get('destinationUrl'),
                isActive: this.state.isActive,
                trackingEnabled: this.state.trackingEnabled,
                clickLimit: parseInt(formData.get('clickLimit')) || -1,
                isPasswordProtected: this.state.isProtected,
                password: (this.state.isProtected && (!isAlreadyProtected || this.state.changingPassword))
                    ? passwordValue : null,
                isPrivate: this.state.isPrivate,
                expiresAt: formData.get('expiresAt')
                    ? new Date(formData.get('expiresAt')).toISOString() : null,
                title: cleanString(formData.get('title')),
                description: cleanString(formData.get('description')),
            };

            // DOM CustomEvent — LinksPage listens via attachListener(el, 'link:update', ...)
            this.#dispatchDOMEvent('link:update', payload);

        } catch (error) {
            console.error('[EditLinkModal] handleSubmit error:', error);
            this.resetSubmitButton();
            throw error;
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
     * Dispatch 'modal:close' BEFORE unmount().
     * unmount() clears the container — dispatching after loses the event.
     */
    async closeModal() {
        this.#dispatchDOMEvent('modal:close');
        await this.unmount();
    }
}