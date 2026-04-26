/**
 * ProfileApi — /api/Profile/* HTTP endpoints.
 *
 * Location: src/infrastructure/http/ProfileApi.js
 *
 * RESPONSIBILITY: HTTP transport for Profile endpoints only.
 * ALLOWED: GET/PUT/DELETE to Profile endpoints · return plain JS objects
 * FORBIDDEN: Business logic · state management · service imports
 */

export default class ProfileApi {
    /**
     * @param {import('./ApiClient.js').ApiClient} apiClient
     */
    constructor(apiClient) {
        this.apiClient = apiClient;
    }

    // ─── Profile ──────────────────────────────────────────────────────────────

    /**
     * Fetch the current user's full Profile.
     * @returns {Promise<Object>}
     */
    async getProfile() {
        const response = await this.apiClient.get('/api/profile');
        return response.data;
    }

    /**
     * Update mutable Profile fields.
     *
     * @param {Object}      data
     * @param {string|null} [data.name]
     * @param {string|null} [data.bio]
     * @param {string|null} [data.phoneNumber]
     * @param {string|null} [data.profilePictureUrl]
     * @param {string|null} [data.website]
     * @param {string|null} [data.company]
     * @param {string|null} [data.location]
     * @param {string|null} [data.country]
     * @param {string|null} [data.timeZone]
     * @returns {Promise<boolean>}
     */
    async updateProfile(data) {
        const response = await this.apiClient.put('/api/profile/update', data);
        return response.data;
    }

    // ─── Quota ────────────────────────────────────────────────────────────────

    /**
     * Fetch the current user's quota / usage limits.
     * @returns {Promise<Object>}
     */
    async getQuotaStatus() {
        const response = await this.apiClient.get('/api/profile/quota-status');
        return response.data;
    }

    // ─── Account ──────────────────────────────────────────────────────────────

    /**
     * Initiate a soft-delete / account deletion request.
     * @returns {Promise<boolean>}
     */
    async requestAccountDeletion() {
        const response = await this.apiClient.delete('/api/profile');
        return response.data;
    }
}