/**
 * AuthForm — Feature component for all authentication forms.
 *
 * RENDERS INTO: .Auth-form-container (in LoginPage.html / RegisterPage.html)
 *
 * RESPONSIBILITY:
 *   - Render the correct form (login or register) matching legacy UI class names
 *   - Own all validation, password-toggle, and password-strength logic
 *   - Emit typed EventBus events upward: 'authForm:submit', 'authForm:oauthRequest'
 *
 * ALLOWED:   DOM manipulation within container · validation · emit EventBus events
 * FORBIDDEN: Call services · navigate · store.dispatch()
 */

import './AuthForm.css';
import BaseComponent from '../../../base/BaseComponent.js';
import {isValidatePassword, isValidEmail, validateUsername,} from '../../../../utils/validation.js';

export default class AuthForm extends BaseComponent {

    #mode;
    #termsAccepted = false;

    constructor(container, props = {}) {
        super(container, props);
        this.#mode = props.mode || 'login';
    }

    render() {
        return this.#mode === 'login' ? this.#renderLogin() : this.#renderRegister();
    }

    setupEventListeners() {
        this.#attachFormSubmit();
        this.#attachPasswordToggle();
        this.#attachSocialButtons();
        this.#attachErrorClearOnInput();
        if (this.#mode === 'register') this.#attachRegisterListeners();
    }

    // ─── Public API ───────────────────────────────────────────────────────────

    /**
     * Show a server-side or terms error in the global error box.
     * @param {string} message
     */
    showError(message) {
        const box = this.querySelector('.error-message');
        if (!box) return;
        box.textContent = message;
        box.classList.add('show');
        box.focus();
    }

    /** Clear the global error box — mirrors legacy clearError() in alerts.js. */
    clearError() {
        const box = this.querySelector('.error-message');
        if (!box) return;
        box.textContent = '';
        box.classList.remove('show');
    }

    /** Clear the global box AND every per-field inline error. */
    clearAllErrors() {
        this.clearError();
        this.querySelectorAll('.field-error-msg').forEach(el => {
            el.textContent = '';
            el.classList.remove('show');
        });
        this.querySelectorAll('.input-error').forEach(el => {
            el.classList.remove('input-error');
            el.removeAttribute('aria-invalid');
        });
    }

    /** Enable or disable the submit button during network requests. */
    setSubmitDisabled(disabled) {
        const btn = this.querySelector('button[type="submit"]');
        if (!btn) return;
        btn.disabled = disabled;
        btn.setAttribute('aria-busy', String(disabled));
        btn.textContent = disabled
            ? (this.#mode === 'login' ? 'Signing in\u2026' : 'Creating account\u2026')
            : (this.#mode === 'login' ? 'Sign In' : 'Create Account');
    }

    /** @returns {boolean} Whether "Remember me" is checked (login only). */
    getRememberMe() {
        return this.querySelector('#rememberCheckbox')?.checked ?? false;
    }

    // ─── Rendering ────────────────────────────────────────────────────────────

    #renderLogin() {
        return /* html */`
            
            <div
                class="error-message"
                id="loginErrorMessage"
                role="alert"
                aria-live="assertive"
                aria-atomic="true"
                tabindex="-1"
            ></div>

            <form class="form-base" id="loginForm" autocomplete="on" novalidate>

                <div class="form-group-base">
                    <label for="loginIdentifier" class="sr-only">Email or Username</label>
                    <input
                        type="text"
                        id="loginIdentifier"
                        class="text-base input"
                        name="loginIdentifier"
                        placeholder="Email or Username"
                        autocomplete="username"
                        aria-required="true"
                        aria-describedby="loginIdentifier-error"
                        required
                    />
                    <!--
                        Per-field error — always in the DOM, invisible until .show is added.
                        Placed directly below its field so the association is visually immediate.
                        aria-live="polite" announces updates without interrupting screen-reader speech.
                    -->
                    <p class="field-error-msg" id="loginIdentifier-error" aria-live="polite"></p>
                </div>

                <div class="form-group-base">
                    <label for="loginPassword" class="sr-only">Password</label>
                    <input
                        type="password"
                        id="loginPassword"
                        class="text-base input"
                        name="password"
                        placeholder="Password"
                        autocomplete="current-password"
                        aria-required="true"
                        aria-describedby="loginPassword-error"
                        required
                    />
                    <button
                        type="button"
                        class="password-toggle"
                        aria-controls="loginPassword"
                        aria-pressed="false"
                        aria-label="Show password"
                    >
                        <i class="fa-regular fa-eye" aria-hidden="true"></i>
                    </button>
                    <p class="field-error-msg" id="loginPassword-error" aria-live="polite"></p>
                </div>

                <div class="form-options">
                    <label class="remember-me">
                        <input type="checkbox" id="rememberCheckbox" name="remember" class="real-checkbox" />
                        <span class="custom-checkbox" aria-hidden="true"></span>
                        <span>Remember me</span>
                    </label>
                    <a href="/forgot-password" data-link class="forgot-password">Forgot password?</a>
                </div>

                <button type="submit" id="loginBtn" class="btn btn-primary-base" aria-busy="false">
                    Sign In
                </button>

            </form>

            <div class="divider" aria-hidden="true">Or continue with</div>

            <div class="social-buttons-base social-login" role="group" aria-label="Social sign-in options">
                <button class="social-btn google" id="googleLoginBtn" type="button" aria-label="Sign in with Google">
                    <span aria-hidden="true"><i class="fa-brands fa-google"></i></span>
                    <span>Google</span>
                </button>
                <button class="social-btn facebook" id="facebookLoginBtn" type="button"
                        aria-label="Sign in with Facebook (coming soon)" disabled aria-disabled="true">
                    <span aria-hidden="true"><i class="fa-brands fa-facebook"></i></span>
                    <span>Facebook</span>
                </button>
            </div>

            <div class="form-link-base signup-link">
                Don't have an account? <a href="/register" data-link>Sign up</a>
            </div>
        `;
    }

    #renderRegister() {
        return /* html */`
            <div
                class="error-message"
                id="registerErrorMessage"
                role="alert"
                aria-live="assertive"
                aria-atomic="true"
                tabindex="-1"
            ></div>

            <form class="form-base" id="registerForm" autocomplete="on" novalidate>

                <div class="form-group-base">
                    <label for="registerEmail" class="sr-only">Email address</label>
                    <input
                        type="email"
                        id="registerEmail"
                        class="text-base input"
                        name="email"
                        placeholder="Email address"
                        autocomplete="email"
                        aria-required="true"
                        aria-describedby="registerEmail-error"
                        required
                    />
                    <p class="field-error-msg" id="registerEmail-error" aria-live="polite"></p>
                </div>

                <div class="form-group-base">
                    <label for="registerUsername" class="sr-only">Username</label>
                    <input
                        type="text"
                        id="registerUsername"
                        class="text-base input"
                        name="username"
                        placeholder="Username"
                        autocomplete="username"
                        aria-required="true"
                        aria-describedby="registerUsername-error"
                        required
                    />
                    <p class="field-error-msg" id="registerUsername-error" aria-live="polite"></p>
                </div>

                <div class="form-group-base password-group">
                    <label for="registerPassword" class="sr-only">Password</label>
                    <input
                        type="password"
                        id="registerPassword"
                        class="text-base input"
                        name="password"
                        placeholder="At least 8 characters"
                        autocomplete="new-password"
                        aria-required="true"
                        aria-describedby="registerPassword-error regStrengthLabel"
                        required
                    />
                    <button
                        type="button"
                        class="password-toggle"
                        aria-controls="registerPassword"
                        aria-pressed="false"
                        aria-label="Show password"
                    >
                        <i class="fa-regular fa-eye" aria-hidden="true"></i>
                    </button>

                    <div class="sf-strength" aria-live="polite" aria-atomic="true">
                        <div class="sf-strength-bars" aria-hidden="true">
                            <span class="sf-strength-bar" id="regBar1"></span>
                            <span class="sf-strength-bar" id="regBar2"></span>
                            <span class="sf-strength-bar" id="regBar3"></span>
                            <span class="sf-strength-bar" id="regBar4"></span>
                        </div>
                        <span class="sf-strength-label" id="regStrengthLabel">—</span>
                    </div>

                    <p class="field-error-msg" id="registerPassword-error" aria-live="polite"></p>
                </div>

                <div class="form-group-base">
                    <label for="termsCheckbox" class="terms-group" id="termsGroup">
                        <input
                            type="checkbox"
                            id="termsCheckbox"
                            name="chkTerms"
                            class="real-checkbox"
                            aria-required="true"
                        />
                        <span class="custom-checkbox" aria-hidden="true"></span>
                        <div class="terms-text">
                            I agree to the
                            <a href="/terms" data-link class="terms-link">Terms of Service</a>
                            and
                            <a href="/privacy" data-link class="terms-link">Privacy Policy</a>
                        </div>
                    </label>
                </div>

                <button type="submit" id="registerBtn" class="btn btn-primary" aria-busy="false" disabled>
                    Create Account
                </button>

            </form>

            <div class="divider" aria-hidden="true">Or sign up with</div>

            <div class="social-buttons-base" role="group" aria-label="Social sign-up options">
                <button class="social-btn google" id="googleRegisterBtn" type="button" aria-label="Sign up with Google">
                    <span aria-hidden="true"><i class="fa-brands fa-google"></i></span>
                    <span>Google</span>
                </button>
                <button class="social-btn facebook" id="facebookRegisterBtn" type="button"
                        aria-label="Sign up with Facebook (coming soon)" disabled aria-disabled="true">
                    <span aria-hidden="true"><i class="fa-brands fa-facebook"></i></span>
                    <span>Facebook</span>
                </button>
            </div>

            <div class="form-link-base">
                Already have an account? <a href="/login" data-link>Sign in</a>
            </div>
        `;
    }

    // ─── Event listener setup ─────────────────────────────────────────────────

    #attachFormSubmit() {
        const form = this.querySelector('form');
        if (!form) return;
        this.attachListener(form, 'submit', (e) => {
            e.preventDefault();
            this.#handleSubmit();
        });
    }

