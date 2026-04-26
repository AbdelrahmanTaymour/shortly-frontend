/**
 * SettingsApi — Account-Settings HTTP endpoints.
 *
 * Location: src/infrastructure/http/SettingsApi.js
 *
 * RESPONSIBILITY: HTTP transport for Settings endpoints only.
 * ALLOWED:   POST/GET to Settings endpoints · return plain JS objects
 * FORBIDDEN: Business logic · state management · service imports
 */
export default class SettingsApi {
    /**
     * @param {import('./ApiClient.js').ApiClient} apiClient
     */
    constructor(apiClient) {
        this.apiClient = apiClient;
    }

    // ─── Password ─────────────────────────────────────────────────────────────

    /**
     * @param {{ currentPassword: string, newPassword: string, confirmPassword: string }} payload
     * @returns {Promise<{ success: boolean, message: string }>}
     */
    async changePassword(payload) {
        const response = await this.apiClient.post('/api/auth/change-password', {
            currentPassword: payload.currentPassword,
            newPassword: payload.newPassword,
            confirmPassword: payload.confirmPassword,
        });
        return response.data;
    }

    // ─── Email change ─────────────────────────────────────────────────────────

    /**
     * @param {{ newEmail: string, password: string }} payload
     * @returns {Promise<{ success: boolean, message: string }>}
     */
    async changeEmail(payload) {
        const response = await this.apiClient.post('/api/auth/change-email', {
            newEmail: payload.newEmail,
            password: payload.password,
        });
        return response.data;
    }

    /**
     * @param {string} token
     * @returns {Promise<{ success: boolean, message: string }>}
     */
    async confirmEmailChange(token) {
        const response = await this.apiClient.post('/api/auth/confirm-email-change', {token});
        return response.data;
    }

    // ─── Email verification ───────────────────────────────────────────────────

    /**
     * @param {string|null} email — uses current user's email when null
     * @returns {Promise<{ emailSent: boolean, message: string }>}
     */
    async sendEmailVerification(email = null) {
        const response = await this.apiClient.post('/api/auth/send-email-verification', {email});
        return response.data;
    }

    // ─── Security status ──────────────────────────────────────────────────────

    /**
     * @param {string} userId
     * @returns {Promise<Object>} UserSecurityStatusResponse
     */
    async getUserSecurityStatus(userId) {
        const response = await this.apiClient.get(`/api/users/${encodeURIComponent(userId)}/security/status`);
        return response.data;
    }
}