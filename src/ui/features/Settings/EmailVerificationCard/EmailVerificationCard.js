/**
 * EmailVerificationCard  –  src/ui/ProfileHeaderCard/Settings/EmailVerificationCard.js
 *
 * Allows the user to send/resend an email verification link.
 * Emits 'send' → {}
 */

import './EmailVerificationCard.css';
import BaseComponent from '../../../base/BaseComponent.js';

class EmailVerificationCard extends BaseComponent {
    constructor(container, props) {
        super(container, props);
        this._sending = false;
        this._sent = false;
        this._cooldownTimer = null;
        this._cooldownSec = 0;
    }

    render() {
        const email = this.props.email || '';

        return `
        <div class="settings-card" id="emailVerifCard">
            <div class="settings-card-header">
                <div class="settings-card-icon settings-card-icon--teal">
                    <i class="fa-solid fa-envelope" aria-hidden="true"></i>
                </div>
                <div>
                    <h3 class="settings-card-title">Email Verification</h3>
                    <p class="settings-card-desc">
                        Verify your email address to unlock all features.
                    </p>
                </div>
            </div>

            <div class="settings-card-body">
                ${email ? `
                <div class="sf-current-info">
                    <span class="sf-current-info__label">Email to verify</span>
                    <span class="sf-current-info__value">${this.escapeHtml(email)}</span>
                </div>` : ''}

                <div class="evc-info-box">
                    <i class="fa-solid fa-circle-info" aria-hidden="true"></i>
                    <p>We'll send a verification link to your email address.
                    Click it to confirm you own this address.</p>
                </div>

                <div class="sf-feedback hidden" id="evcFeedback" role="alert"></div>

                <div class="sf-actions">
                    <button class="btn btn-primary sf-submit-btn" id="evcSendBtn" type="button">
                        <span class="sf-btn-text">
                            <i class="fa-solid fa-paper-plane" aria-hidden="true"></i>
                            Send Verification Email
                        </span>
                        <span class="sf-btn-spinner hidden">
                            <span class="spinner spinner--sm"></span> Sending…
                        </span>
                    </button>
                </div>
            </div>
        </div>`;
    }

    setupEventListeners() {
        const btn = this.querySelector('#evcSendBtn');
        if (btn) this.attachListener(btn, 'click', () => this._handleSend());
    }

    _handleSend() {
        if (this._sending || this._cooldownSec > 0) return;
        this.emit('send');
    }

    setSending(v) {
        this._sending = v;
        const btn = this.querySelector('#evcSendBtn');
        const text = this.querySelector('.sf-btn-text');
        const spinner = this.querySelector('.sf-btn-spinner');
        if (btn) btn.disabled = v;
        text?.classList.toggle('hidden', v);
        spinner?.classList.toggle('hidden', !v);
    }

    _setFeedback(message, type = 'info') {
        const el = this.querySelector('#evcFeedback');
        if (!el) return;
        el.className = `sf-feedback sf-feedback--${type}`;
        el.innerHTML = message;
        el.classList.remove('hidden');
    }

    setFeedback(message, type) {
        this._setFeedback(message, type);
    }

    startCooldown(seconds = 60) {
        this._cooldownSec = seconds;
        this._tickCooldown();
    }

    _tickCooldown() {
        const btn = this.querySelector('#evcSendBtn');
        const text = this.querySelector('.sf-btn-text i');
        if (!btn) return;

        if (this._cooldownSec <= 0) {
            btn.disabled = false;
            if (text) text.parentElement.innerHTML = '<i class="fa-solid fa-paper-plane" aria-hidden="true"></i> Resend Verification Email';
            return;
        }

        btn.disabled = true;
        if (btn.querySelector('.sf-btn-text')) {
            btn.querySelector('.sf-btn-text').textContent = `Resend in ${this._cooldownSec}s`;
        }

        this._cooldownSec--;
        this._cooldownTimer = setTimeout(() => this._tickCooldown(), 1000);
    }

    async destroy() {
        clearTimeout(this._cooldownTimer);
        await super.destroy();
    }
}

export default EmailVerificationCard;