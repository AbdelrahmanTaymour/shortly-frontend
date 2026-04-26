/**
 * ChangePasswordForm  –  src/ui/ProfileHeaderCard/Settings/ChangePasswordForm.js
 *
 * Renders a change-password form with strength indicator.
 * Emits 'submit' → { currentPassword, newPassword, confirmPassword }
 */

import BaseComponent from '../../../base/BaseComponent.js';

class ChangePasswordForm extends BaseComponent {
    constructor(container, props) {
        super(container, props);
        this._saving = false;
    }

    render() {
        return `
        <div class="settings-card" id="changePasswordCard">
            <div class="settings-card-header">
                <div class="settings-card-icon settings-card-icon--blue">
                    <i class="fa-solid fa-key" aria-hidden="true"></i>
                </div>
                <div>
                    <h3 class="settings-card-title">Change Password</h3>
                    <p class="settings-card-desc">
                        Update your password. After saving, you'll be logged out of all devices.
                    </p>
                </div>
            </div>

            <div class="settings-card-body">
                <!-- Current password -->
                <div class="sf-field">
                    <label class="sf-label" for="cp-current">Current Password</label>
                    <div class="pef-input-wrap">
                        <i class="fa-solid fa-lock pef-input-icon" aria-hidden="true"></i>
                        <input
                            type="password"
                            id="cp-current"
                            class="pef-input"
                            placeholder="Enter your current password"
                            autocomplete="current-password"
                        >
                        <button type="button" class="sf-toggle-pw" data-target="cp-current" aria-label="Toggle visibility">
                            <i class="fa-regular fa-eye" aria-hidden="true"></i>
                        </button>
                    </div>
                </div>

                <!-- New password -->
                <div class="sf-field">
                    <label class="sf-label" for="cp-new">New Password</label>
                    <div class="pef-input-wrap">
                        <i class="fa-solid fa-lock-open pef-input-icon" aria-hidden="true"></i>
                        <input
                            type="password"
                            id="cp-new"
                            class="pef-input"
                            placeholder="At least 8 characters"
                            autocomplete="new-password"
                        >
                        <button type="button" class="sf-toggle-pw" data-target="cp-new" aria-label="Toggle visibility">
                            <i class="fa-regular fa-eye" aria-hidden="true"></i>
                        </button>
                    </div>
                    <!-- Strength indicator -->
                    <div class="sf-strength" id="cpStrengthWrap" aria-live="polite">
                        <div class="sf-strength-bars">
                            <span class="sf-strength-bar" id="cpBar1"></span>
                            <span class="sf-strength-bar" id="cpBar2"></span>
                            <span class="sf-strength-bar" id="cpBar3"></span>
                            <span class="sf-strength-bar" id="cpBar4"></span>
                        </div>
                        <span class="sf-strength-label" id="cpStrengthLabel">—</span>
                    </div>
                </div>

                <!-- Confirm password -->
                <div class="sf-field">
                    <label class="sf-label" for="cp-confirm">Confirm New Password</label>
                    <div class="pef-input-wrap">
                        <i class="fa-solid fa-lock pef-input-icon" aria-hidden="true"></i>
                        <input
                            type="password"
                            id="cp-confirm"
                            class="pef-input"
                            placeholder="Repeat new password"
                            autocomplete="new-password"
                        >
                        <button type="button" class="sf-toggle-pw" data-target="cp-confirm" aria-label="Toggle visibility">
                            <i class="fa-regular fa-eye" aria-hidden="true"></i>
                        </button>
                    </div>
                    <p class="sf-match-hint hidden" id="cpMatchHint"></p>
                </div>

                <!-- Inline error/success -->
                <div class="sf-feedback hidden" id="cpFeedback" role="alert"></div>

                <!-- Action -->
                <div class="sf-actions">
                    <button class="btn btn-primary sf-submit-btn" id="cpSubmit" type="button">
                        <span class="sf-btn-text">
                            <i class="fa-solid fa-floppy-disk" aria-hidden="true"></i>
                            Update Password
                        </span>
                        <span class="sf-btn-spinner hidden">
                            <span class="spinner spinner--sm"></span> Saving…
                        </span>
                    </button>
                </div>
            </div>
        </div>`;
    }

