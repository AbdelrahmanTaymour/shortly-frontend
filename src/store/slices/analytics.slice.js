/**
 * Analytics.slice — Initial state shape for the Analytics dashboard.
 *
 * OWNED BY: AnalyticsService (ONLY AnalyticsService calls store.dispatch('Analytics', ...))
 * READ BY:  AnalyticsPage
 *
 * ─── STATE SHAPE ─────────────────────────────────────────────────────────────
 *
 * preset / dateRange:
 *   The currently selected date filter.
 *
 * overview:
 *   UserOverview { overview: UserOverviewMetrics, topCountry, topReferrer }
 *   Fetched on mount alongside timeSeries.
 *
 * timeSeries:
 *   TimeSeriesStats. Fetched on mount alongside overview.
 *
 * engagement:
 *   EngagementMetrics — the GROUP BY SessionId result.
 *   null until the Engagement panel first renders (auto-triggered on mount,
 *   but dispatched asynchronously so it never blocks the initial paint).
 *
 * topUrls:
 *   UserTopUrls { topUrls: TopPerformingUrl[] }
 *   null until the Top URLs tab is first activated.
 *
 * geography / traffic / devices:
 *   Lazy-fetched on first tab activation. null until that tab is visited.
 *   Reset to null when the date range changes.
 *
 * isLoading / error:
 *   Meta state for the page skeleton and error banner.
 *
 * ─── WRITE RULES ─────────────────────────────────────────────────────────────
 *   ✅ AnalyticsService.loadDashboardData()  → writes overview, timeSeries
 *   ✅ AnalyticsService.loadLazySlice()      → writes engagement | topUrls |
 *                                              geography | traffic | devices
 *   ✅ AnalyticsService.invalidateMyStats()  → resets all data fields to null
 *   ✅ AnalyticsService.resetLazyData()      → resets all lazy fields to null
 *   ❌ AnalyticsPage (or any page/component) MUST NOT call store.dispatch('Analytics', ...)
 */
export function createAnalyticsSlice() {
    return {
        // ── Date selection ─────────────────────────────────────────────────────
        /** @type {'7d'|'30d'|'90d'|'all'} */
        preset: '30d',

        /** @type {{ startDate: string|null, endDate: string|null }|null} */
        dateRange: null,

        /** @type {UserOverview|null} { overview: UserOverviewMetrics, topCountry, topReferrer } */
        overview: null,

        /** @type {TimeSeriesStats|null} */
        timeSeries: null,

        // ── Lazy-fetched slices (null until first triggered) ──────────────────

        /**
         * @type {EngagementMetrics|null}
         */
        engagement: null,

        /**
         * @type {{ topUrls: TopPerformingUrl[] }|null}
         */
        topUrls: null,

        /** @type {GeographicalStats|null} */
        geography: null,

        /** @type {TrafficStats|null} */
        traffic: null,

        /** @type {DeviceStats|null} */
        devices: null,

        // ── Meta ──────────────────────────────────────────────────────────────
        /** True while the core parallel fetch (overview + timeSeries) is in-flight. */
        isLoading: false,

        /** Last error message from a failed core load. null when healthy. */
        error: null,
    };
}