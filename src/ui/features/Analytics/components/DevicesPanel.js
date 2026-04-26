/**
 * DevicesPanel — Device donut chart + Browsers + OS ranked lists
 */

import BaseComponent from '../../../base/BaseComponent.js';

const DEVICE_ICONS = {
    Mobile: 'fa-mobile-screen-button',
    Desktop: 'fa-desktop',
    Tablet: 'fa-tablet-screen-button',
    Bot: 'fa-robot',
};

const DEVICE_COLORS = ['#667eea', '#4facfe', '#4ade80', '#fbbf24', '#f472b6'];
const BROWSER_COLORS = ['#4facfe', '#667eea', '#4ade80', '#f59e0b', '#f87171'];
const OS_COLORS = ['#a78bfa', '#34d399', '#fb923c', '#60a5fa', '#e879f9'];

function fmt(n) {
    if (n == null) return '0';
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return n.toLocaleString();
}

class DevicesPanel extends BaseComponent {
    constructor(container, props = {}) {
        super(container, props);
        this.devices = props.devices || {};
        this._devicesChar = null;

        this._isDevicesCharLoading = false;
    }

    // ── Lifecycle ─────────────────────────────────────────────────────────────

    render() {
        return `
            <div class="stats-two-column devices-panel">
                <div class="stats-chart-card">
                    <div class="chart-card-header"><h3>Device Types</h3></div>
                    <div id="deviceDonutEl" class="chart-mount donut-mount"></div>
                    <div class="stats-ranked-list" style="margin-top:0.875rem">
                        ${this._renderDeviceTypes()}
                    </div>
                </div>
                <div class="stats-chart-card">
                    <div class="chart-card-header"><h3>Browsers &amp; OS</h3></div>
                    <div class="stats-sub-section">
                        <div class="stats-sub-title">Browsers</div>
                        <div class="stats-ranked-list">${this._renderBrowsers()}</div>
                    </div>
                    <div class="stats-sub-section">
                        <div class="stats-sub-title">Operating Systems</div>
                        <div class="stats-ranked-list">${this._renderOS()}</div>
                    </div>
                </div>
            </div>`;
    }

    setupEventListeners() {
        requestAnimationFrame(()=>{
            this._initDonut();
        })
    }

    // ── Chart ─────────────────────────────────────────────────────────────────

    async _initDonut() {
        if (this._isDevicesCharLoading || this._devicesChar) return;

        const el = this.querySelector('#deviceDonutEl');
        if (!el) return;

        try{
            this._isDevicesCharLoading = true;

            // Dynamic import
            const { default: ApexCharts } = await import('apexcharts');

            // Safety check for mount status
            const currentEl = this.querySelector('#deviceDonutEl');
            if (!this.isMounted || !currentEl || this._devicesChar) return;

            const types = this.devices.topDeviceTypes || [];
            const labels = types.map(t => t.name || 'Unknown');
            const series = types.map(t => t.clicks || 0);

            if (!series.length || series.every(v => v === 0)) {
                el.classList.add('hidden-donut');
                return;
            }

            this._devicesChar = new ApexCharts(el, {
                chart: {
                    type: 'donut',
                    height: 220,
                    background: 'transparent',
                    fontFamily: 'inherit',
                    animations: {enabled: true, speed: 500},
                },
                theme: {mode: 'dark'},
                series,
                labels,
                colors: DEVICE_COLORS,
                dataLabels: {enabled: false},
                plotOptions: {
                    pie: {
                        donut: {
                            size: '68%',
                            labels: {
                                show: true,
                                total: {
                                    show: true,
                                    label: 'Clicks',
                                    color: 'rgba(255,255,255,0.5)',
                                    fontSize: '12px',
                                    formatter: w =>
                                        w.globals.seriesTotals
                                            .reduce((a, b) => a + b, 0)
                                            .toLocaleString(),
                                },
                            },
                        },
                    },
                },
                legend: {
                    position: 'bottom',
                    fontSize: '12px',
                    labels: {colors: 'rgba(255,255,255,0.65)'},
                    markers: {width: 8, height: 8, radius: 4},
                    itemMargin: {horizontal: 8},
                },
                tooltip: {
                    theme: 'dark',
                    y: {formatter: v => v.toLocaleString()},
                },
                stroke: {width: 2, colors: ['rgba(0,0,0,0.3)']},
            });

            this._devicesChar.render();

            this.addCleanupTask(() => {
                if (this._devicesChar) {
                    this._devicesChar.destroy();
                    this._devicesChar = null;
                }
            });
        } catch (err) {
            console.error("Chart load failed", err);
        } finally {
            this._isDevicesCharLoading = false;
        }
    }