    setupEventListeners() {
        // Show/hide password toggles
        this.querySelectorAll('.sf-toggle-pw').forEach(btn => {
            this.attachListener(btn, 'click', () => {
                const target = this.querySelector(`#${btn.dataset.target}`);
                if (!target) return;
                const show = target.type === 'password';
                target.type = show ? 'text' : 'password';
                btn.querySelector('i').className = show ? 'fa-regular fa-eye-slash' : 'fa-regular fa-eye';
            });
        });

        // Strength meter
        const newPwEl = this.querySelector('#cp-new');
        if (newPwEl) this.attachListener(newPwEl, 'input', () => this._updateStrength(newPwEl.value));

        // Match check
        const confirmEl = this.querySelector('#cp-confirm');
        if (confirmEl) this.attachListener(confirmEl, 'input', () => this._checkMatch());

        // Submit
        const submitBtn = this.querySelector('#cpSubmit');
        if (submitBtn) this.attachListener(submitBtn, 'click', () => this._handleSubmit());
    }

    // ─── Strength meter ────────────────────────────────────────────────────────

    _scorePassword(pw) {
        let score = 0;
        if (!pw) return 0;
        if (pw.length >= 8) score++;
        if (pw.length >= 12) score++;
        if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
        if (/\d/.test(pw)) score++;
        if (/[^A-Za-z0-9]/.test(pw)) score++;
        return Math.min(4, score);
    }

    _updateStrength(pw) {
        const score = this._scorePassword(pw);
        const labels = ['', 'Weak', 'Fair', 'Good', 'Strong'];
        const colors = ['', 'sf-bar--red', 'sf-bar--orange', 'sf-bar--yellow', 'sf-bar--green'];

        for (let i = 1; i <= 4; i++) {
            const bar = this.querySelector(`#cpBar${i}`);
            if (bar) bar.className = `sf-strength-bar ${i <= score ? colors[score] : ''}`;
        }

        const label = this.querySelector('#cpStrengthLabel');
        if (label) label.textContent = pw ? (labels[score] || 'Weak') : '—';
    }

    _checkMatch() {
        const newPw = this.querySelector('#cp-new')?.value || '';
        const confirmPw = this.querySelector('#cp-confirm')?.value || '';
        const hint = this.querySelector('#cpMatchHint');
        if (!hint || !confirmPw) return;

        hint.classList.remove('hidden', 'sf-match--ok', 'sf-match--bad');
        if (newPw === confirmPw) {
            hint.textContent = '✓ Passwords match';
            hint.classList.add('sf-match--ok');
        } else {
            hint.textContent = '✗ Passwords do not match';
            hint.classList.add('sf-match--bad');
        }
        hint.classList.remove('hidden');
    }

    // ─── Submit ────────────────────────────────────────────────────────────────

    _handleSubmit() {
        if (this._saving) return;

        const currentPw = this.querySelector('#cp-current')?.value || '';
        const newPw = this.querySelector('#cp-new')?.value || '';
        const confirmPw = this.querySelector('#cp-confirm')?.value || '';

        if (!currentPw || !newPw || !confirmPw) {
            this._setFeedback('Please fill in all fields.', 'error');
            return;
        }

        this.emit('submit', {currentPassword: currentPw, newPassword: newPw, confirmPassword: confirmPw});
    }

    // ─── State helpers ─────────────────────────────────────────────────────────

    setSaving(v) {
        this._saving = v;
        const btn = this.querySelector('#cpSubmit');
        const text = this.querySelector('.sf-btn-text');
        const spinner = this.querySelector('.sf-btn-spinner');
        if (btn) btn.disabled = v;
        text?.classList.toggle('hidden', v);
        spinner?.classList.toggle('hidden', !v);
    }

    _setFeedback(message, type = 'info') {
        const el = this.querySelector('#cpFeedback');
        if (!el) return;
        el.className = `sf-feedback sf-feedback--${type}`;
        el.textContent = message;
        el.classList.remove('hidden');
    }

    setFeedback(message, type = 'success') {
        this._setFeedback(message, type);
        if (type === 'success') this._resetForm();
    }

    _resetForm() {
        ['#cp-current', '#cp-new', '#cp-confirm'].forEach(id => {
            const el = this.querySelector(id);
            if (el) el.value = '';
        });
        this._updateStrength('');
        const hint = this.querySelector('#cpMatchHint');
        if (hint) hint.classList.add('hidden');
    }
}

export default ChangePasswordForm;