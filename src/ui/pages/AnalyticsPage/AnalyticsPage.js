/**
 * AnalyticsPage — Comprehensive Analytics dashboard page controller.
 */

import BasePage from '../BasePage.js';
import DashboardPageHeader from '../../components/DashboardPageHeader/DashboardPageHeader.js';
import StatsDateFilter from '../../features/Analytics/StatsDateFilter/StatsDateFilter.js';
import UserOverviewCards from '../../features/Analytics/UserOverviewCards/UserOverviewCards.js';
import ClicksChart from '../../features/Analytics/ClicksChart/ClicksChart.js';
import EngagementPanel from '../../features/Analytics/EngagementPanel/EngagementPanel.js';
import TopUrlsPanel from '../../features/Analytics/TopUrlsPanel/TopUrlsPanel.js';
import GeoPanel from '../../features/Analytics/components/GeoPanel.js';
import TrafficPanel from '../../features/Analytics/components/TrafficPanel.js';
import DevicesPanel from '../../features/Analytics/components/DevicesPanel.js';

// ─── Lazy panel config ────────────────────────────────────────────────────────

/**
 * Panels triggered only when their tab is clicked.
 * 'engagement' is intentionally absent — it auto-triggers on mount.
 */
const LAZY_TABS = new Set(['topUrls', 'geography', 'traffic', 'devices']);

/**
 * Auto-lazy panels: triggered once on mount after the initial paint,
 * without waiting for a tab click.
 * Renders inside the overview tab — no extra tab button is needed.
 */
const AUTO_LAZY = new Set(['engagement']);

/**
 * Config for every lazy panel (auto and tab-triggered).
 */
const LAZY_TAB_CONFIG = {
    engagement: {
        container: '#engagementPanelContainer',
        Component: EngagementPanel,
        propKey: 'engagement',
        // EngagementPanel needs both engagement and timeSeries.
        getProps: state => ({
            engagement: state.engagement ?? {},
            timeSeries: state.timeSeries ?? {},
        }),
        updateFn: (panel, state) => panel.update?.({
            engagement: state.engagement ?? {},
            timeSeries: state.timeSeries ?? {},
        }),
    },
    topUrls: {
        container: '#topUrlsPanelContainer',
        Component: TopUrlsPanel,
        propKey: 'topUrls',
        getProps: state => ({links: state.topUrls?.topUrls ?? []}),
        updateFn: (panel, state) => panel.updateLinks?.(state.topUrls?.topUrls ?? []),
    },
    geography: {
        container: '#geoPanelContainer',
        Component: GeoPanel,
        propKey: 'geography',
    },
    traffic: {
        container: '#trafficPanelContainer',
        Component: TrafficPanel,
        propKey: 'traffic',
    },
    devices: {
        container: '#devicesPanelContainer',
        Component: DevicesPanel,
        propKey: 'devices',
    },
};

// ─── Page class ───────────────────────────────────────────────────────────────

export default class AnalyticsPage extends BasePage {

    #activeTab = 'overview';

    // Always-visible refs (registered → auto-destroyed by super)
    #pageHeader = null;
    #dateFilter = null;
    #overviewCards = null;
    #clicksChart = null;

    // Lazy panel refs (NOT registered — manually managed)
    /** @type {Map<string, BaseComponent>} */
    #lazyPanels = new Map();

    // ═════════════════════════════════════════════════════════════════════════
    // LIFECYCLE
    // ═════════════════════════════════════════════════════════════════════════

