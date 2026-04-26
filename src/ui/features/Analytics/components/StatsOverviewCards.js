/**
 * StatsOverviewCards — Metric summary cards at the top of the stats page
 *
 * PROPS:
 * - overview: UrlStatistics['overview']
 *
 * PUBLIC API:
 * - update(overview) — patch cards in-place without remount
 *
 * Reusable on UserStatistics dashboard with the same overview shape.
 */


import BaseComponent from '../../../base/BaseComponent.js';

function fmt(n) {
    if (n == null) return '0';
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return n.toLocaleString();
}

function pct(n) {
    return `${((n || 0) * 100).toFixed(1)}%`;
}

class StatsOverviewCards extends BaseComponent {
    constructor(container, props = {}) {
        super(container, props);
        this.overview = props.overview || {};
    }

    render() {
        return `<div class="stats-overview-grid">${this._cards()}</div>`;
    }

    _cards() {
        const o = this.overview;
        console.log('OVERVIEW', o);
        return [
            {
                id: 'total',
                icon: 'fa-arrow-pointer',
                accent: 'purple',
                value: fmt(o.totalClicks),
                label: 'Total Clicks',
                sub: `${fmt(o.uniqueClicks || 0)} unique`,
            },
            {
                id: 'today',
                icon: 'fa-bolt-lightning',
                accent: 'blue',
                value: fmt(o.clicksToday),
                label: 'Today',
                sub: `${fmt(o.clicksThisWeek || 0)} this week`,
            },
            {
                id: 'month',
                icon: 'fa-calendar-days',
                accent: 'teal',
                value: fmt(o.clicksThisMonth),
                label: 'This Month',
                sub: `~${(o.averageClicksPerDay || 0).toFixed(1)} / day`,
            },
            {
                id: 'active',
                icon: 'fa-calendar-check',
                accent: 'amber',
                value: fmt(o.activeDays),
                label: 'Active Days',
                sub: `CTR ${pct(o.clickThroughRate)}`,
            },
        ].map(c => `
            <div class="stats-overview-card accent-${c.accent}" data-card="${c.id}">
                <div class="overview-icon-wrap">
                    <i class="fa-solid ${c.icon}"></i>
                </div>
                <div class="overview-value">${c.value}</div>
                <div class="overview-label">${c.label}</div>
                <div class="overview-sub">${c.sub}</div>
            </div>
        `).join('');
    }

    // ── Public API ────────────────────────────────────────────────────────

    update(overview) {
        this.overview = overview || {};
        const grid = this.querySelector('.stats-overview-grid');
        if (!grid) return;
        grid.innerHTML = this._cards();
    }
}

export default StatsOverviewCards;