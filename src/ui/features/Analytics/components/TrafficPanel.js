/**
 * TrafficPanel — Traffic Sources bar chart + Top Referrers + UTM Campaigns
 */

import BaseComponent from '../../../base/BaseComponent.js';

const SOURCE_META = {
    Direct: {color: '#667eea', icon: 'fa-arrow-right'},
    Search: {color: '#4ade80', icon: 'fa-magnifying-glass'},
    Social: {color: '#f472b6', icon: 'fa-thumbs-up'},
    Referral: {color: '#4facfe', icon: 'fa-share'},
    Email: {color: '#fbbf24', icon: 'fa-envelope'},
    Unknown: {color: '#94a3b8', icon: 'fa-circle-question'},
};

const REFERRER_COLORS = ['#4facfe', '#667eea', '#4ade80', '#f59e0b', '#f87171', '#a78bfa'];


// ── Helpers ────────────────────────────────────────────────────────────────
function fmt(n) {
    if (n == null) return '0';
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return n.toLocaleString();
}

class TrafficPanel extends BaseComponent {
    constructor(container, props = {}) {
        super(container, props);
        this.traffic = props.traffic || {};
        this._sourcesChart = null;   // Traffic Sources vertical bar
        this._referrersChart = null;   // Top Referrers horizontal bar
        this._campaignsChart = null;   // UTM Campaigns treemap

        this._isLoadingSources = false;
        this._isLoadingReferrers = false;

    }

    // ── Lifecycle ─────────────────────────────────────────────────────────────

    render() {
        const refs = this.traffic.topReferrers || [];

        return `
            <div class="traffic-panel">
                <div class="stats-two-column">

                    <!-- Left: Traffic Sources -->
                    <div class="stats-chart-card">
                        <div class="chart-card-header"><h3>Traffic Sources</h3></div>
                        <div id="trafficBarChartEl" class="chart-mount"></div>
                        <div class="stats-ranked-list" style="margin-top:0.75rem">
                            ${this._renderSources()}
                        </div>
                    </div>

                    <!-- Right: Top Referrers -->
                    <div class="stats-chart-card">
                        <div class="chart-card-header">
                            <h3>Top Referrers</h3>
                            <span class="chart-badge">${refs.length} sources</span>
                        </div>
                        <div id="referrersBarChartEl" class="chart-mount"></div>
                        <div class="stats-ranked-list" style="margin-top:0.75rem">
                            ${this._renderReferrers()}
                        </div>
                    </div>

                </div>

            </div>`;
    }

    setupEventListeners() {
        // Using requestAnimationFrame ensures the browser has
        // finished the "Layout" phase of the HTML you just rendered
        requestAnimationFrame(() => {
            this._initSourcesChart();
            this._initReferrersChart();
        });
    }

    // ── Charts ────────────────────────────────────────────────────────────────

