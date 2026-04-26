/**
 * EngagementPanel — Engagement metrics + Day-of-week activity pattern.
 *
 * Shared by both LinkStatsPage and AnalyticsPage.
 *
 * PROPS:
 *   engagement  — engagement metrics object
 *   timeSeries  — timeSeries object (optional; used for day-of-week chart)
 *
 * PUBLIC API:
 *   update({ engagement, timeSeries? }) — update data in-place without remount
 */

import './EngagementPanel.css';
import BaseComponent from '../../../base/BaseComponent.js';
import {formatDuration} from "../../../../utils/formatting";

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function formatHour(h) {
    if (h == null) return '--';
    const suffix = h >= 12 ? 'PM' : 'AM';
    const hour = h % 12 === 0 ? 12 : h % 12;
    return `${hour}:00 ${suffix}`;
}

function pct(n) {
    return `${((n ?? 0) * 100).toFixed(1)}%`;
}

/** True when the engagement object has at least one non-zero metric. */
function hasEngagementData(e) {
    if (!e) return false;
    return (e.newVisitors ?? 0) > 0
        || (e.returningVisitors ?? 0) > 0
        || (e.bounceRate ?? 0) > 0
        || (e.returnVisitorRate ?? 0) > 0
        || (e.clicksPerSession ?? 0) > 0;
}

export default class EngagementPanel extends BaseComponent {
    constructor(container, props = {}) {
        super(container, props);
        this.engagement = props.engagement ?? {};
        this.timeSeries = props.timeSeries ?? {};
    }

    render() {
        const e = this.engagement ?? {};
        const ts = this.timeSeries ?? {};

        return `
            <div class="engagement-panel">
                ${this.#renderDayOfWeek(ts)}
                ${this.#renderMetrics(e)}
            </div>
        `;
    }

    // ─── Private renderers ────────────────────────────────────────────────────

    #renderMetrics(e) {
        if (!hasEngagementData(e)) {
            return `
                <div class="engagement-empty-state">
                    <i class="fa-solid fa-chart-simple" aria-hidden="true"></i>
                    <p>Not enough engagement data for this period yet.</p>
                    <span class="engagement-hint">Data accumulates as visitors interact with your links.</span>
                </div>`;
        }

        return `
            <div class="engagement-grid">
                ${this.#metric('Bounce Rate', pct(e.bounceRate), 'fa-arrow-turn-up', 'amber', 'Users who clicked once and left')}
                ${this.#metric('Return Rate', pct(e.returnVisitorRate), 'fa-rotate-left', 'green', 'Visitors who came back')}
                ${this.#metric('New Visitors', (e.newVisitors ?? 0).toLocaleString(), 'fa-user-plus', 'purple', 'First-time visitors')}
                ${this.#metric('Returning', (e.returningVisitors ?? 0).toLocaleString(), 'fa-users', 'blue', 'Repeat visitors')}
                ${this.#metric('Avg Session', formatDuration(e.averageSessionDuration), 'fa-clock', 'teal', 'Average session duration')}
                ${this.#metric('Clicks / Session', (e.clicksPerSession ?? 0).toFixed(2), 'fa-computer-mouse', 'pink', 'Average clicks per session')}
            </div>`;
    }

    #metric(label, value, icon, accent, desc) {
        return `
            <div class="engagement-card">
                <div class="engagement-icon accent-${accent}" aria-hidden="true">
                    <i class="fa-solid ${icon}"></i>
                </div>
                <div class="engagement-value">${value}</div>
                <div class="engagement-label">${label}</div>
                <div class="engagement-desc">${desc}</div>
            </div>`;
    }

    #renderDayOfWeek(ts) {
        const byDay = ts?.clicksByDayOfWeek ?? {};
        const values = DAYS.map(d => byDay[d] ?? 0);
        const maxVal = Math.max(...values, 0);
        const total = values.reduce((a, b) => a + b, 0);

        const hasPeak = !!(ts?.peakDay || ts?.peakHour != null);

        // Show empty-state bars when there's no data rather than
        // all bars at the minimum 4% height which looks misleading.
        const hasData = total > 0;

        return `
            <div class="stats-chart-card engagement-dow-card">
                <div class="chart-card-header">
                    <h3>Weekly Activity Pattern</h3>
                    ${hasPeak ? `
                        <div class="peak-tags">
                            ${ts.peakDay
            ? `<span class="peak-tag">
                                       <i class="fa-solid fa-crown" aria-hidden="true"></i>
                                       ${this.escapeHtml(ts.peakDay)}
                                   </span>`
            : ''}
                            ${ts.peakHour != null
            ? `<span class="peak-tag">
                                       <i class="fa-solid fa-clock" aria-hidden="true"></i>
                                       ${formatHour(ts.peakHour)}
                                   </span>`
            : ''}
                        </div>` : ''}
                </div>

                ${hasData ? `
                <div class="dow-chart" role="img" aria-label="Weekly click distribution">
                    ${DAYS.map(day => {
            const clicks = byDay[day] ?? 0;
            const barPct = maxVal > 0
                ? Math.max((clicks / maxVal) * 100, 3).toFixed(1)
                : '3';
            const isPeak = day === ts?.peakDay;
            const share = total > 0 ? ((clicks / total) * 100).toFixed(1) : '0.0';
            return `
                            <div class="dow-col${isPeak ? ' dow-peak' : ''}"
                                 role="cell"
                                 aria-label="${day}: ${clicks.toLocaleString()} clicks (${share}%)">
                                <div class="dow-bar-track">
                                    <div class="dow-bar-fill${isPeak ? ' peak' : ''}"
                                         style="height: ${barPct}%">
                                    </div>
                                </div>
                                <div class="dow-label">${day.slice(0, 3)}</div>
                                <div class="dow-value">
                                    ${clicks > 0
                ? (clicks >= 1000 ? `${(clicks / 1000).toFixed(1)}k` : clicks)
                : ''}
                                </div>
                            </div>`;
        }).join('')}
                </div>` : `
                <div class="dow-empty">
                    <i class="fa-solid fa-calendar-xmark" aria-hidden="true"></i>
                    <span>No activity data for this period</span>
                </div>`}
            </div>
        `;
    }

    // ─── Public API ───────────────────────────────────────────────────────────

    /**
     * Update data in-place without a full unmount/remount cycle.
     *
     * @param {{ engagement?: object, timeSeries?: object }} options
     *
     * CALLERS MUST USE:
     *   panel.update({ engagement: e, timeSeries: ts })
     *
     * NOT the old two-arg form:
     *   panel.update(engagement, timeSeries)  ← removed
     */
    async update({engagement, timeSeries} = {}) {
        if (engagement !== undefined) this.engagement = engagement ?? {};
        if (timeSeries !== undefined) this.timeSeries = timeSeries ?? {};
        if (!this.isMounted) return;

        const root = this.querySelector('.engagement-panel');
        if (!root) return;
        const temp = document.createElement('div');
        temp.innerHTML = this.render();
        const newRoot = temp.firstElementChild;
        if (newRoot) root.replaceWith(newRoot);
    }
}