/**
 * AnalyticsApi — Statistics & Analytics API endpoints.
 */
class AnalyticsApi {
    constructor(apiClient) {
        this.apiClient = apiClient;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PER-URL SLICE ENDPOINTS
    // ─────────────────────────────────────────────────────────────────────────

    /** Lightweight: core metrics + time-windows + top country + top referrer. No session grouping. */
    async getLinkOverview(shortUrlId, range = {}) {
        const res = await this.apiClient.get(
            `/api/statistics/urls/${shortUrlId}/overview${this._dateQs(range)}`
        );
        return res.data;
    }

    /**
     * SESSION-LEVEL engagement for a single URL.
     * Heavy — GROUP BY SessionId CTE. Deferred to Engagement panel.
     * @param {number} shortUrlId
     * @param {{ startDate?: string, endDate?: string }} [range]
     * @returns {Promise<EngagementMetrics>}
     */
    async getLinkEngagement(shortUrlId, range = {}) {
        const res = await this.apiClient.get(
            `/api/statistics/urls/${shortUrlId}/engagement${this._dateQs(range)}`
        );
        return res.data;
    }

    /** Daily trend + day-of-week distribution. Fetched with overview on page load. */
    async getLinkTimeSeries(shortUrlId, range = {}) {
        const res = await this.apiClient.get(
            `/api/statistics/urls/${shortUrlId}/timeseries${this._dateQs(range)}`
        );
        return res.data;
    }

    /** Country + city breakdown. Lazy-loaded on Countries tab activation. */
    async getLinkGeography(shortUrlId, range = {}) {
        const res = await this.apiClient.get(
            `/api/statistics/urls/${shortUrlId}/geography${this._dateQs(range)}`
        );
        return res.data;
    }

    /** Traffic sources, referrers, UTM. Lazy-loaded on Traffic tab activation. */
    async getLinkTraffic(shortUrlId, range = {}) {
        const res = await this.apiClient.get(
            `/api/statistics/urls/${shortUrlId}/traffic${this._dateQs(range)}`
        );
        return res.data;
    }

    /** Device types, browsers, OS. Lazy-loaded on Devices tab activation. */
    async getLinkDevices(shortUrlId, range = {}) {
        const res = await this.apiClient.get(
            `/api/statistics/urls/${shortUrlId}/devices${this._dateQs(range)}`
        );
        return res.data;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PER-USER SLICE ENDPOINTS
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Lightweight: URL portfolio shape + click totals + quick signals.
     * No session grouping. No per-URL ranking.
     * @returns {Promise<UserOverview>} { overview: UserOverviewMetrics, topCountry, topReferrer }
     */
    async getMyOverview(range = {}) {
        const res = await this.apiClient.get(
            `/api/statistics/my-stats/overview${this._dateQs(range)}`
        );
        return res.data;
    }

    /**
     * SESSION-LEVEL engagement across all user URLs.
     * Heavy — GROUP BY SessionId CTE. Deferred; auto-triggered after first paint.
     * @returns {Promise<EngagementMetrics>}
     */
    async getMyEngagement(range = {}) {
        const res = await this.apiClient.get(
            `/api/statistics/my-stats/engagement${this._dateQs(range)}`
        );
        return res.data;
    }

    /**
     * Top 10 URLs ranked by clicks. Portfolio health combined in one query.
     * Heavy — 5-CTE chain. Deferred to Top URLs tab activation.
     * @returns {Promise<UserTopUrls>} { topUrls: TopPerformingUrl[] }
     */
    async getMyTopUrls(range = {}) {
        const res = await this.apiClient.get(
            `/api/statistics/my-stats/top-urls${this._dateQs(range)}`
        );
        return res.data;
    }

    /** Aggregated daily trend across all user URLs. Fetched with overview on mount. */
    async getMyTimeSeries(range = {}) {
        const res = await this.apiClient.get(
            `/api/statistics/my-stats/timeseries${this._dateQs(range)}`
        );
        return res.data;
    }

    /** Aggregated geo breakdown. Lazy-loaded on Geography tab. */
    async getMyGeography(range = {}) {
        const res = await this.apiClient.get(
            `/api/statistics/my-stats/geography${this._dateQs(range)}`
        );
        return res.data;
    }

    /** Aggregated traffic sources. Lazy-loaded on Traffic tab. */
    async getMyTraffic(range = {}) {
        const res = await this.apiClient.get(
            `/api/statistics/my-stats/traffic${this._dateQs(range)}`
        );
        return res.data;
    }

    /** Aggregated device breakdown. Lazy-loaded on Devices tab. */
    async getMyDevices(range = {}) {
        const res = await this.apiClient.get(
            `/api/statistics/my-stats/devices${this._dateQs(range)}`
        );
        return res.data;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // LEGACY / UNCHANGED
    // ─────────────────────────────────────────────────────────────────────────

    async getLinkStats(shortUrlId, {startDate, endDate} = {}) {
        const res = await this.apiClient.get(
            `/api/statistics/urls/${shortUrlId}${this._dateQs({startDate, endDate})}`
        );
        return res.data;
    }

    async getTotalUrlCount(activeOnly = false) {
        const res = await this.apiClient.get(
            `/api/short-urls/analytics/total-count?activeOnly=${activeOnly}`
        );
        return res.data;
    }

    async getTotalClicks(shortUrlId) {
        const res = await this.apiClient.get(
            `/api/short-urls/analytics/${shortUrlId}/total-clicks`
        );
        return res.data;
    }

    async getMostPopularUrls(params = {}) {
        const qs = new URLSearchParams(
            Object.fromEntries(Object.entries(params).filter(([, v]) => v != null))
        ).toString();
        const res = await this.apiClient.get(
            `/api/short-urls/analytics/most-popular${qs ? '?' + qs : ''}`
        );
        return res.data;
    }

    async getUserAnalyticsSummary(userId) {
        const res = await this.apiClient.get(
            `/api/short-urls/analytics/user/${userId}/summary`
        );
        return res.data;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Private helpers
    // ─────────────────────────────────────────────────────────────────────────

    _dateQs({startDate, endDate} = {}) {
        const p = {};
        if (startDate) p.startDate = startDate;
        if (endDate) p.endDate = endDate;
        const qs = new URLSearchParams(p).toString();
        return qs ? '?' + qs : '';
    }
}

export default AnalyticsApi;