    async _initSourcesChart() {
        if (this._isLoadingSources || this._sourcesChart) return;

        const el = this.querySelector('#trafficBarChartEl');
        if (!el) return;

        const sources = this.traffic.topTrafficSources || [];
        if (!sources.length) {
            el.innerHTML = `
                <div class="stats-empty-mini" style="height:180px">
                    <i class="fa-solid fa-share-nodes"></i>
                    <span>No traffic source data for this period</span>
                </div>`;
            return;
        }

        try {
            this._isLoadingSources = true;

            // Dynamic import. Webpack will pause here and fetch the library.
            const { default: ApexCharts } = await import('apexcharts');

            // Safety check. If the user navigated away while the library was downloading, stop.
            const currentEl = this.querySelector('#trafficBarChartEl');
            if (!this.isMounted || !currentEl || this._sourcesChart) {
                return;
            }

            this._sourcesChart = new ApexCharts(el, {
                chart: {
                    type: 'bar',
                    height: 180,
                    background: 'transparent',
                    toolbar: {show: false},
                    fontFamily: 'inherit',
                    animations: {enabled: true, speed: 400},
                },
                theme: {mode: 'dark'},
                series: [{name: 'Clicks', data: sources.map(s => s.clicks || 0)}],
                xaxis: {
                    categories: sources.map(s => s.source || 'Unknown'),
                    axisBorder: {show: false},
                    axisTicks: {show: false},
                    labels: {style: {colors: 'rgba(255,255,255,0.45)', fontSize: '11px'}},
                },
                yaxis: {
                    labels: {
                        style: {colors: 'rgba(255,255,255,0.45)', fontSize: '11px'},
                        formatter: v => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(Math.round(v)),
                    },
                },
                colors: sources.map(s => (SOURCE_META[s.source] || SOURCE_META.Unknown).color),
                plotOptions: {
                    bar: {borderRadius: 6, columnWidth: '40%', distributed: true, dataLabels: {position: 'top'}},
                },
                dataLabels: {
                    enabled: true,
                    formatter: v => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v),
                    style: {fontSize: '10px', colors: ['rgba(255,255,255,0.6)']},
                    offsetY: -18,
                },
                grid: {
                    borderColor: 'rgba(255,255,255,0.07)',
                    strokeDashArray: 4,
                    xaxis: {lines: {show: false}},
                },
                legend: {show: false},
                tooltip: {theme: 'dark', y: {formatter: v => v.toLocaleString()}},
            });

            this._sourcesChart.render();
            this.addCleanupTask(() => {
                if (this._sourcesChart) {
                    this._sourcesChart.destroy();
                    this._sourcesChart = null;
                }
            });

        } catch (err) {
            console.error("Chart load failed", err);
        } finally {
            this._isLoadingSources = false;
        }

    }

    async _initReferrersChart() {
        if(this._isLoadingReferrers || this._referrersChart) return;

        const el = this.querySelector('#referrersBarChartEl');
        if (!el) return;

        const refs = (this.traffic.topReferrers || []).slice(0, 6);
        if (!refs.length) {
            el.style.display = 'none';
            return;
        }

        try{
            this._isLoadingReferrers = true;

            // Dynamic import
            const { default: ApexCharts } = await import('apexcharts');

            // Safety check
            if (!this.isMounted) return;

            this._referrersChart = new ApexCharts(el, {
                chart: {
                    type: 'polarArea',
                    height: 260,
                    background: 'transparent',
                    fontFamily: 'inherit',
                    animations: {enabled: true, speed: 500},
                },
                theme: {mode: 'dark'},
                series: refs.map(r => r.clicks || 0),
                labels: refs.map(r => r.domain || 'Direct'),
                colors: refs.map((_, i) => REFERRER_COLORS[i % REFERRER_COLORS.length]),
                dataLabels: {enabled: false},
                stroke: {width: 1, colors: ['rgba(0,0,0,0.25)']},
                fill: {opacity: 0.85},
                yaxis: {show: false},
                plotOptions: {
                    polarArea: {rings: {strokeWidth: 0}, spokes: {strokeWidth: 0}},
                },
                legend: {
                    position: 'bottom',
                    fontSize: '11px',
                    labels: {colors: 'rgba(255,255,255,0.65)'},
                    markers: {width: 8, height: 8, radius: 4},
                    itemMargin: {horizontal: 6},
                },
                tooltip: {theme: 'dark', y: {formatter: v => v.toLocaleString() + ' clicks'}},
            });

            this._referrersChart.render();
            this.addCleanupTask(() => {
                if (this._referrersChart) {
                    this._referrersChart.destroy();
                    this._referrersChart = null;
                }
            });
        } catch (err) {
            console.error("Chart load failed", err);
        } finally {
            this._isLoadingReferrers = false;
        }
    }

    // ── Renderers ─────────────────────────────────────────────────────────────

    _renderSources() {
        const sources = this.traffic.topTrafficSources || [];
        if (!sources.length) return this._empty('No traffic source data');

        return sources.map((s) => {
            const meta = SOURCE_META[s.source] || SOURCE_META.Unknown;
            return `
                <div class="ranked-item compact">
                    <div class="device-icon-wrap">
                        <i class="fa-solid ${meta.icon}" style="color:${meta.color}"></i>
                    </div>
                    <div class="ranked-body">
                        <div class="ranked-row">
                            <span class="ranked-label">${this.escapeHtml(s.source || 'Unknown')}</span>
                            <span class="ranked-value">${fmt(s.clicks)} <em>${(s.percentage || 0).toFixed(1)}%</em></span>
                        </div>
                        <div class="ranked-bar">
                            <div class="ranked-bar-fill bar-purple"
                                 style="width:${Math.min(s.percentage || 0, 100)}%">
                            </div>
                        </div>
                    </div>
                </div>`;
        }).join('');
    }

    _renderReferrers() {
        const refs = this.traffic.topReferrers || [];
        if (!refs.length) return this._empty('No referrer data for this period');
        const max = refs[0]?.clicks || 1;

        return refs.slice(0, 10).map((r, i) => {
            return `
            <div class="ranked-item">
                <div class="ranked-pos">${i + 1}</div>
                <div class="referrer-favicon">
                    <img src="https://www.google.com/s2/favicons?domain=${encodeURIComponent(r.domain)}&sz=16"
                         alt="" onerror="this.style.display='none'">
                </div>
                <div class="ranked-body">
                    <div class="ranked-row">
                        <span class="ranked-label">${this.escapeHtml(r.domain || 'Direct')}</span>
                        <span class="ranked-value">${fmt(r.clicks)} <em>${(r.percentage || 0).toFixed(1)}%</em></span>
                    </div>
                    <div class="ranked-bar">
                        <div class="ranked-bar-fill bar-blue"
                             style="width:${((r.clicks / max) * 100).toFixed(1)}%">
                        </div>
                    </div>
                </div>
            </div>`;
        }).join('');
    }

    _empty(msg) {
        return `<div class="stats-empty-mini"><i class="fa-solid fa-share-nodes"></i><span>${msg}</span></div>`;
    }

    // ── Public API ────────────────────────────────────────────────────────────

    update(traffic) {
        this.traffic = traffic || {};
        if (!this.isMounted) return;

        // Destroy all three Charts before re-rendering
        [['_sourcesChart'], ['_referrersChart'], ['_campaignsChart']].forEach(([key]) => {
            if (this[key]) {
                this[key].destroy();
                this[key] = null;
            }
        });

        const root = this.querySelector('.traffic-panel');
        if (!root) return;
        const temp = document.createElement('div');
        temp.innerHTML = this.render();
        root.replaceWith(temp.firstElementChild);

        this._isLoadingSources = false;
        this._isLoadingReferrers = false;

        requestAnimationFrame(() => {
            this._initSourcesChart();
            this._initReferrersChart();
        });
    }
}

export default TrafficPanel;