/**
 * LoginPage — Authenticates an existing user.
 *
 * RESPONSIBILITY: Mount AuthForm, pass callbacks, navigate on success.
 *
 * ALLOWED:   Subscribe to Auth store · call authService.login() · navigate
 * FORBIDDEN: Validation · form rendering · global document.getElementById()
 */

import BasePage from '../../BasePage.js';
import AuthForm from '../../../features/Auth/AuthForm/AuthForm.js';

export default class LoginPage extends BasePage {

    /** @type {AuthForm|null} */
    #authForm = null;

    async mount() {
        await super.mount();

        this.#authForm = new AuthForm(
            this.querySelector('.auth-form-container'),
            {mode: 'login', store: this.store, eventBus: this.eventBus}
        );
        await this.#authForm.mount();

        // Register so BasePage.destroyComponents() handles teardown automatically.
        this.registerComponent(this.#authForm);

        // Track → super.unmount() calls unsub automatically.
        this.trackStoreSubscription(
            this.store.subscribe('auth', ({isLoading}) => {
                this.#authForm?.setSubmitDisabled(isLoading);
            })
        );

        // trackBusListener is critical: without it, every navigation away-and-back
        // stacks another handler. The stale handler holds a destroyed #authForm, so
        // showError() silently no-ops and any navigate() call in it fires regardless
        // of whether login succeeded — producing the "silent redirect" bug.
        this.trackBusListener(
            this.eventBus.on('authForm:submit', this.#handleSubmit.bind(this))
        );
        this.trackBusListener(
            this.eventBus.on('authForm:oauthRequest', this.#handleOAuthRequest.bind(this))
        );
    }

    // ─── Private ──────────────────────────────────────────────────────────────

    /**
     * AuthService.login() re-throws on any failure (wrong password, network error,
     * server 4xx/5xx). The catch block here is the single place that receives that
     * error and forwards it to the form — never navigate on failure.
     *
     * @param {{ emailOrUsername: string, password: string, rememberMe: boolean }} payload
     */
    async #handleSubmit({emailOrUsername, password, rememberMe}) {
        const authService = this.getService('auth');
        if (authService.isLoading) return;

        try {
            await authService.login({emailOrUsername, password, rememberMe});
            this.getService('router').navigate('/home');
        } catch (error) {
            // AuthForm.showError() uses classList.add('show') so this is now visible.
            this.#authForm?.showError(
                error.message || 'Incorrect email/username or password. Please try again.'
            );
        }
    }

    /** @param {{ provider: string }} payload */
    #handleOAuthRequest({provider}) {
        const rememberMe = this.#authForm?.getRememberMe() ?? false;
        if (provider === 'google') this.getService('auth').initiateGoogleOAuth(rememberMe);
    }
}