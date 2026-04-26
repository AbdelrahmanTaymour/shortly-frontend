/**
 * AuthApi — /auth/* and /user/current-user HTTP endpoints.
 *
 * RESPONSIBILITY: HTTP transport for authentication endpoints only.
 *
 * ALLOWED:   POST/GET to auth endpoints · return plain JS objects
 * FORBIDDEN: Business logic · token storage · service imports · DOM access
 */

import apiConfig from '../../config/api.config.js';

export default class AuthApi {
    /** @param {import('./ApiClient.js').ApiClient} apiClient */
    constructor(apiClient) {
        this.apiClient = apiClient;
    }

    // ─── Private helper ───────────────────────────────────────────────────────

    /** Resolves a dot-notation endpoint key to a URL path string. */
    #url(keyPath) {
        const keys = keyPath.split('.');
        let value  = apiConfig.endpoints;
        for (const k of keys) value = value?.[k];
        if (!value) throw new Error(`AuthApi: No endpoint configured for "${keyPath}"`);
        return value;
    }

    // ─── Public API ───────────────────────────────────────────────────────────

    /**
     * Register a new user.
     * The server sets the HttpOnly refreshToken cookie in the response.
     * The returned body contains only the access token and user info.
     */
    async register(payload) {
        const response = await this.apiClient.post(this.#url('auth.register'), payload);
        return response.data;
    }

    /**
     * Log in with email/username + password.
     * The server sets the HttpOnly refreshToken cookie in the response.
     * The returned body contains only the access token and user info.
     */
    async login(payload) {
        const response = await this.apiClient.post(this.#url('auth.login'), payload);
        return response.data;
    }

    /**
     * Log out the current session.
     * The server reads the HttpOnly cookie, revokes the token, then clears
     * the cookie. No request body is needed.
     */
    async logout() {
        const response = await this.apiClient.post(this.#url('auth.logout'));
        return response.data;
    }

    /**
     * Exchange the HttpOnly refresh-token cookie for a new access token.
     *
     * No request body — the browser sends the HttpOnly cookie automatically
     * because ApiClient uses credentials: 'include' on every fetch call.
     *
     * The server:
     *   1. Reads the 'refreshToken' HttpOnly cookie.
     *   2. Validates and rotates it (issues a new one, revokes the old one).
     *   3. Sets the new refresh token as a fresh HttpOnly cookie.
     *   4. Returns { accessToken, accessTokenExpiry, … } in the response body.
     *
     * The frontend stores only the access token — in memory, never in storage.
     */
    async refreshToken() {
        const response = await this.apiClient.post(this.#url('auth.refreshToken'));
        return response.data;
    }

    /**
     * Fetch the currently authenticated user's profile.
     * Called immediately after login/register and on session restore.
     */
    async getCurrentUser() {
        const response = await this.apiClient.get(this.#url('user.getCurrentUser'));
        return response.data;
    }

    /**
     * Request a password-reset email.
     * @param {string} email
     */
    async requestPasswordReset(email) {
        const response = await this.apiClient.post(this.#url('account.forgotPassword'), { email });
        return response.data;
    }

    /**
     * Complete a password reset using the token from the email link.
     */
    async resetPassword({ token, newPassword }) {
        const response = await this.apiClient.post(this.#url('account.resetPassword'), {
            token,
            newPassword,
        });
        return response.data;
    }
}