    // ── Renderers ─────────────────────────────────────────────────────────────

    _renderDeviceTypes() {
        const types = this.devices.topDeviceTypes || [];
        if (!types.length) return this._empty('No device data');

        return types.map(t => {
            const icon = DEVICE_ICONS[t.name] || 'fa-circle-question';
            return `
                <div class="ranked-item compact">
                    <div class="device-icon-wrap">
                        <i class="fa-solid ${icon}"></i>
                    </div>
                    <div class="ranked-body">
                        <div class="ranked-row">
                            <span class="ranked-label">
                                ${this.escapeHtml(t.name || 'Unknown')}
                            </span>
                            <span class="ranked-value">${fmt(t.clicks)} <em>${(t.percentage || 0).toFixed(1)}%</em></span>
                        </div>
                        <div class="ranked-bar">
                            <div class="ranked-bar-fill bar-purple"
                                 style="width:${Math.min(t.percentage || 0, 100)}%">
                            </div>
                        </div>
                    </div>
                </div>`;
        }).join('');
    }

    _renderBrowsers() {
        const browsers = this.devices.topBrowsers || [];
        if (!browsers.length) return this._empty('No browser data');
        const max = browsers[0]?.clicks || 1;

        return browsers.slice(0, 6).map((b, i) => `
            <div class="ranked-item">
                <div class="ranked-pos">${i + 1}</div>
                <div class="color-swatch"
                     style="background:${BROWSER_COLORS[i % BROWSER_COLORS.length]}">
                </div>
                <div class="ranked-body">
                    <div class="ranked-row">
                        <span class="ranked-label">${this.escapeHtml(b.browserName || 'Unknown')}</span>
                        <span class="ranked-value">${fmt(b.clicks)} <em>${(b.percentage || 0).toFixed(1)}%</em></span>
                    </div>
                    <div class="ranked-bar">
                        <div class="ranked-bar-fill bar-blue"
                             style="width:${((b.clicks / max) * 100).toFixed(1)}%">
                        </div>
                    </div>
                </div>
            </div>`).join('');
    }

    _renderOS() {
        const osList = this.devices.topOperatingSystems || [];
        if (!osList.length) return this._empty('No OS data');
        const max = osList[0]?.clicks || 1;

        return osList.slice(0, 6).map((o, i) => `
            <div class="ranked-item">
                <div class="ranked-pos">${i + 1}</div>
                <div class="color-swatch"
                     style="background:${OS_COLORS[i % OS_COLORS.length]}">
                </div>
                <div class="ranked-body">
                    <div class="ranked-row">
                        <span class="ranked-label">${this.escapeHtml(o.osName || 'Unknown')}</span>
                        <span class="ranked-value">${fmt(o.clicks)} <em>${(o.percentage || 0).toFixed(1)}%</em></span>
                    </div>
                    <div class="ranked-bar">
                        <div class="ranked-bar-fill bar-teal"
                             style="width:${((o.clicks / max) * 100).toFixed(1)}%">
                        </div>
                    </div>
                </div>
            </div>`).join('');
    }

    _empty(msg) {
        return `<div class="stats-empty-mini"><i class="fa-solid fa-circle-question"></i><span>${msg}</span></div>`;
    }

    // ── Public API ────────────────────────────────────────────────────────────
    update(devices) {
        this.devices = devices || {};
        if (!this.isMounted) return;

        if (this._devicesChar) {
            this._devicesChar.destroy();
            this._devicesChar = null;
        }

        const root = this.querySelector('.devices-panel');
        if (!root) return;
        const temp = document.createElement('div');
        temp.innerHTML = this.render();
        root.replaceWith(temp.firstElementChild);

        this._isDevicesCharLoading = false;

        requestAnimationFrame(()=>{
            this._initDonut();
        })
    }
}

export default DevicesPanel;