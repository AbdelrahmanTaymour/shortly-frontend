/**
 * ClicksChart  –  src/ui/ProfileHeaderCard/Analytics/ClicksChart.js
 */

import './ClicksChart.css';
import BaseComponent from '../../../base/BaseComponent.js';
import {loadChartJs} from '../../../../utils/ChartLoader.js';

class ClicksChart extends BaseComponent {
    constructor(container, props = {}) {
        super(container, props);
        this._chart = null;
        this._canvasId = `cc-${Math.random().toString(36).slice(2, 8)}`;
    }

    // ─── lifecycle ──────────────────────────────────────────────────────────

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
                <div class="chart-canvas-wrap" style="position:relative;height:260px">
                    <canvas id="${this._canvasId}"></canvas>
                </div>
            </div>`;
    }

    async mount() {
        await super.mount();
        await this._initChart();
    }

    async unmount() {
        this._destroyChart();
        await super.unmount();
    }

    async destroy() {
        this._destroyChart();
        await super.destroy();
    }

    // ─── chart ──────────────────────────────────────────────────────────────

    _destroyChart() {
        if (this._chart) {
            this._chart.destroy();
            this._chart = null;
        }
    }

    async _initChart() {
        const trend = this._buildTrend();

        if (!trend.length) {
            this._showEmpty();
            return;
        }

        try {
            const Chart = await loadChartJs();
            const canvas = this.querySelector(`#${this._canvasId}`);
            if (!canvas) return;

            const ctx = canvas.getContext('2d');
            const gP = ctx.createLinearGradient(0, 0, 0, 260);
            gP.addColorStop(0, 'rgba(102,126,234,0.35)');
            gP.addColorStop(0.7, 'rgba(102,126,234,0.05)');
            gP.addColorStop(1, 'rgba(102,126,234,0)');

            const gB = ctx.createLinearGradient(0, 0, 0, 260);
            gB.addColorStop(0, 'rgba(79,172,254,0.25)');
            gB.addColorStop(0.7, 'rgba(79,172,254,0.03)');
            gB.addColorStop(1, 'rgba(79,172,254,0)');

            this._chart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: trend.map(t => t.label),
                    datasets: [
                        {
                            label: 'Total Clicks',
                            data: trend.map(t => t.clicks),
                            borderColor: '#667eea',
                            backgroundColor: gP,
                            fill: true,
                            tension: 0.4,
                            borderWidth: 2,
                            pointRadius: 3,
                            pointHoverRadius: 6,
                            pointBackgroundColor: '#667eea',
                        },
                        {
                            label: 'Unique Clicks',
                            data: trend.map(t => t.unique),
                            borderColor: '#4facfe',
                            backgroundColor: gB,
                            fill: true,
                            tension: 0.4,
                            borderWidth: 2,
                            pointRadius: 3,
                            pointHoverRadius: 6,
                            pointBackgroundColor: '#4facfe',
                        },
                    ],
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    animations: trend.length > 100 ? false : { duration: 1000 },
                    interaction: {intersect: false, mode: 'index'},
                    plugins: {
                        legend: {display: false},
                        tooltip: {
                            backgroundColor: 'rgba(10,10,30,0.95)',
                            borderColor: 'rgba(255,255,255,0.08)',
                            borderWidth: 1,
                            titleColor: '#fff',
                            bodyColor: 'rgba(255,255,255,0.65)',
                            padding: 12,
                            cornerRadius: 8,
                            callbacks: {
                                label: ctx => ` ${ctx.dataset.label}: ${ctx.raw.toLocaleString()}`
                            }
                        },
                    },
                    scales: {
                        x: {
                            grid: {color: 'rgba(255,255,255,0.04)'},
                            ticks: {color: 'rgba(255,255,255,0.4)', maxTicksLimit: 10, font: {size: 11}},
                            border: {color: 'rgba(255,255,255,0.06)'},
                        },
                        y: {
                            grid: {color: 'rgba(255,255,255,0.04)'},
                            ticks: {color: 'rgba(255,255,255,0.4)', font: {size: 11}},
                            border: {color: 'rgba(255,255,255,0.06)'},
                            beginAtZero: true,
                        },
                    },
                },
            });
        } catch (err) {
            console.error('[ClicksChart] init failed:', err);
            this._showEmpty('Chart unavailable');
        }
    }

    // ─── data normalization ─────────────────────────────────────────────────

    _buildTrend() {
        const raw = this.props.trend || [];

        if (raw.length) {
            return raw.map(t => ({
                label: this._fmtDate(t.timestamp),
                clicks: Number(t.clicks) || 0,
                unique: Number(t.uniqueClicks) || 0,
            }));
        }

        // Fallback: build from dailyClicks dict if provided
        const daily = this.props.dailyClicks || {};
        return Object.entries(daily)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([date, clicks]) => ({
                label: this._fmtDate(date),
                clicks: Number(clicks) || 0,
                unique: 0,
            }));
    }

    _fmtDate(ts) {
        if (!ts) return '';
        try {
            return new Date(ts).toLocaleDateString('en-US', {month: 'short', day: 'numeric'});
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

    // ─── public API ─────────────────────────────────────────────────────────

    async updateData({trend, dailyClicks}) {
        this.props.trend = trend;
        this.props.dailyClicks = dailyClicks;
        this._destroyChart();
        if (this.isMounted) await this._initChart();
    }
}

export default ClicksChart;