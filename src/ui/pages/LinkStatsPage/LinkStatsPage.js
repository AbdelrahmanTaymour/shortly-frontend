/**
 * LinkStatsPage — Link statistics and Analytics page.
 */

import BasePage from '../BasePage.js';
import StatsDateFilter, {getDateRange} from '../../features/Analytics/StatsDateFilter/StatsDateFilter.js';
import StatsOverviewCards from '../../features/Analytics/components/StatsOverviewCards.js';
import GeoPanel from '../../features/Analytics/components/GeoPanel.js';
import TrafficPanel from '../../features/Analytics/components/TrafficPanel.js';
import DevicesPanel from '../../features/Analytics/components/DevicesPanel.js';
import EngagementPanel from '../../features/Analytics/EngagementPanel/EngagementPanel.js';
import ClicksChart from '../../features/Analytics/ClicksChart/ClicksChart.js';

// ─── Tab config ───────────────────────────────────────────────────────────────

const TABS = [
    {key: 'summary', icon: 'fa-chart-line', label: 'Summary'},
    {key: 'geo', icon: 'fa-globe', label: 'Countries'},
    {key: 'traffic', icon: 'fa-share-nodes', label: 'Traffic'},
    {key: 'devices', icon: 'fa-mobile-screen', label: 'Devices'},
    {key: 'engagement', icon: 'fa-heart-pulse', label: 'Engagement'},
];

/**
 * Maps lazy tab key → AnalyticsService fetch method.
 * 'summary' is always-available (fetched on mount via getLinkTimeSeries).
 * All other tabs are deferred — including 'engagement' now.
 */
const LAZY_TAB_FETCH = {
    geo: 'getLinkGeography',
    traffic: 'getLinkTraffic',
    devices: 'getLinkDevices',
    // PHASE 1: engagement is now a lazy fetch, no longer bundled in overview
    engagement: 'getLinkEngagement',
};

// ─── Page class ───────────────────────────────────────────────────────────────

export default class LinkStatsPage extends BasePage {

    #linkId = null;
    #link = null;
    #overview = null;   // UrlOverview { overview, topCountry, topReferrer }
    #timeSeries = null;

    /**
     * Per-tab lazy data store.
     * Keys: 'geography' | 'traffic' | 'devices' | 'engagement'
     * @type {Map<string, *>}
     */
    #lazySliceData = new Map();

    #activeTab = 'summary';
    #activePreset = '30d';
    #dateRange = null;
    #isFetching = false;

    #dateFilter = null;
    #overviewCards = null;
    #tabComponents = {};

    constructor(container, context) {
        super(container, context);
        this.#dateRange = getDateRange('30d');
    }

    // ─── Lifecycle ────────────────────────────────────────────────────────────

