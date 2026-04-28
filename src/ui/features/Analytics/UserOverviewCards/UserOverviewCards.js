/**
 * UserOverviewCards — Summary metric cards for the Analytics dashboard.
 *
 * PHASE 1 CHANGE:
 *   The 4th card previously showed Engagement Rate from urlPerformance.urlEngagementRate.
 *   urlPerformance is no longer in UserOverview — it moved to the UserTopUrls endpoint.
 *
 *   Replacement: "Tracked Links" card using overview.totalTrackedUrls and overview.activeUrls,
 *   which are available directly in UserOverviewMetrics.
 */

import BaseComponent from '../../../base/BaseComponent.js';
import {StatCard} from '../../Home/components/StatCard.js';
import {formatNumber} from '../../../../utils/formatting.js';

export default class UserOverviewCards extends BaseComponent {
    constructor(container, props = {}) {
        super(container, props);
        this.stats = props.stats ?? null;
    }

    render() {
        return `
            <div class="stats-overview-grid analytics-overview-grid">
                ${this.#renderCards()}
            </div>`;
    }

    #renderCards() {
        // stats is UserOverview: { overview: UserOverviewMetrics, topCountry, topReferrer }
        const o = this.stats?.overview ?? {};

        const items = [
            {
                id: 'totalUrls',
                label: 'Total Links',
                value: formatNumber(o.totalUrls),
                sub: `${formatNumber(o.activeUrls)} active`,
                icon: 'fa-link',
                accent: 'purple',
            },
            {
                id: 'totalClicks',
                label: 'Total Clicks',
                value: formatNumber(o.totalClicks),
                sub: `${formatNumber(o.uniqueClicks)} unique`,
                icon: 'fa-arrow-pointer',
                accent: 'blue',
            },
            {
                id: 'avgClicks',
                label: 'Daily Average',
                value: formatNumber(o.averageClicksPerDay),
                sub: 'clicks per day',
                icon: 'fa-heart-pulse',
                accent: 'teal',
            },
            {
                // CHANGED: was Engagement Rate from urlPerformance (no longer in overview).
                // Now shows Tracked Links — available directly in UserOverviewMetrics.
                id: 'tracked',
                label: 'Tracked Links',
                value: formatNumber(o.totalTrackedUrls),
                sub: `of ${formatNumber(o.totalUrls)} total`,
                icon: 'fa-chart-bar',
                accent: 'amber',
            },
        ];

        return items.map(item => StatCard({
            id: item.id,
            label: item.label,
            value: item.value,
            sub: item.sub,
            icon: item.icon,
            accent: item.accent,
        })).join('');
    }

    /**
     * @param {UserOverview|null} stats — { overview: UserOverviewMetrics, topCountry, topReferrer }
     */
    updateStats(stats) {
        this.stats = stats ?? null;
        const grid = this.querySelector('.stats-overview-grid');
        if (grid) grid.innerHTML = this.#renderCards();
    }
}