    async mount() {
        await super.mount();

        const analyticsService = this.getService('analytics');
        if (!analyticsService) {
            this.renderError('AnalyticsService not registered');
            return;
        }

        // Subscribe BEFORE loading — refs are null here, but all updates are ?.-guarded.
        this.trackStoreSubscription(
            this.store.subscribe('analytics', state => this.#onAnalyticsStateChange(state))
        );

        this.trackBusListener(
            this.eventBus?.on(this.eventBus.EVENTS.LINK_CREATED, () => analyticsService.invalidateMyStats())
        );
        this.trackBusListener(
            this.eventBus?.on(this.eventBus.EVENTS.LINK_DELETED, () => analyticsService.invalidateMyStats())
        );

        this.#showSkeleton(true);

        try {
            await this.#mountPageHeader();

            const initialPreset = this.store.getState('analytics').preset;
            await analyticsService.loadDashboardData(initialPreset);

            await this.#initComponents();
            this.#setupListeners();
            this.#showSkeleton(false);
            this.highlightActiveNavItem('/Analytics');

        } catch (err) {
            console.error('[AnalyticsPage] mount error:', err);
            this.#showSkeleton(false);
            this.#showError(err.message);
        }
    }

    async unmount() {
        for (const comp of this.#lazyPanels.values()) {
            try {
                await comp?.unmount?.();
            } catch { /* ignore */
            }
        }
        this.#lazyPanels.clear();
        await super.unmount();
    }

    // ═════════════════════════════════════════════════════════════════════════
    // STORE SUBSCRIBER
    // ═════════════════════════════════════════════════════════════════════════

    /**
     * Reacts to every change in the 'Analytics' store slice.
     * The page NEVER manually pushes data after a fetch — all updates flow here.
     */
    async #onAnalyticsStateChange(state) {
        if (!this.isMounted()) return;

        // Always-visible ProfileHeaderCard
        if (this.#overviewCards?.isMounted) {
            this.#overviewCards.updateStats(state.overview);
        }

        if (this.#clicksChart?.isMounted) this.#clicksChart.update(state.timeSeries?.trend ?? []);

        // Lazy panels — update only if already mounted and data is non-null
        for (const [tabKey, cfg] of Object.entries(LAZY_TAB_CONFIG)) {
            const panel = this.#lazyPanels.get(tabKey);
            if (!panel?.isMounted || state[cfg.propKey] == null) continue;

            if (cfg.updateFn) {
                await cfg.updateFn(panel, state);
            } else {
                await panel.update?.(state[cfg.propKey]);
            }
        }
    }

    // ═════════════════════════════════════════════════════════════════════════
    // COMPONENT INITIALISATION
    // ═════════════════════════════════════════════════════════════════════════

    async #mountPageHeader() {
        const el = this.querySelector('#analyticsPageHeaderMount');
        if (!el) return;

        this.#pageHeader = new DashboardPageHeader(el, {
            icon: 'fa-chart-line',
            title: 'Analytics Dashboard',
            subtitle: 'Your complete link performance overview',
        });
        await this.#pageHeader.mount();
        this.registerComponent(this.#pageHeader);

        const rightSlot = this.#pageHeader.getRightSlot();
        if (rightSlot) {
            const currentPreset = this.store.getState('analytics').preset;
            this.#dateFilter = new StatsDateFilter(rightSlot, {activePreset: currentPreset});
            await this.#dateFilter.mount();
            this.registerComponent(this.#dateFilter);

            this.attachListener(rightSlot, 'dateChange', async (e) => {
                await this.#handlePresetChange(e.detail.preset);
            });
        }
    }

    /**
     * Mount always-visible content ProfileHeaderCard from the already-populated store.
     * After mounting, auto-trigger the engagement lazy panel (non-blocking).
     */
    async #initComponents() {
        const state = this.store.getState('analytics');

        await this.#mountOverviewCards(state.overview);
        await this.#mountClicksChart(state.timeSeries);

        this.#showContent(true);
        this.#activateTab(this.#activeTab);

        // Auto-trigger engagement after the first paint — fire-and-forget.
        // The state subscriber updates the panel when data arrives.
        for (const key of AUTO_LAZY) {
            this.#mountLazyPanel(key).catch(err =>
                console.warn(`[AnalyticsPage] auto-lazy "${key}" failed:`, err)
            );
        }
    }

    async #mountOverviewCards(overview) {
        const el = this.querySelector('#analyticsOverviewCards');
        if (!el) return;

        this.#overviewCards = new UserOverviewCards(el, {stats: overview});
        await this.#overviewCards.mount();
        this.registerComponent(this.#overviewCards);
    }

    async #mountClicksChart(timeSeries) {
        const el = this.querySelector('#clicksChartContainer');
        if (!el) return;
        this.#clicksChart = new ClicksChart(el, {
            title: 'Clicks Over Time',
            trend: timeSeries?.trend ?? [],
            dailyClicks: timeSeries?.dailyClicks ?? {},
        });
        await this.#clicksChart.mount();
        this.registerComponent(this.#clicksChart);
    }

    /**
     * Lazily mount a panel on the first activation (tab click or auto-trigger).
     * Skips if already mounted. Shows spinner while loading.
     * Uses cfg.getProps to build correct props for non-standard panels.
     *
     * @param {string} tabKey
     */
    async #mountLazyPanel(tabKey) {
        if (this.#lazyPanels.has(tabKey)) return;

        const cfg = LAZY_TAB_CONFIG[tabKey];
        const el = this.querySelector(cfg.container);
        if (!el) return;

        el.innerHTML = `
            <div class="tab-loading-state" aria-live="polite" aria-busy="true">
                <i class="fa-solid fa-circle-notch fa-spin" aria-hidden="true"></i>
                <span>Loading…</span>
            </div>`;

        const analyticsService = this.getService('analytics');

        try {
            const existingData = this.store.getState('analytics')[cfg.propKey];
            if (existingData == null) {
                await analyticsService.loadLazySlice(tabKey);
            }

            el.innerHTML = '';
            const state = this.store.getState('analytics');
            const props = cfg.getProps
                ? cfg.getProps(state)
                : {[cfg.propKey]: state[cfg.propKey] ?? {}};

            const comp = new cfg.Component(el, props);
            this.#lazyPanels.set(tabKey, comp);
            await comp.mount();

        } catch (err) {
            console.error(`[AnalyticsPage] Failed to mount lazy panel "${tabKey}":`, err);
            el.innerHTML = `
                <div class="error-state">
                    <i class="fa-solid fa-circle-exclamation" aria-hidden="true"></i>
                    <p>Failed to load data.</p>
                    <button class="btn btn-outline btn-sm" id="retryBtn-${tabKey}" type="button">
                        Retry
                    </button>
                </div>`;
            const retryBtn = el.querySelector(`#retryBtn-${tabKey}`);
            if (retryBtn) {
                this.#lazyPanels.delete(tabKey);
                this.attachListener(retryBtn, 'click', () => this.#mountLazyPanel(tabKey));
            }
        }
    }

    // ═════════════════════════════════════════════════════════════════════════
    // TAB MANAGEMENT
    // ═════════════════════════════════════════════════════════════════════════

    async #switchTab(tab) {
        if (tab === this.#activeTab) return;
        this.#activeTab = tab;
        this.#activateTab(tab);
        if (LAZY_TABS.has(tab)) await this.#mountLazyPanel(tab);
    }

    #activateTab(tab) {
        const panelMap = {
            overview: '#tabOverview',
            topUrls: '#tabTopUrls',
            geography: '#tabGeography',
            traffic: '#tabTraffic',
            devices: '#tabDevices',
        };
        Object.entries(panelMap).forEach(([key, sel]) => {
            this.querySelector(sel)?.classList.toggle('active', key === tab);
        });
        this.querySelectorAll('.stats-nav-tab').forEach(btn => {
            const isActive = btn.dataset.tab === tab;
            btn.classList.toggle('active', isActive);
            btn.setAttribute('aria-selected', String(isActive));
            btn.tabIndex = isActive ? 0 : -1;
        });
    }

    // ═════════════════════════════════════════════════════════════════════════
    // DATE PRESET
    // ═════════════════════════════════════════════════════════════════════════

    async #handlePresetChange(preset) {
        this.#showRefetchOverlay(true);
        try {
            const analyticsService = this.getService('analytics');
            await analyticsService.loadDashboardData(preset);

            // Reset lazy panels so they re-fetch fresh data on next activation
            await this.#resetLazyPanels();

            // Re-trigger auto-lazy panels immediately
            for (const key of AUTO_LAZY) {
                this.#mountLazyPanel(key).catch(err =>
                    console.warn(`[AnalyticsPage] auto-lazy re-trigger "${key}" failed:`, err)
                );
            }

            // Re-activate the current tab-lazy panel immediately if the user was on it
            if (LAZY_TABS.has(this.#activeTab)) {
                await this.#mountLazyPanel(this.#activeTab);
            }
        } catch (err) {
            console.error('[AnalyticsPage] preset change error:', err);
            this.showNotification('Failed to refresh Analytics data.', 'error');
        } finally {
            this.#showRefetchOverlay(false);
        }
    }

    async #resetLazyPanels() {
        // Service nulls all lazy slices in the store
        this.getService('analytics')?.resetLazyData();

        const allLazyKeys = [...LAZY_TABS, ...AUTO_LAZY];
        for (const tabKey of allLazyKeys) {
            const comp = this.#lazyPanels.get(tabKey);
            if (comp) {
                try {
                    await comp.unmount?.();
                } catch { /* ignore */
                }
                this.#lazyPanels.delete(tabKey);
            }
            const el = this.querySelector(LAZY_TAB_CONFIG[tabKey]?.container);
            if (el) el.innerHTML = '';
        }
    }

    // ═════════════════════════════════════════════════════════════════════════
    // EVENT WIRING
    // ═════════════════════════════════════════════════════════════════════════

    #setupListeners() {
        const tabBar = this.querySelector('#analyticsNavTabs');
        if (!tabBar) return;

        this.attachListener(tabBar, 'click', async (e) => {
            const btn = e.target.closest('.stats-nav-tab');
            if (btn?.dataset.tab) await this.#switchTab(btn.dataset.tab);
        });

        this.attachListener(tabBar, 'keydown', (e) => {
            if (!['ArrowLeft', 'ArrowRight'].includes(e.key)) return;
            const tabs = Array.from(tabBar.querySelectorAll('.stats-nav-tab'));
            const cur = tabs.findIndex(t => t.classList.contains('active'));
            const next = e.key === 'ArrowRight'
                ? (cur + 1) % tabs.length
                : (cur - 1 + tabs.length) % tabs.length;
            tabs[next]?.click();
            tabs[next]?.focus();
        });
    }

    // ═════════════════════════════════════════════════════════════════════════
    // UI HELPERS
    // ═════════════════════════════════════════════════════════════════════════

    #showSkeleton(visible) {
        this.querySelector('#analyticsSkeletonLoader')?.classList.toggle('hidden', !visible);
    }

    #showContent(visible) {
        this.querySelector('#analyticsContent')?.classList.toggle('hidden', !visible);
    }

    #showRefetchOverlay(visible) {
        const el = this.querySelector('#analyticsRefetchOverlay');
        if (!el) return;
        el.classList.toggle('hidden', !visible);
        el.setAttribute('aria-hidden', String(!visible));
    }

    #showError(message) {
        const el = this.querySelector('#analyticsError');
        if (!el) {
            this.renderError(message);
            return;
        }
        el.classList.remove('hidden');
        el.innerHTML = `
            <div class="error-container" role="alert">
                <i class="fa-solid fa-circle-exclamation" aria-hidden="true"
                   style="font-size:2.5rem;color:var(--error-color);display:block;margin-bottom:1rem"></i>
                <p>Failed to load analytics: ${this.escapeHtml(message)}</p>
                <button class="btn btn-primary" id="analyticsRetryBtn" type="button">
                    <i class="fa-solid fa-rotate-right" aria-hidden="true"></i> Retry
                </button>
            </div>`;
        const retryBtn = el.querySelector('#analyticsRetryBtn');
        if (retryBtn) {
            this.attachListener(retryBtn, 'click', async () => {
                el.classList.add('hidden');
                el.innerHTML = '';
                await this.mount();
            });
        }
    }
}