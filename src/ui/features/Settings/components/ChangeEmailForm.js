/**
 * ChangeEmailForm  –  src/ui/ProfileHeaderCard/Settings/ChangeEmailForm.js
 */

import BaseComponent from '../../../base/BaseComponent.js';

class ChangeEmailForm extends BaseComponent {
    constructor(container, props) {
        super(container, props);
        this._saving = false;
        this._step = 1; // 1 = form, 2 = check-inbox notice
    }

    render() {
        const currentEmail = this.props.currentEmail || '';

        return `
        <div class="settings-card" id="changeEmailCard">
            <div class="settings-card-header">
                <div class="settings-card-icon settings-card-icon--purple">
                    <i class="fa-solid fa-at" aria-hidden="true"></i>
                </div>
                <div>
                    <h3 class="settings-card-title">Change Email Address</h3>
                    <p class="settings-card-desc">
                        A confirmation link will be sent to your new email address.
                    </p>
                </div>
            </div>

            <div class="settings-card-body">
                <!-- Current email (read-only info) -->
                ${currentEmail ? `
                <div class="sf-current-info">
                    <span class="sf-current-info__label">Current email</span>
                    <span class="sf-current-info__value">${this.escapeHtml(currentEmail)}</span>
                </div>` : ''}

                <!-- Step 1: form -->
                <div id="ceStep1">
                    <div class="sf-field">
                        <label class="sf-label" for="ce-email">New Email Address</label>
                        <div class="pef-input-wrap">
                            <i class="fa-solid fa-envelope pef-input-icon" aria-hidden="true"></i>
                            <input
                                type="email"
                                id="ce-email"
                                class="pef-input"
                                placeholder="new@example.com"
                                autocomplete="email"
                            >
                        </div>
                    </div>

                    <div class="sf-field">
                        <label class="sf-label" for="ce-password">Current Password</label>
                        <p class="sf-label-hint">Required to verify it's you.</p>
                        <div class="pef-input-wrap">
                            <i class="fa-solid fa-lock pef-input-icon" aria-hidden="true"></i>
                            <input
                                type="password"
                                id="ce-password"
                                class="pef-input"
                                placeholder="Your current password"
                                autocomplete="current-password"
                            >
                            <button type="button" class="sf-toggle-pw" data-target="ce-password" aria-label="Toggle visibility">
                                <i class="fa-regular fa-eye" aria-hidden="true"></i>
                            </button>
                        </div>
                    </div>

                    <div class="sf-feedback hidden" id="ceFeedback" role="alert"></div>

                    <div class="sf-actions">
                        <button class="btn btn-primary sf-submit-btn" id="ceSubmit" type="button">
                            <span class="sf-btn-text">
                                <i class="fa-solid fa-paper-plane" aria-hidden="true"></i>
                                Send Confirmation Email
                            </span>
                            <span class="sf-btn-spinner hidden">
                                <span class="spinner spinner--sm"></span> Sending…
                            </span>
                        </button>
                    </div>
                </div>

                <!-- Step 2: check inbox -->
                <div id="ceStep2" class="hidden">
                    <div class="sf-success-notice">
                        <div class="sf-success-notice__icon">
                            <i class="fa-regular fa-envelope-open" aria-hidden="true"></i>
                        </div>
                        <h4 class="sf-success-notice__title">Check your inbox</h4>
                        <p class="sf-success-notice__body">
                            We've sent a confirmation link to your new email address.
                            Click the link in that email to complete the change.
                        </p>
                        <p class="sf-success-notice__hint">
                            Didn't receive it? Check your spam folder, or
                            <button class="sf-link-btn" id="ceResend">resend the email</button>.
                        </p>
                    </div>
                </div>
            </div>
        </div>`;
    }

    setupEventListeners() {
        const toggleBtn = this.querySelector('.sf-toggle-pw');
        if (toggleBtn) {
            this.attachListener(toggleBtn, 'click', () => {
                const target = this.querySelector('#ce-password');
                if (!target) return;
                const show = target.type === 'password';
                target.type = show ? 'text' : 'password';
                toggleBtn.querySelector('i').className = show ? 'fa-regular fa-eye-slash' : 'fa-regular fa-eye';
            });
        }

        const submitBtn = this.querySelector('#ceSubmit');
        if (submitBtn) this.attachListener(submitBtn, 'click', () => this._handleSubmit());

        const resendBtn = this.querySelector('#ceResend');
        if (resendBtn) this.attachListener(resendBtn, 'click', () => this._goToStep1());
    }

    _handleSubmit() {
        if (this._saving) return;

        const email = this.querySelector('#ce-email')?.value?.trim() || '';
        const password = this.querySelector('#ce-password')?.value?.trim() || '';

        if (!email || !password) {
            this._setFeedback('Please fill in all fields.', 'error');
            return;
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            this._setFeedback('Please enter a valid email address.', 'error');
            return;
        }

        this.emit('submit', {newEmail: email, password});
    }

    setSaving(v) {
        this._saving = v;
        const btn = this.querySelector('#ceSubmit');
        const text = this.querySelector('.sf-btn-text');
        const spinner = this.querySelector('.sf-btn-spinner');
        if (btn) btn.disabled = v;
        text?.classList.toggle('hidden', v);
        spinner?.classList.toggle('hidden', !v);
    }

    _setFeedback(message, type = 'info') {
        const el = this.querySelector('#ceFeedback');
        if (!el) return;
        el.className = `sf-feedback sf-feedback--${type}`;
        el.textContent = message;
        el.classList.remove('hidden');
    }

    /** Called by the page after a successful API call */
    showSuccess() {
        this.querySelector('#ceStep1')?.classList.add('hidden');
        this.querySelector('#ceStep2')?.classList.remove('hidden');
    }

    setFeedback(message, type) {
        this._setFeedback(message, type);
    }

    _goToStep1() {
        this.querySelector('#ceStep1')?.classList.remove('hidden');
        this.querySelector('#ceStep2')?.classList.add('hidden');
    }
}

export default ChangeEmailForm;