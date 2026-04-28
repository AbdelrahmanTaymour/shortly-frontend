/**
 * ClicksChart  —  src/ui/features/Analytics/ClicksChart/ClicksChart.js
 */

import BaseComponent from '../../../base/BaseComponent.js';

class ClicksChart extends BaseComponent {
    constructor(container, props = {}) {
        super(container, props);
        this._chart     = null;
        this._isLoading = false;
    }

    // ─── Lifecycle ───────────────────────────────────────────────────────────

    render() {
        const title = this.props.title || 'Clicks Over Time';
        return `
            <div class="stats-chart-card">
                <div class="chart-card-header">
                    <h3><i class="fa-solid fa-chart-area"></i> ${title}</h3>
                    <div class="chart-legend">
                        <span class="chart-legend-item">
                            <span class="chart-legend-dot" style="background:#667eea"></span>
                            Total Clicks
                        </span>
                        <span class="chart-legend-item">
                            <span class="chart-legend-dot" style="background:#4facfe"></span>
                            Unique
                        </span>
                    </div>
                </div>
                <div class="chart-canvas-wrap" style="min-height:260px"></div>
            </div>`;
    }

    async mount() {
        await super.mount();

        // Register chart destruction exactly once for the full component lifetime.
        // BaseComponent.unmount() will call this automatically — no override needed.
        this.addCleanupTask(() => {
            if (this._chart) {
                this._chart.destroy();
                this._chart = null;
            }
        });

        await this._initChart();
    }

    // unmount() and destroy() are intentionally absent.
    // BaseComponent handles both via the cleanup task registered above.

    // ─── Chart Initialisation ─────────────────────────────────────────────────

    async _initChart() {
        if (this._isLoading || this._chart) return;

        const trend = this._buildTrend();

        if (!trend.length) {
            this._showEmpty();
            return;
        }

        try {
            this._isLoading = true;

            const { default: ApexCharts } = await import('apexcharts');

            // Safety check: user may have navigated away while the library downloaded.
            const wrap = this.querySelector('.chart-canvas-wrap');
            if (!this.isMounted || !wrap || this._chart) return;

            wrap.innerHTML = ''; // clear any previous empty-state markup

            this._chart = new ApexCharts(wrap, this._buildOptions(trend));
            await this._chart.render();

        } catch (err) {
            console.error('[ClicksChart] init failed:', err);
            this._showEmpty('Chart unavailable');
        } finally {
            this._isLoading = false;
        }
    }

    // ─── ApexCharts Config ────────────────────────────────────────────────────

    /**
     * Builds the full ApexCharts options object.
     * Produces per-series gradient fills that replicate the original Chart.js
     * canvas gradient feel (purple → transparent for Total, blue → transparent for Unique).
     * @param {Array<{label:string, clicks:number, unique:number}>} trend
     * @returns {Object}
     */
    _buildOptions(trend) {
        return {
            chart: {
                type: 'area',
                height: 260,
                background: 'transparent',
                toolbar: { show: false },
                fontFamily: 'inherit',
                animations: {
                    enabled: trend.length <= 100,
                    speed: 1000,
                    easing: 'easeinout',
                },
                zoom: { enabled: false },
            },
            theme: { mode: 'dark' },
            series: [
                { name: 'Total Clicks',  data: trend.map(t => t.clicks) },
                { name: 'Unique Clicks', data: trend.map(t => t.unique) },
            ],
            colors: ['#667eea', '#4facfe'],
            fill: {
                type: 'gradient',
                gradient: {
                    type: 'vertical',
                    // colorStops lets us set independent opacity curves per series,
                    // matching the original createLinearGradient() behaviour.
                    colorStops: [
                        [
                            { offset: 0,   color: '#667eea', opacity: 0.35 },
                            { offset: 70,  color: '#667eea', opacity: 0.05 },
                            { offset: 100, color: '#667eea', opacity: 0.00 },
                        ],
                        [
                            { offset: 0,   color: '#4facfe', opacity: 0.25 },
                            { offset: 70,  color: '#4facfe', opacity: 0.03 },
                            { offset: 100, color: '#4facfe', opacity: 0.00 },
                        ],
                    ],
                },
            },
            stroke: {
                curve: 'smooth',
                width: 2,
            },
            markers: {
                size: 3,
                hover: { size: 6 },
            },
            dataLabels: { enabled: false },
            legend:     { show: false },
            xaxis: {
                categories: trend.map(t => t.label),
                axisBorder: { show: false },
                axisTicks:  { show: false },
                labels: {
                    rotate: 0,
                    style:  { colors: 'rgba(255,255,255,0.4)', fontSize: '11px' },
                },
                tooltip: { enabled: false },
            },
            yaxis: {
                min: 0,
                labels: {
                    style: { colors: 'rgba(255,255,255,0.4)', fontSize: '11px' },
                    formatter: v =>
                        v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(Math.round(v)),
                },
            },
            grid: {
                borderColor: 'rgba(255,255,255,0.04)',
                xaxis: { lines: { show: false } },
                yaxis: { lines: { show: true  } },
            },
            tooltip: {
                theme: 'dark',
                shared: true,
                intersect: false,
                style: { fontSize: '12px' },
                y: { formatter: v => v.toLocaleString() },
            },
        };
    }

