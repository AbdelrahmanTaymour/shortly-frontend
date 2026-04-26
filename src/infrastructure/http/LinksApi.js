/**
 * LinksApi — /short-urls/* HTTP endpoints.
 *
 * RESPONSIBILITY: HTTP transport for link endpoints only.
 * ALLOWED:   POST/GET/PUT/DELETE to link endpoints · return plain JS objects
 * FORBIDDEN: Business logic · state management · service imports
 *
 * ─── CHANGES IN THIS REVISION ────────────────────────────────────────────────
 *
 * 1. searchLinks() ADDED.
 *    Calls the new GET /api/short-urls/query/search endpoint which handles
 *    all filter, sort, and pagination parameters in one composable query.
 *    The backend returns a PagedResult envelope:
 *      { items, totalCount, pageNumber, pageSize, totalPages, hasPrevious, hasNext }
 *    LinksService.#extractPagination() reads totalCount / totalPages / pageNumber
 *    from this shape correctly without any mapping needed here.
 *
 * 2. listUserLinks() retained for backward compatibility with other callers
 *    (expired Links page, etc.). LinksService.loadLinks() now delegates to
 *    searchLinks() for all user-scoped list operations.
 *
 * NOTE: Add the following entry to src/config/api.config.js endpoints.shortUrlQuery:
 *   search: '/api/short-urls/query/search'
 */

import apiConfig from '../../config/api.config.js';

export default class LinksApi {
    /** @param {import('./ApiClient.js').ApiClient} apiClient */
    constructor(apiClient) {
        this.apiClient = apiClient;
    }

    // ─── Single Link CRUD ─────────────────────────────────────────────────────

    async createLink(payload) {
        const response = await this.apiClient.post(apiConfig.endpoints.shortUrls.create, {
            originalUrl: payload.originalUrl,
            customShortCode: payload.customShortCode ?? null,
            clickLimit: payload.clickLimit ?? -1,
            trackingEnabled: payload.trackingEnabled ?? true,
            isPasswordProtected: payload.isPasswordProtected ?? false,
            password: payload.password ?? '',
            isPrivate: payload.isPrivate ?? false,
            expiresAt: payload.expiresAt ?? null,
            title: payload.title ?? '',
            description: payload.description ?? '',
        });
        return response.data;
    }

    async getLink(id) {
        const url = apiConfig.endpoints.shortUrls.getById.replace(':id', encodeURIComponent(id));
        const response = await this.apiClient.get(url);
        return response.data;
    }

    async getLinkByCode(shortCode) {
        const url = apiConfig.endpoints.shortUrls.getByCode.replace(':shortCode', encodeURIComponent(shortCode));
        const response = await this.apiClient.get(url);
        return response.data;
    }

    async checkCodeAvailability(shortCode) {
        const response = await this.apiClient.get(
            `${apiConfig.endpoints.shortUrls.isCodeExists}?shortCode=${encodeURIComponent(shortCode)}`
        );
        return response.data;
    }

    async updateLink(id, payload) {
        const url = apiConfig.endpoints.shortUrls.update.replace(':id', encodeURIComponent(id));
        const response = await this.apiClient.put(url, {
            originalUrl: payload.originalUrl,
            title: payload.title,
            description: payload.description,
            isPrivate: payload.isPrivate,
            expiresAt: payload.expiresAt,
            clickLimit: payload.clickLimit,
            isActive: payload.isActive,
            trackingEnabled: payload.trackingEnabled,
            isPasswordProtected: payload.isPasswordProtected,
            password: payload.password,
        });
        return response.data;
    }

    async deleteLink(id) {
        const url = apiConfig.endpoints.shortUrls.delete.replace(':id', encodeURIComponent(id));
        const response = await this.apiClient.delete(url);
        return response.data;
    }

    // ─── List / Query ─────────────────────────────────────────────────────────