    async mount() {
        await super.mount();
        try {
            this.#linkId = this.params?.id;
            if (!this.#linkId) throw new Error('Link ID is required in route params');

            this.container.innerHTML = this.#skeletonTemplate();

            await this.#fetchInitialData();

            this.container.innerHTML = this.#pageTemplate();
            this.#mountDateFilter();
            this.#mountOverviewCards();
            this.#setupTabNav();
            this.#setupBackButton();
            this.#setupBusListeners();

            if (this._statsLoadError) {
                this.showNotification(`Analytics: ${this._statsLoadError}`, 'error');
            }

            await this.#activateTab('summary', false);

        } catch (err) {
            this.#handleMountError(err);
        }
    }

    async unmount() {
        this.#dateFilter?.unmount();
        this.#overviewCards?.unmount();
        for (const comp of Object.values(this.#tabComponents)) {
            try {
                await comp?.unmount?.();
            } catch { /* ignore */
            }
        }
        this.#tabComponents = {};
        await super.unmount();
    }

    async destroy() {
        this.#dateFilter?.destroy?.();
        this.#overviewCards?.destroy?.();
        Object.values(this.#tabComponents).forEach(c => c?.destroy?.());
        await super.destroy();
    }

    // ─── Data fetching ────────────────────────────────────────────────────────

    /**
     * Fetch the two always-visible slices in parallel.
     * Engagement is NOT fetched here — it is deferred to the Engagement tab.
     */
    async #fetchInitialData() {
        const analytics = this.getService('analytics');
        const links = this.getService('links');

        this.#link = await links.getLink(this.#linkId);

        try {
            [this.#overview, this.#timeSeries] = await Promise.all([
                analytics.getLinkOverview(this.#linkId, this.#dateRange),
                analytics.getLinkTimeSeries(this.#linkId, this.#dateRange),
            ]);
        } catch (err) {
            console.error('[LinkStatsPage] Initial stats fetch failed:', err);
            this.#overview = analytics.emptyLinkOverview?.() ?? null;
            this.#timeSeries = analytics.emptyTimeSeries?.() ?? null;
            this._statsLoadError = err.message || 'Could not load Analytics data.';
        }
    }

    /**
     * Fetch a lazy metric slice and store it in #lazySliceData.
     *
     * Key mapping:
     *   'geo' → 'geography' (canonical store key)
     *   'engagement' → 'engagement'
     *   others unchanged
     *
     * @param {'geo'|'traffic'|'devices'|'engagement'} tabKey
     */
    async #fetchMetricSlice(tabKey) {
        const fetchMethod = LAZY_TAB_FETCH[tabKey];
        if (!fetchMethod) return null;

        const cacheKey = tabKey === 'geo' ? 'geography' : tabKey;

        if (this.#lazySliceData.has(cacheKey)) return this.#lazySliceData.get(cacheKey);

        const analytics = this.getService('analytics');
        try {
            const data = await analytics[fetchMethod](this.#linkId, this.#dateRange);
            const result = data ?? this.#emptyForTab(tabKey, analytics);
            this.#lazySliceData.set(cacheKey, result);
            return result;
        } catch (err) {
            console.error(`[LinkStatsPage] Failed to fetch "${tabKey}":`, err);
            const empty = this.#emptyForTab(tabKey, analytics);
            this.#lazySliceData.set(cacheKey, empty);
            return empty;
        }
    }

    #emptyForTab(tabKey, analytics) {
        switch (tabKey) {
            case 'geo':
                return analytics.emptyGeography?.() ?? {};
            case 'traffic':
                return analytics.emptyTraffic?.() ?? {};
            case 'devices':
                return analytics.emptyDevices?.() ?? {};
            case 'engagement':
                return analytics.emptyEngagement?.() ?? {};
            default:
                return {};
        }
    }

    async #refetchStats() {
        if (this.#isFetching) return;
        this.#isFetching = true;
        this.#setRefetchOverlay(true);

        try {
            const analytics = this.getService('analytics');
            [this.#overview, this.#timeSeries] = await Promise.all([
                analytics.getLinkOverview(this.#linkId, this.#dateRange),
                analytics.getLinkTimeSeries(this.#linkId, this.#dateRange),
            ]);
            await this.#updateAllComponents();
        } catch (err) {
            console.error('[LinkStatsPage] refetch failed:', err);
            this.showNotification('Failed to refresh Analytics data.', 'error');
        } finally {
            this.#isFetching = false;
            this.#setRefetchOverlay(false);
        }
    }

    // ─── Component mounting ───────────────────────────────────────────────────

    #mountDateFilter() {
        const el = this.querySelector('#dateFilterMount');
        if (!el) return;

        this.#dateFilter = new StatsDateFilter(el, {activePreset: this.#activePreset});
        this.#dateFilter.mount();

        this.attachListener(el, 'dateChange', async (e) => {
            const {preset, startDate, endDate} = e.detail;
            this.#activePreset = preset;
            this.#dateRange = {startDate, endDate};
            this.getService('analytics')?.invalidateLink(this.#linkId);
            this.#lazySliceData.clear();
            await this.#refetchStats();
        });
    }

    #mountOverviewCards() {
        const el = this.querySelector('#overviewCardsMount');
        if (!el) return;

        // FIXED: pass just the inner OverviewMetrics object, not the full UrlOverview wrapper.
        // StatsOverviewCards reads o.totalClicks, o.activeDays, etc. directly from this.overview.
        this.#overviewCards = new StatsOverviewCards(el, {
            overview: this.#overview?.overview ?? {},
        });
        this.#overviewCards.mount();
    }

    // ─── Tab management ───────────────────────────────────────────────────────

    #setupTabNav() {
        const nav = this.querySelector('.stats-nav-tabs');
        if (!nav) return;

        this.attachListener(nav, 'click', async (e) => {
            const btn = e.target.closest('[data-tab]');
            if (btn) await this.#activateTab(btn.dataset.tab);
        });

        this.attachListener(nav, 'keydown', (e) => {
            if (!['ArrowLeft', 'ArrowRight'].includes(e.key)) return;
            const tabs = Array.from(nav.querySelectorAll('[data-tab]'));
            const cur = tabs.findIndex(t => t.classList.contains('active'));
            const next = e.key === 'ArrowRight'
                ? (cur + 1) % tabs.length
                : (cur - 1 + tabs.length) % tabs.length;
            tabs[next]?.click();
            tabs[next]?.focus();
        });
    }