    // ─── Data Normalisation ───────────────────────────────────────────────────

    _buildTrend() {
        const raw = this.props.trend || [];

        if (raw.length) {
            return raw.map(t => ({
                label:  this._fmtDate(t.timestamp),
                clicks: Number(t.clicks)       || 0,
                unique: Number(t.uniqueClicks) || 0,
            }));
        }

        // Fallback: synthesise from dailyClicks dict if provided
        const daily = this.props.dailyClicks || {};
        return Object.entries(daily)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([date, clicks]) => ({
                label:  this._fmtDate(date),
                clicks: Number(clicks) || 0,
                unique: 0,
            }));
    }

    _fmtDate(ts) {
        if (!ts) return '';
        try {
            return new Date(ts).toLocaleDateString('en-US', {
                month: 'short', day: 'numeric',
            });
        } catch {
            return String(ts).slice(0, 10);
        }
    }

    _showEmpty(msg = 'No click data for this period') {
        const wrap = this.querySelector('.chart-canvas-wrap');
        if (wrap) {
            wrap.innerHTML = `
                <div class="stats-empty-mini" style="height:260px">
                    <i class="fa-solid fa-chart-area"></i>
                    <span>${msg}</span>
                </div>`;
        }
    }

    // ─── Public API ───────────────────────────────────────────────────────────

    /**
     * Update the chart with a new trend array.
     *
     * Called by AnalyticsPage's store subscriber on every analytics state change
     * (e.g. after a date-filter preset change):
     *   if (this.#clicksChart?.isMounted) this.#clicksChart.update(state.timeSeries?.trend ?? []);
     *
     * When the chart is already rendered, uses ApexCharts' in-place update APIs
     * (updateOptions for categories + updateSeries for data) so the DOM is not
     * torn down and rebuilt — far cheaper than a full destroy/reinit.
     *
     * When the chart was previously in an empty state (no data) and new data
     * arrives, _initChart() is called to render it from scratch.
     *
     * @param {Array} trend - Raw trend array from timeSeries.trend
     */
    async update(trend) {
        this.props.trend       = trend ?? [];
        this.props.dailyClicks = {};   // clear the fallback dict

        if (!this.isMounted) return;

        const built = this._buildTrend();

        // Transitioning to empty state
        if (!built.length) {
            if (this._chart) {
                this._chart.destroy();
                this._chart = null;
            }
            this._showEmpty();
            return;
        }

        // Transitioning from empty state → has data
        if (!this._chart) {
            await this._initChart();
            return;
        }

        // Fast in-place update — chart already rendered
        // Step 1: sync x-axis labels (non-animated, immediate)
        await this._chart.updateOptions({
            xaxis: { categories: built.map(t => t.label) },
        }, false /* redrawPaths */, false /* animate */);

        // Step 2: swap series data (animated)
        this._chart.updateSeries([
            { name: 'Total Clicks',  data: built.map(t => t.clicks) },
            { name: 'Unique Clicks', data: built.map(t => t.unique) },
        ], true /* animate */);
    }
}

export default ClicksChart;