    /**
     * Full-featured search endpoint — the primary method for LinksPage.
     *
     * Calls GET /api/short-urls/query/search with all filter, sort, and
     * pagination parameters. The backend returns a PagedResult envelope:
     *   { items, totalCount, pageNumber, pageSize, totalPages, hasPrevious, hasNext }
     *
     * Accepted params (all optional except userId):
     *   userId      {string}  — required, scopes results to this user
     *   pageNumber  {number}  — 1-based page index (default: 1)
     *   pageSize    {number}  — records per page (default: 20)
     *   search      {string}  — free-text against title / original URL
     *   status      {string}  — 'active' | 'inactive' | '' (all)
     *   visibility  {string}  — 'public' | 'private' | '' (all)
     *   sortBy      {string}  — 'newest' | 'oldest' | 'most-clicks' | 'least-clicks'
     *   dateFrom    {string}  — ISO date string, inclusive lower bound on CreatedAt
     *   dateTo      {string}  — ISO date string, inclusive upper bound on CreatedAt
     *
     * Empty strings, null, and undefined are omitted from the query string so
     * the backend never sees noise like `?search=&status=`.
     *
     * @param {string} userId
     * @param {Object} params
     * @returns {Promise<{ items: Object[], totalCount: number, totalPages: number, pageNumber: number, pageSize: number }>}
     */
    async searchLinks(userId, params = {}) {
        // All params are optional except userId and pagination defaults
        const query = new URLSearchParams({
            userId: userId,
            pageNumber: params.pageNumber ?? 1,
            pageSize: params.pageSize ?? 20,
        });

        // Append filter / sort params only when they carry a meaningful value.
        // This prevents `?search=&status=&visibility=` noise reaching the backend.
        const filterKeys = ['search', 'status', 'visibility', 'sortBy', 'dateFrom', 'dateTo'];
        for (const key of filterKeys) {
            const val = params[key];
            if (val !== undefined && val !== null && val !== '') {
                query.append(key, val);
            }
        }

        const endpoint = apiConfig.endpoints.shortUrlQuery.search;
        const response = await this.apiClient.get(`${endpoint}?${query.toString()}`);
        return response.data;
    }

    /**
     * Legacy list endpoint — retained for callers that don't need the full
     * filter set (e.g., an admin expired-Links view).
     * LinksService.loadLinks() now delegates to searchLinks() instead.
     *
     * @param {string} userId
     * @param {Object} params
     */
    async listUserLinks(userId, params = {}) {
        const url = apiConfig.endpoints.shortUrlQuery.getByUser
            .replace(':userId', encodeURIComponent(userId));

        const query = new URLSearchParams({
            pageNumber: params.pageNumber ?? 1,
            pageSize: params.pageSize ?? 20,
        });

        const filterKeys = ['search', 'status', 'visibility', 'sortBy', 'dateFrom', 'dateTo'];
        for (const key of filterKeys) {
            const val = params[key];
            if (val !== undefined && val !== null && val !== '') {
                query.append(key, val);
            }
        }

        const response = await this.apiClient.get(`${url}?${query.toString()}`);
        return response.data;
    }

    async listExpiredLinks(params = {}) {
        const query = new URLSearchParams({
            pageNumber: params.pageNumber ?? 1,
            pageSize: params.pageSize ?? 20,
        }).toString();
        const response = await this.apiClient.get(
            `${apiConfig.endpoints.shortUrlQuery.getExpired}?${query}`
        );
        return response.data;
    }

    // ─── Bulk Operations ──────────────────────────────────────────────────────

    async bulkCreateLinks(linksData) {
        const response = await this.apiClient.post(apiConfig.endpoints.shortUrlBulk.create, {
            requests: linksData,
        });
        return response.data;
    }

    async bulkDeleteLinks(ids) {
        const response = await this.apiClient.delete(
            apiConfig.endpoints.shortUrlBulk.delete,
            {body: {ids}}
        );
        return response.data;
    }

    async bulkActivateLinks(ids) {
        const response = await this.apiClient.put(apiConfig.endpoints.shortUrlBulk.activate, {ids});
        return response.data;
    }

    async bulkDeactivateLinks(ids) {
        const response = await this.apiClient.put(apiConfig.endpoints.shortUrlBulk.deactivate, {ids});
        return response.data;
    }

    async bulkUpdateExpiration(ids, newExpirationDate) {
        const response = await this.apiClient.put(apiConfig.endpoints.shortUrlBulk.updateExpiration, {
            ids,
            newExpirationDate,
        });
        return response.data;
    }

    async deleteExpiredLinks() {
        const response = await this.apiClient.delete(apiConfig.endpoints.shortUrlBulk.deleteExpired);
        return response.data;
    }

    // ─── Stats / Analytics ────────────────────────────────────────────────────

    async getLinkStats(id, params = {}) {
        const queryString = new URLSearchParams(params).toString();
        const endpoint = `/api/short-urls/${encodeURIComponent(id)}/stats${queryString ? '?' + queryString : ''}`;
        const response = await this.apiClient.get(endpoint);
        return response.data;
    }

    async getLinkQRCode(id, options = {}) {
        const queryString = new URLSearchParams(options).toString();
        const endpoint = `/api/short-urls/${encodeURIComponent(id)}/qr${queryString ? '?' + queryString : ''}`;
        const response = await this.apiClient.get(endpoint);
        return response.data;
    }
}