    #attachPasswordToggle() {
        const btn = this.querySelector('.password-toggle');
        if (!btn) return;
        this.attachListener(btn, 'click', (e) => {
            e.preventDefault();
            this.#togglePasswordVisibility(btn);
        });
    }

    #attachSocialButtons() {
        const googleBtn = this.querySelector('#googleLoginBtn, #googleRegisterBtn');
        if (googleBtn) {
            this.attachListener(googleBtn, 'click', (e) => {
                e.preventDefault();
                this.props.eventBus.emit('authForm:oauthRequest', {provider: 'google'});
            });
        }
    }

    /**
     * Clear errors for the field the user is actively editing.
     * e.target is used (not document.activeElement) because focus hasn't
     * necessarily moved yet when the 'input' event fires.
     */
    #attachErrorClearOnInput() {
        const form = this.querySelector('form');
        if (!form) return;
        this.attachListener(form, 'input', (e) => {
            const input = e.target;
            if (input?.tagName !== 'INPUT' || input.type === 'checkbox') return;
            this.#fieldClear(input);
            this.clearError(); // clear any stale server-side message too
        });
    }

    #attachRegisterListeners() {
        const passwordInput = this.querySelector('input[name="password"]');
        if (passwordInput) {
            this.attachListener(passwordInput, 'input', () => this.#updatePasswordStrength());
            this.attachListener(passwordInput, 'blur', () => this.#validatePassword(true));
        }
        const emailInput = this.querySelector('input[name="email"]');
        const usernameInput = this.querySelector('input[name="username"]');
        if (emailInput) this.attachListener(emailInput, 'blur', () => this.#validateEmail());
        if (usernameInput) this.attachListener(usernameInput, 'blur', () => this.#validateUsername());

        const termsCheckbox = this.querySelector('#termsCheckbox');
        if (termsCheckbox) {
            this.attachListener(termsCheckbox, 'change', (e) => {
                this.#termsAccepted = e.target.checked;
                this.clearError();
                this.#updateSubmitState();
            });
        }
    }

    // ─── Validation & submission ──────────────────────────────────────────────

    #handleSubmit() {
        this.clearAllErrors();
        if (!this.#validateAll()) return;

        const form = this.querySelector('form');
        if (!form) return;
        const data = Object.fromEntries(new FormData(form));

        if (this.#mode === 'login') {
            this.props.eventBus.emit('authForm:submit', {
                emailOrUsername: data.loginIdentifier?.trim(),
                password: data.password,
                rememberMe: !!data.remember,
            });
        } else {
            this.props.eventBus.emit('authForm:submit', {
                email: data.email?.trim(),
                username: data.username?.trim(),
                password: data.password,
            });
        }
    }

    #validateAll() {
        if (this.#mode === 'login') {
            return this.#validateLoginIdentifier() && this.#validateLoginPassword();
        }
        const emailOk = this.#validateEmail();
        const usernameOk = this.#validateUsername();
        const passwordOk = this.#validatePassword(true);
        const termsOk = this.#validateTerms();
        return emailOk && usernameOk && passwordOk && termsOk;
    }

    /**
     * Validates the login identifier field.
     *
     * @returns {boolean}
     * @private
     */
    #validateLoginIdentifier() {
        const input = this.querySelector('input[name="loginIdentifier"]');
        const value = input?.value.trim() ?? '';

        if (!value)
            return this.#fieldError(input, 'Email or username is required.');

        if (value.length > 254)
            return this.#fieldError(input, 'Email or username cannot exceed 254 characters.');

        if (value.includes('@')) {
            // Treat as email
            if (!isValidEmail(value))
                return this.#fieldError(input, 'Please enter a valid email address.');
        } else {
            // Treat as username
            if (value.length < 3)
                return this.#fieldError(input, 'Username must be at least 3 characters.');
            if (value.length > 50)
                return this.#fieldError(input, 'Username cannot exceed 50 characters.');
            if (!/^[a-zA-Z0-9_-]+$/.test(value))
                return this.#fieldError(input, 'Username can only contain letters, numbers, hyphens, and underscores.');
        }

        this.#fieldClear(input);
        return true;
    }

    /**
     * Login password — backend only checks NotEmpty on login.
     * Complexity rules are NOT validated on login to avoid leaking password
     * policy hints and to handle accounts created before stricter rules.
     * @returns {boolean}
     * @private
     */
    #validateLoginPassword() {
        const input = this.querySelector('input[name="password"]');
        if (!input?.value) return this.#fieldError(input, 'Password is required.');
        this.#fieldClear(input);
        return true;
    }

    /**
     * Validates the registration email field.
     *
     * Mirrors RegisterRequestValidator for Email:
     *   - NotEmpty
     *   - MaximumLength(256)   ← was missing; added
     *   - EmailAddress (format)
     *
     * @returns {boolean}
     * @private
     */
    #validateEmail() {
        const input = this.querySelector('input[name="email"]');
        const email = input?.value.trim() ?? '';

        if (!email)
            return this.#fieldError(input, 'Email address is required.');
        if (email.length > 256)
            return this.#fieldError(input, 'Email address cannot exceed 256 characters.');
        if (!isValidEmail(email))
            return this.#fieldError(input, 'Please enter a valid email address.');

        this.#fieldClear(input);
        return true;
    }

    /**
     * Validates the registration username field.
     *
     * Delegates to validateUsername() utility, which must cover:
     *   - NotEmpty
     *   - Length 3–50
     *   - Chars: letters, numbers, underscores, hyphens, periods
     *   - No leading or trailing period
     * These rules mirror RegisterRequestValidator for Username.
     *
     * @returns {boolean}
     * @private
     */
    #validateUsername() {
        const input = this.querySelector('input[name="username"]');
        const username = input?.value.trim() ?? '';
        const result = validateUsername(username);
        if (!result.isValid)
            return this.#fieldError(input, result.feedback?.[0] || 'Please enter a valid username.');
        this.#fieldClear(input);
        return true;
    }

    /**
     * Validates the registration password field.
     *
     * Delegates to isValidatePassword() utility, which must cover:
     *   - NotEmpty
     *   - Length 8–128
     *   - At least one uppercase letter
     *   - At least one lowercase letter
     *   - At least one digit
     *   - At least one special character
     * These rules mirror RegisterRequestValidator for Password.
     *
     * @param {boolean} showFeedback  True when validating on submit or blur.
     * @returns {boolean}
     * @private
     */
    #validatePassword(showFeedback = false) {
        const input = this.querySelector('input[name="password"]');
        const password = input?.value ?? '';
        const result = isValidatePassword(password);
        if (!result.isValid) {
            if (showFeedback)
                this.#fieldError(input, result.feedback?.[0] || 'Password does not meet the requirements.');
            return false;
        }
        this.#fieldClear(input);
        return true;
    }

    #validateTerms() {
        if (!this.#termsAccepted) {
            this.showError('You must accept the Terms of Service to continue.');
            return false;
        }
        return true;
    }

    // ─── Error helpers ────────────────────────────────────────────────────────

    /**
     * Mark a field invalid and show its inline error.
     * Visibility via .show class — same mechanism as showError() / clearError().
     * Convention: field error element id = "{input.id}-error"
     * Always returns false: return this.#fieldError(input, msg)
     * @private
     */
    #fieldError(input, message) {
        if (input) {
            input.setAttribute('aria-invalid', 'true');
            input.classList.add('input-error');
            const el = this.querySelector(`#${input.id}-error`);
            if (el) {
                el.textContent = message;
                el.classList.add('show');
            }
        }
        return false;
    }

    /** Clear a field's invalid state and hide its inline error. @private */
    #fieldClear(input) {
        if (!input) return;
        input.removeAttribute('aria-invalid');
        input.classList.remove('input-error');
        const el = this.querySelector(`#${input.id}-error`);
        if (el) {
            el.textContent = '';
            el.classList.remove('show');
        }
    }

    // ─── Password toggle ──────────────────────────────────────────────────────

    #togglePasswordVisibility(toggleBtn) {
        const id = toggleBtn.getAttribute('aria-controls');
        const input = id ? this.querySelector(`#${id}`) : this.querySelector('input[type="password"]');
        const icon = toggleBtn.querySelector('i');
        if (!input || !icon) return;
        const isHidden = input.type === 'password';
        input.type = isHidden ? 'text' : 'password';
        toggleBtn.setAttribute('aria-pressed', String(isHidden));
        toggleBtn.setAttribute('aria-label', isHidden ? 'Hide password' : 'Show password');
        icon.className = isHidden ? 'fa-regular fa-eye-slash' : 'fa-regular fa-eye';
        input.focus();
    }

    // ─── Password strength ────────

    /** Score 0–4. Identical algorithm to ChangePasswordForm._scorePassword(). @private */
    #scorePassword(pw) {
        let score = 0;
        if (!pw) return 0;
        if (pw.length >= 8) score++;
        if (pw.length >= 12) score++;
        if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
        if (/\d/.test(pw)) score++;
        if (/[^A-Za-z0-9]/.test(pw)) score++;
        return Math.min(4, score);
    }

    /** Update 4-segment bar and label, then refresh a submit-gate. @private */
    #updatePasswordStrength() {
        const pw = this.querySelector('input[name="password"]')?.value || '';
        const score = this.#scorePassword(pw);
        const LABELS = ['', 'Weak', 'Fair', 'Good', 'Strong'];
        const COLORS = ['', 'sf-bar--red', 'sf-bar--orange', 'sf-bar--yellow', 'sf-bar--green'];
        for (let i = 1; i <= 4; i++) {
            const bar = this.querySelector(`#regBar${i}`);
            if (bar) bar.className = `sf-strength-bar${i <= score ? ` ${COLORS[score]}` : ''}`;
        }
        const label = this.querySelector('#regStrengthLabel');
        if (label) label.textContent = pw ? (LABELS[score] || 'Weak') : '—';
        this.#updateSubmitState();
    }

    /** Gate submit on password validity and terms. Uses isValidatePassword(), not bar score. @private */
    #updateSubmitState() {
        const btn = this.querySelector('button[type="submit"]');
        const password = this.querySelector('input[name="password"]')?.value || '';
        const {isValid} = isValidatePassword(password);
        if (btn) btn.disabled = !this.#termsAccepted || !isValid;
    }
}