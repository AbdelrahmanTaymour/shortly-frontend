/**
 * RegisterPage — Creates a new user account.
 */

import BasePage from '../../BasePage.js';
import AuthForm from '../../../features/Auth/AuthForm/AuthForm.js';

export default class RegisterPage extends BasePage {

    /** @type {AuthForm|null} */
    #authForm = null;

    async mount() {
        await super.mount();

        this.#authForm = new AuthForm(
            this.querySelector('.auth-form-container'),
            {mode: 'register', store: this.store, eventBus: this.eventBus}
        );
        await this.#authForm.mount();

        this.registerComponent(this.#authForm);

        this.trackStoreSubscription(
            this.store.subscribe('auth', ({isLoading}) => {
                this.#authForm?.setSubmitDisabled(isLoading);
            })
        );

        this.trackBusListener(
            this.eventBus.on('authForm:submit', this.#handleSubmit.bind(this))
        );
        this.trackBusListener(
            this.eventBus.on('authForm:oauthRequest', this.#handleOAuthRequest.bind(this))
        );
    }

    // ─── Private ──────────────────────────────────────────────────────────────

    /**
     * @param {{ email: string, username: string, password: string }} payload
     */
    async #handleSubmit({email, username, password}) {
        const authService = this.getService('auth');
        if (authService.isLoading) return;

        try {
            await authService.register({email, username, password});
            this.getService('router').navigate('/home');
        } catch (error) {
            this.#authForm?.showError(
                error.message || 'Registration failed. Please check your details and try again.'
            );
        }
    }

    /** @param {{ provider: string }} payload */
    #handleOAuthRequest({provider}) {
        if (provider === 'google') this.getService('auth').initiateGoogleOAuth();
    }
}