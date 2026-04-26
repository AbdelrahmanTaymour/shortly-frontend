/**
 * AnalyticsService — Analytics business logic.
 *
 * RESPONSIBILITY: Fetch Analytics metrics from AnalyticsApi, write results to
 *                 the 'Analytics' store slice, cache per-link slices.
 *
 * ALLOWED: Call AnalyticsApi · dispatch to store · emit events · cache data
 * FORBIDDEN: DOM access · import mock data · import from src/ui/
 */

import {getDateRange} from '../ui/features/Analytics/StatsDateFilter/StatsDateFilter.js';

export default class AnalyticsService {

    /** @type {Map<string, *>} per-link, per-metric, per-range cache */
    #linkMetricCache = new Map();

    /**
     * @param {import('../infrastructure/http/AnalyticsApi.js').default} analyticsApi
     * @param {import('../store/Store.js').Store}                        store
     * @param {import('../app/EventBus.js').default}                     eventBus
     */
    constructor(analyticsApi, store, eventBus) {
        this.analyticsApi = analyticsApi;
        this.store = store;
        this.eventBus = eventBus;
    }

    // ─── Private helpers ──────────────────────────────────────────────────────

    #linkMetricKey(linkId, metric, range = {}) {
        return `${linkId}::${metric}::${range.startDate || ''}::${range.endDate || ''}`;
    }

    #handleError(context, error) {
        console.error(`AnalyticsService: Error fetching ${context}:`, error);
        throw error;
    }

    // ═════════════════════════════════════════════════════════════════════════
    // HIGH-LEVEL PAGE-FACING METHODS — write to the store
    // ═════════════════════════════════════════════════════════════════════════

    /**
     * Fetch the two core always-visible slices and dispatch to store.
     * Called on mount and on every date-preset change.
     *
     * FIXED: removed the broken `topLinks` extraction that read `overview.status`
     * after overview was already resolved (overview is not a PromiseSettledResult).
     * topLinks sourcing is now the responsibility of loadLazySlice('topUrls').
     *
     * @param {string} preset — '7d'|'30d'|'90d'|'all'
     */
    async loadDashboardData(preset = '30d') {
        const range = getDateRange(preset);

        this.store.dispatch('analytics', prev => ({
            ...prev,
            preset,
            dateRange: range,
            isLoading: true,
            error: null,
        }));

        const [overviewResult, timeSeriesResult] = await Promise.allSettled([
            this.#fetchMyOverview(range),
            this.#fetchMyTimeSeries(range),
        ]);

        const overview = overviewResult.status === 'fulfilled' ? overviewResult.value : null;
        const timeSeries = timeSeriesResult.status === 'fulfilled' ? timeSeriesResult.value : null;

        this.store.dispatch('analytics', prev => ({
            ...prev,
            overview,
            timeSeries,
            isLoading: false,
            error: overviewResult.status === 'rejected'
                ? (overviewResult.reason?.message ?? 'Failed to load overview')
                : null,
        }));
    }

    /**
     * Fetch a single lazy slice and dispatch it to the store.
     * Called by AnalyticsPage on tab activation or auto-trigger (engagement).
     *
     * @param {'engagement'|'topUrls'|'geography'|'traffic'|'devices'} sliceName
     */
    async loadLazySlice(sliceName) {
        const {dateRange} = this.store.getState('analytics');
        const range = dateRange ?? getDateRange('30d');

        const fetchMap = {
            engagement: () => this.analyticsApi.getMyEngagement(range),
            topUrls: () => this.analyticsApi.getMyTopUrls(range),
            geography: () => this.analyticsApi.getMyGeography(range),
            traffic: () => this.analyticsApi.getMyTraffic(range),
            devices: () => this.analyticsApi.getMyDevices(range),
        };

        const fetcher = fetchMap[sliceName];
        if (!fetcher) throw new Error(`AnalyticsService.loadLazySlice: unknown slice "${sliceName}"`);

        try {
            const data = await fetcher();
            this.store.dispatch('analytics', prev => ({
                ...prev,
                [sliceName]: data ?? this.#emptyForSlice(sliceName),
            }));
        } catch (err) {
            console.error(`AnalyticsService: Failed to load "${sliceName}":`, err);
            this.store.dispatch('analytics', prev => ({
                ...prev,
                [sliceName]: this.#emptyForSlice(sliceName),
            }));
            throw err;
        }
    }

    /**
     * Reset all lazy slices to null so they re-fetch on next activation.
     * Called after a date-range change.
     */
    resetLazyData() {
        this.store.dispatch('analytics', prev => ({
            ...prev,
            engagement: null,
            topUrls: null,
            geography: null,
            traffic: null,
            devices: null,
        }));
    }

    /**
     * Evict all user Analytics from the store.
     * Call when the user's URL portfolio changes (link created/deleted).
     */
    invalidateMyStats() {
        this.store.dispatch('analytics', prev => ({
            ...prev,
            overview: null,
            timeSeries: null,
            engagement: null,
            topUrls: null,
            geography: null,
            traffic: null,
            devices: null,
        }));
    }

    /**
     * Full reset — link cache + all store slices.
     * Use only on logout or full application resets.
     */
    invalidateAll() {
        this.#linkMetricCache.clear();
        this.store.dispatch('analytics', prev => ({
            ...prev,
            overview: null,
            timeSeries: null,
            engagement: null,
            topUrls: null,
            geography: null,
            traffic: null,
            devices: null,
            error: null,
        }));
    }

    // ═════════════════════════════════════════════════════════════════════════
    // PER-LINK METRIC METHODS
    // Do NOT write to the store — link stats are page-scoped (LinkStatsPage).
    // Return data directly for the page to hold and cache.
    // ═════════════════════════════════════════════════════════════════════════

    async getMyOverview(range = {}) {
        try {
            const data = await this.analyticsApi.getMyOverview(range);
            return data ?? this.emptyUserOverview();
        } catch (e) {
            this.#handleError('my overview', e);
        }
    }

    /** Core metrics + time-windows + top country/referrer. No session grouping. */
    async getLinkOverview(linkId, range = {}) {
        if (!linkId) throw new Error('AnalyticsService.getLinkOverview: linkId is required');
        const key = this.#linkMetricKey(linkId, 'overview', range);
        if (this.#linkMetricCache.has(key)) return this.#linkMetricCache.get(key);
        try {
            const data = await this.analyticsApi.getLinkOverview(linkId, range);
            const result = data ?? this.emptyLinkOverview();
            this.#linkMetricCache.set(key, result);
            return result;
        } catch (e) {
            this.#handleError(`link overview for ${linkId}`, e);
        }
    }

    /**
     * Session-level engagement for a single URL.
     * NEW — deferred to Engagement tab (was previously bundled with overview).
     */
    async getLinkEngagement(linkId, range = {}) {
        if (!linkId) throw new Error('AnalyticsService.getLinkEngagement: linkId is required');
        const key = this.#linkMetricKey(linkId, 'engagement', range);
        if (this.#linkMetricCache.has(key)) return this.#linkMetricCache.get(key);
        try {
            const data = await this.analyticsApi.getLinkEngagement(linkId, range);
            const result = data ?? this.emptyEngagement();
            this.#linkMetricCache.set(key, result);
            return result;
        } catch (e) {
            this.#handleError(`link engagement for ${linkId}`, e);
        }
    }

    /** Daily trend + day-of-week. Fetched with overview on page load. */
    async getLinkTimeSeries(linkId, range = {}) {
        if (!linkId) throw new Error('AnalyticsService.getLinkTimeSeries: linkId is required');
        const key = this.#linkMetricKey(linkId, 'timeseries', range);
        if (this.#linkMetricCache.has(key)) return this.#linkMetricCache.get(key);
        try {
            const data = await this.analyticsApi.getLinkTimeSeries(linkId, range);
            const result = data ?? this.emptyTimeSeries();
            this.#linkMetricCache.set(key, result);
            return result;
        } catch (e) {
            this.#handleError(`link timeseries for ${linkId}`, e);
        }
    }

    /** Geography. Lazy-loaded on Countries tab. */
    async getLinkGeography(linkId, range = {}) {
        if (!linkId) throw new Error('AnalyticsService.getLinkGeography: linkId is required');
        const key = this.#linkMetricKey(linkId, 'geography', range);
        if (this.#linkMetricCache.has(key)) return this.#linkMetricCache.get(key);
        try {
            const data = await this.analyticsApi.getLinkGeography(linkId, range);
            const result = data ?? this.emptyGeography();
            this.#linkMetricCache.set(key, result);
            return result;
        } catch (e) {
            this.#handleError(`link geography for ${linkId}`, e);
        }
    }

    /** Traffic sources. Lazy-loaded on Traffic tab. */
    async getLinkTraffic(linkId, range = {}) {
        if (!linkId) throw new Error('AnalyticsService.getLinkTraffic: linkId is required');
        const key = this.#linkMetricKey(linkId, 'traffic', range);
        if (this.#linkMetricCache.has(key)) return this.#linkMetricCache.get(key);
        try {
            const data = await this.analyticsApi.getLinkTraffic(linkId, range);
            const result = data ?? this.emptyTraffic();
            this.#linkMetricCache.set(key, result);
            return result;
        } catch (e) {
            this.#handleError(`link traffic for ${linkId}`, e);
        }
    }

    /** Devices. Lazy-loaded on Devices tab. */
    async getLinkDevices(linkId, range = {}) {
        if (!linkId) throw new Error('AnalyticsService.getLinkDevices: linkId is required');
        const key = this.#linkMetricKey(linkId, 'devices', range);
        if (this.#linkMetricCache.has(key)) return this.#linkMetricCache.get(key);
        try {
            const data = await this.analyticsApi.getLinkDevices(linkId, range);
            const result = data ?? this.emptyDevices();
            this.#linkMetricCache.set(key, result);
            return result;
        } catch (e) {
            this.#handleError(`link devices for ${linkId}`, e);
        }
    }

    /**
     * Evict all cached metric slices for a specific link.
     * @param {string|number} linkId
     */
    invalidateLink(linkId) {
        const prefix = `${linkId}::`;
        for (const key of this.#linkMetricCache.keys()) {
            if (key.startsWith(prefix)) this.#linkMetricCache.delete(key);
        }
    }

    // ═════════════════════════════════════════════════════════════════════════
    // PRIVATE USER-LEVEL FETCH HELPERS
    // ═════════════════════════════════════════════════════════════════════════

    async #fetchMyOverview(range = {}) {
        try {
            const data = await this.analyticsApi.getMyOverview(range);
            return data ?? this.emptyUserOverview();
        } catch (e) {
            this.#handleError('my overview', e);
        }
    }

    async #fetchMyTimeSeries(range = {}) {
        try {
            const data = await this.analyticsApi.getMyTimeSeries(range);
            return data ?? this.emptyTimeSeries();
        } catch (e) {
            this.#handleError('my timeseries', e);
        }
    }

    #emptyForSlice(sliceName) {
        const map = {
            engagement: this.emptyEngagement(),
            topUrls: this.emptyTopUrls(),
            geography: this.emptyGeography(),
            traffic: this.emptyTraffic(),
            devices: this.emptyDevices(),
        };
        return map[sliceName] ?? null;
    }

    // ═════════════════════════════════════════════════════════════════════════
    // PUBLIC EMPTY-STATE FACTORIES
    // Used by pages as error / pre-load fallbacks.
    // ═════════════════════════════════════════════════════════════════════════

    /**
     * Empty UrlOverview — no engagement (engagement is a separate endpoint now).
     * Matches: { overview: OverviewMetrics, topCountry, topReferrer }
     */
    emptyLinkOverview() {
        return {
            overview: {
                totalClicks: 0, uniqueClicks: 0, activeDays: 0,
                averageClicksPerDay: 0, clickThroughRate: 0,
                firstClickDate: null, lastClickDate: null,
                clicksToday: 0, clicksThisWeek: 0, clicksThisMonth: 0,
            },
            topCountry: null,
            topReferrer: null,
        };
    }

    /**
     * Empty UserOverview
     * Matches: { overview: UserOverviewMetrics, topCountry, topReferrer }
     */
    emptyUserOverview() {
        return {
            overview: {
                totalUrls: 0, activeUrls: 0, expiredUrls: 0, totalTrackedUrls: 0,
                firstUrlCreated: null, mostRecentUrlCreated: null,
                totalClicks: 0, uniqueClicks: 0,
                averageClicksPerUrl: 0, averageClicksPerDay: 0,
                firstClickDate: null, lastClickDate: null,
                clicksToday: 0, clicksThisWeek: 0, clicksThisMonth: 0,
            },
            topCountry: null,
            topReferrer: null,
        };
    }

    /** Empty EngagementMetrics — used for both URL and user engagement. */
    emptyEngagement() {
        return {
            bounceRate: 0, returnVisitorRate: 0,
            newVisitors: 0, returningVisitors: 0,
            averageSessionDuration: '00:00:00', clicksPerSession: 0,
        };
    }

    /** Empty UserTopUrls */
    emptyTopUrls() {
        return {topUrls: []};
    }

    emptyTimeSeries() {
        return {
            trend: [], dailyClicks: {}, bucketType: 'daily',
            clicksByDayOfWeek: {
                Sunday: 0, Monday: 0, Tuesday: 0, Wednesday: 0,
                Thursday: 0, Friday: 0, Saturday: 0,
            },
            peakDay: null, peakHour: null,
            averageClicksPerDay: 0, averageClicksPerHour: 0,
        };
    }

    emptyGeography() {
        return {topCountries: [], topCities: [], totalCountries: 0, totalCities: 0};
    }

    emptyTraffic() {
        return {
            topTrafficSources: [], topReferrers: [], topCampaigns: [],
            directTrafficPercentage: 0, searchTrafficPercentage: 0,
            socialTrafficPercentage: 0, referralTrafficPercentage: 0,
        };
    }

    emptyDevices() {
        return {
            topDeviceTypes: [], topBrowsers: [], topOperatingSystems: [],
            mobilePercentage: 0, desktopPercentage: 0, tabletPercentage: 0,
        };
    }
}