    async #activateTab(tabKey, fetchIfNeeded = true) {
        if (tabKey === this.#activeTab && this.#tabComponents[tabKey]) return;
        this.#activeTab = tabKey;

        // Update tab buttons
        this.querySelectorAll('[data-tab]').forEach(btn => {
            const active = btn.dataset.tab === tabKey;
            btn.classList.toggle('active', active);
            btn.setAttribute('aria-selected', String(active));
            btn.tabIndex = active ? 0 : -1;
        });

        // Update tab panels
        this.querySelectorAll('.stats-tab-panel').forEach(panel => {
            panel.classList.toggle('active', panel.id === `tabPanel-${tabKey}`);
        });

        const container = this.querySelector(`#tabPanel-${tabKey}`);
        if (!container) return;

        // Always-visible 'summary' tab
        if (tabKey === 'summary') {
            if (!this.#tabComponents.summary) {
                this.#tabComponents.summary = new ClicksChart(container, {
                    trend: this.#timeSeries?.trend ?? [],
                });
                await this.#tabComponents.summary.mount();
            }
            return;
        }

        // Lazy tab — fetch data if needed, then mount component
        if (!LAZY_TAB_FETCH[tabKey]) return;

        if (fetchIfNeeded) {
            container.innerHTML = `
                <div class="tab-loading-state" aria-live="polite">
                    <i class="fa-solid fa-circle-notch fa-spin" aria-hidden="true"></i>
                    <span>Loading…</span>
                </div>`;

            if (this.#tabComponents[tabKey]) {
                try {
                    await this.#tabComponents[tabKey].unmount?.();
                } catch { /* ignore */
                }
                delete this.#tabComponents[tabKey];
            }

            await this.#fetchMetricSlice(tabKey);
        }

        container.innerHTML = '';
        const comp = this.#createTabComponent(tabKey, container);
        if (!comp) return;

        this.#tabComponents[tabKey] = comp;
        await comp.mount();
    }

    /**
     * Build the correct component and props for a given tab.
     *
     * FIXED: 'engagement' now reads from #lazySliceData, not #overview.
     * The overview endpoint no longer returns engagement data.
     */
    #createTabComponent(tabKey, container) {
        const cacheKey = tabKey === 'geo' ? 'geography' : tabKey;

        switch (tabKey) {
            case 'summary':
                return new ClicksChart(container, {
                    trend: this.#timeSeries?.trend ?? [],
                });
            case 'geo':
                return new GeoPanel(container, {
                    geography: this.#lazySliceData.get('geography') ?? {},
                });
            case 'traffic':
                return new TrafficPanel(container, {
                    traffic: this.#lazySliceData.get('traffic') ?? {},
                });
            case 'devices':
                return new DevicesPanel(container, {
                    devices: this.#lazySliceData.get('devices') ?? {},
                });
            case 'engagement':
                // FIXED: reads from #lazySliceData — engagement is no longer in overview
                return new EngagementPanel(container, {
                    engagement: this.#lazySliceData.get('engagement') ?? {},
                    timeSeries: this.#timeSeries ?? {},
                });
            default:
                return null;
        }
    }

    /**
     * Push fresh data into all currently mounted ProfileHeaderCard after a refetch.
     * Lazy tabs are unmounted so they re-fetch on the next activation.
     */
    async #updateAllComponents() {
        // FIXED: pass just the inner OverviewMetrics, not the full UrlOverview wrapper
        this.#overviewCards?.update(this.#overview?.overview ?? {});

        const c = this.#tabComponents;

        if (c.summary) {
            await c.summary.updateData({
                trend: this.#timeSeries?.trend ?? [],
                dailyClicks: this.#timeSeries?.dailyClicks ?? {},
            });
        }

        // Unmount all lazy tabs — data is stale; they re-fetch on the next activation
        for (const lazyKey of Object.keys(LAZY_TAB_FETCH)) {
            if (c[lazyKey]) {
                try {
                    await c[lazyKey].unmount?.();
                } catch { /* ignore */
                }
                delete c[lazyKey];
                const panel = this.querySelector(`#tabPanel-${lazyKey}`);
                if (panel) panel.innerHTML = '';
            }
        }

        // Re-activate the current lazy tab immediately so the user sees fresh data
        if (LAZY_TAB_FETCH[this.#activeTab]) {
            await this.#activateTab(this.#activeTab, true);
        }
    }

    // ─── EventBus listeners ───────────────────────────────────────────────────

    #setupBackButton() {
        const btn = this.querySelector('#backBtn');
        if (btn) this.attachListener(btn, 'click', () => this.getService('router')?.back?.());
    }

    #setupBusListeners() {
        const eb = this.eventBus;
        if (!eb) return;

        this.trackBusListener(
            eb.on(eb.EVENTS.LINK_UPDATED, async ({link}) => {
                if (String(link?.id) !== String(this.#linkId)) return;
                this.getService('analytics').invalidateLink(this.#linkId);
                this.#lazySliceData.clear();
                await this.#refetchStats();
            })
        );
    }

    // ─── UI helpers ───────────────────────────────────────────────────────────

    #setRefetchOverlay(visible) {
        this.querySelector('#statsRefetchOverlay')?.classList.toggle('hidden', !visible);
    }

    #handleMountError(err) {
        console.error('[LinkStatsPage] mount error:', err);
        this.renderError(err.message || 'Failed to load link statistics.');
    }

    // ─── Templates ───────────────────────────────────────────────────────────

    #skeletonTemplate() {
        return `
            <div class="stats-page stats-skeleton" aria-busy="true" aria-label="Loading link statistics">
                <div class="skeleton-header"></div>
                <div class="skeleton-cards">
                    <div class="skeleton-card"></div>
                    <div class="skeleton-card"></div>
                    <div class="skeleton-card"></div>
                    <div class="skeleton-card"></div>
                </div>
                <div class="skeleton-chart"></div>
            </div>`;
    }

    #pageTemplate() {
        const link = this.#link || {};
        const shortUrl = this.escapeHtml(link.shortUrl || '');
        const title = this.escapeHtml(link.title || link.shortCode || 'Link');

        let faviconSrc = null;
        try {
            if (link.originalUrl) {
                const host = new URL(link.originalUrl).hostname;
                faviconSrc = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=32`;
            }
        } catch { /* invalid URL — skip favicon */
        }

        return `
        <div class="stats-page" id="linkStatsPage">
            <div class="stats-page-header">
                <div class="stats-header-left">
                    <button class="stats-back-btn" id="backBtn" type="button"
                            title="Back to links" aria-label="Back to links">
                        <i class="fa-solid fa-arrow-left" aria-hidden="true"></i>
                    </button>
                    <div class="stats-link-info">
                        <div class="stats-link-favicon" aria-hidden="true">
                            ${faviconSrc ? `
                            <img src="${faviconSrc}" alt=""
                                 onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
                            <div class="favicon-fallback" style="display:none">
                                <i class="fa-solid fa-link"></i>
                            </div>` : `
                            <div class="favicon-fallback">
                                <i class="fa-solid fa-link"></i>
                            </div>`}
                        </div>
                        <div class="stats-link-details">
                            <h2 title="${title}">${title}</h2>
                            <div class="stats-link-urls">
                                <a href="${shortUrl}" target="_blank" rel="noopener noreferrer">
                                    ${shortUrl}
                                    <i class="fa-solid fa-arrow-up-right-from-square" aria-hidden="true"></i>
                                </a>
                                ${link.originalUrl ? `
                                    <span class="url-divider" aria-hidden="true">→</span>
                                    <span class="stats-origin-url"
                                          title="${this.escapeHtml(link.originalUrl)}">
                                        ${this.escapeHtml(link.originalUrl)}
                                    </span>` : ''}
                            </div>
                        </div>
                    </div>
                </div>
                <div id="dateFilterMount" role="group" aria-label="Date range"></div>
            </div>

            <div id="overviewCardsMount"></div>

            <div class="stats-nav-tabs" role="tablist" aria-label="Link statistics sections">
                ${TABS.map(t => `
                    <button
                        class="stats-nav-tab${t.key === 'summary' ? ' active' : ''}"
                        data-tab="${t.key}"
                        role="tab"
                        aria-selected="${t.key === 'summary'}"
                        aria-controls="tabPanel-${t.key}"
                        id="tab-${t.key}">
                        <i class="fa-solid ${t.icon}" aria-hidden="true"></i>
                        <span>${t.label}</span>
                    </button>`).join('')}
            </div>

            <div class="stats-refetch-overlay hidden" id="statsRefetchOverlay" aria-hidden="true">
                <div class="stats-refetch-spinner">
                    <i class="fa-solid fa-circle-notch fa-spin" aria-hidden="true"></i>
                    <span>Updating…</span>
                </div>
            </div>

            <div class="stats-tab-viewport" id="statsTabViewport">
                ${TABS.map(t => `
                    <div
                        class="stats-tab-panel${t.key === 'summary' ? ' active' : ''}"
                        id="tabPanel-${t.key}"
                        role="tabpanel"
                        aria-labelledby="tab-${t.key}">
                    </div>`).join('')}
            </div>
        </div>`;
    }
}