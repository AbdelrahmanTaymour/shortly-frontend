/**
 * SettingsService — Account Settings business logic.
 *
 * Location: src/services/SettingsService.js
 *
 * RESPONSIBILITY: Orchestrate Settings operations, write state to the Store,
 *                 emit domain events on the EventBus.
 *
 * ALLOWED:   Call SettingsApi · dispatch to store · emit events · validate inputs
 * FORBIDDEN: DOM access · import any UI module · navigate routes
 */
export default class SettingsService {
    /**
     * @param {import('../infrastructure/http/SettingsApi.js').default} settingsApi
     * @param {import('../store/Store.js').Store}                       store
     * @param {import('../app/EventBus.js').default}                    eventBus
     */
    constructor(settingsApi, store, eventBus) {
        this.settingsApi = settingsApi;
        this.store = store;
        this.eventBus = eventBus;
    }

    // ─── Private helpers ──────────────────────────────────────────────────────

    get isLoading() {
        return this.store.getState('settings').isLoading;
    }

    get lastError() {
        return this.store.getState('settings').error;
    }

    // ─── Password ─────────────────────────────────────────────────────────────

    /** @private */
    #setLoading(isLoading) {
        this.store.dispatch('settings', prev => ({...prev, isLoading, error: null}));
    }

    // ─── Email change ─────────────────────────────────────────────────────────

    /** @private */
    #setError(message) {
        this.store.dispatch('settings', prev => ({...prev, isLoading: false, error: message}));
        this.eventBus.emit(this.eventBus.EVENTS.ERROR_OCCURRED, {
            type: 'SETTINGS_ERROR',
            message,
        });
    }

    // ─── Email verification ───────────────────────────────────────────────────

    /**
     * Change the current user's password.
     *
     * Validates locally before hitting the API to give instant feedback.
     * On success the server invalidates all sessions; USER_LOGGED_OUT fires
     * after a short delay so the UI can show a success message first.
     *
     * @param {string} currentPassword
     * @param {string} newPassword
     * @param {string} confirmPassword
     * @returns {Promise<{ success: boolean, message: string }>}
     */
    async changePassword(currentPassword, newPassword, confirmPassword) {
        // Client-side guard — business rule, not UI logic
        if (newPassword !== confirmPassword) {
            return {success: false, message: 'New passwords do not match.'};
        }
        if (newPassword.length < 8) {
            return {success: false, message: 'Password must be at least 8 characters.'};
        }

        this.#setLoading(true);
        try {
            const result = await this.settingsApi.changePassword({
                currentPassword,
                newPassword,
                confirmPassword,
            });

            this.store.dispatch('settings', prev => ({...prev, isLoading: false}));

            if (result?.success) {
                // Give the UI 2 s to show the success message before forcing logout
                setTimeout(
                    () => this.eventBus.emit(this.eventBus.EVENTS.USER_LOGGED_OUT),
                    2000
                );
            }

            return result;
        } catch (error) {
            this.#setError(error.message);
            throw error;
        }
    }

    // ─── Security status ──────────────────────────────────────────────────────

    /**
     * Initiate a two-step email-change process (sends confirmation to new address).
     *
     * @param {string} newEmail
     * @param {string} password  — current password for identity verification
     * @returns {Promise<{ success: boolean, message: string }>}
     */
    async initiateEmailChange(newEmail, password) {
        this.#setLoading(true);
        try {
            const result = await this.settingsApi.changeEmail({newEmail, password});
            this.store.dispatch('settings', prev => ({...prev, isLoading: false}));
            return result;
        } catch (error) {
            this.#setError(error.message);
            throw error;
        }
    }

    // ─── Synchronous reads ────────────────────────────────────────────────────

    /**
     * Send (or resend) an email verification link.
     *
     * @param {string|null} email — pass null to use the signed-in user's email
     * @returns {Promise<{ emailSent: boolean, message: string }>}
     */
    async sendEmailVerification(email = null) {
        this.#setLoading(true);
        try {
            const result = await this.settingsApi.sendEmailVerification(email);
            this.store.dispatch('settings', prev => ({...prev, isLoading: false}));
            return result;
        } catch (error) {
            this.#setError(error.message);
            throw error;
        }
    }

    /**
     * Fetch and store the security / lock status for a user.
     * Dispatches to the 'Settings' store slice so SecurityStatusCard
     * can subscribe and update reactively without the page holding a copy.
     *
     * @param {string} userId
     * @returns {Promise<Object>}
     */
    async getSecurityStatus(userId) {
        this.#setLoading(true);
        try {
            const securityStatus = await this.settingsApi.getUserSecurityStatus(userId);

            // FIX 2: dispatch to store instead of returning raw data to the page
            this.store.dispatch('settings', prev => ({
                ...prev,
                securityStatus,
                isLoading: false,
            }));

            return securityStatus;
        } catch (error) {
            this.#setError(error.message);
            throw error;
        }
    }

    getSecurityStatus_sync() {
        return this.store.getState('settings').securityStatus;
    }
}