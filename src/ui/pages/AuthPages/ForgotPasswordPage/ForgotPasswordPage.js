/**
 * ForgotPasswordPage — Requests a password reset email.
 *
 * RESPONSIBILITY: Collect email, call service, show success/resend UI.
 */

import BasePage from '../../BasePage.js';
import {isValidEmail} from '../../../../utils/validation.js';
import {clearError, showError} from '../../../components/feedback/Alert/Alerts.js';

export default class ForgotPasswordPage extends BasePage {
    #isSubmitting = false;
    #lastEmail = null;

    async mount() {
        await super.mount();

        this.form = this.querySelector('#forgotPasswordForm');
        this.emailInput = this.querySelector('#email');
        this.submitBtn = this.querySelector('button[type="submit"]');
        this.formContent = this.querySelector('#formContent');
        this.successCard = this.querySelector('#successCard');
        this.sentToEmail = this.querySelector('#sentToEmail');
        this.resendBtn = this.querySelector('#resendBtn');

        this.errorBox = this.querySelector('#errorMessage');

        this.#setupEventListeners();
    }

    #setupEventListeners() {
        if (this.emailInput) {
            this.attachListener(this.emailInput, 'input', () => {
                clearError(this);
                this.emailInput.classList.remove('input-error');
            });
        }

        if (this.form) {
            this.attachListener(this.form, 'submit', async (e) => {
                e.preventDefault();
                if (this.#isSubmitting) return;

                const email = this.emailInput?.value.trim();
                if (!this.#validateEmail(email)) return;

                try {
                    this.#isSubmitting = true;
                    this.#setSubmitLoading(true);
                    await this.getService('auth').requestPasswordReset(email);
                    this.#lastEmail = email;
                    this.#showSuccessState(email);
                } catch (error) {
                    showError(this, error.message || 'An error occurred. Please try again.');
                    this.emailInput?.focus();
                } finally {
                    this.#isSubmitting = false;
                    this.#setSubmitLoading(false);
                }
            });
        }

        if (this.resendBtn) {
            this.attachListener(this.resendBtn, 'click', async () => {
                const email = this.#lastEmail || this.sentToEmail?.textContent.trim();
                if (!email || this.#isSubmitting) return;

                this.#isSubmitting = true;
                this.resendBtn.classList.add('btn--loading');
                this.resendBtn.textContent = 'Sending…';

                try {
                    await this.getService('auth').requestPasswordReset(email);
                    this.resendBtn.classList.remove('btn--loading');
                    this.resendBtn.classList.add('btn--success');
                    this.resendBtn.textContent = '✓ Sent!';

                    setTimeout(() => {
                        this.resendBtn?.classList.remove('btn--success');
                        this.resendBtn && (this.resendBtn.textContent = 'Didn\'t receive it? Resend');
                        this.#isSubmitting = false;
                    }, 2000);
                } catch (error) {
                    showError(this, error.message || 'Failed to resend email. Please try again.');
                    this.resendBtn.classList.remove('btn--loading');
                    this.resendBtn.textContent = 'Failed — try again';
                    setTimeout(() => {
                        this.resendBtn && (this.resendBtn.textContent = 'Didn\'t receive it? Resend');
                        this.#isSubmitting = false;
                    }, 3000);
                }
            });
        }
    }

    // ─── Private ─────────────────────────────────────────────────────────────

    /**
     * Validates the email address before submission.
     *
     * Mirrors ForgotPasswordRequestValidator:
     *   - NotEmpty()              → 'Email is required.'
     *   - MaximumLength(256)      → 'Email address cannot exceed 256 characters.'  ← FIX 5
     *   - EmailAddress()          → 'Please enter a valid email address.'
     *
     * @param {string} email - The trimmed value from the email input.
     * @returns {boolean}
     * @private
     */
    #validateEmail(email) {
        if (!email) {
            showError(this, 'Email is required.');
            this.emailInput?.classList.add('input-error');
            this.emailInput?.focus();
            return false;
        }

        // FIX 5: MaximumLength(256) — mirrors ForgotPasswordRequestValidator
        if (email.length > 256) {
            showError(this, 'Email address cannot exceed 256 characters.');
            this.emailInput?.classList.add('input-error');
            this.emailInput?.focus();
            return false;
        }

        if (!isValidEmail(email)) {
            showError(this, 'Please enter a valid email address.');
            this.emailInput?.classList.add('input-error');
            this.emailInput?.focus();
            return false;
        }

        this.emailInput?.classList.remove('input-error');
        return true;
    }

    #setSubmitLoading(isLoading) {
        if (!this.submitBtn) return;
        this.submitBtn.classList.toggle('btn--loading', isLoading);
        this.submitBtn.textContent = isLoading ? 'Sending…' : 'Reset Password';
        // pointer-events: none is handled by .btn--loading CSS class
    }

    #showSuccessState(email) {
        this.formContent?.classList.add('hide');
        if (this.successCard) {
            this.successCard.style.display = 'block';
            setTimeout(() => this.successCard.classList.add('show'), 10);
        }
        if (this.sentToEmail) this.sentToEmail.textContent = email;
    }
}