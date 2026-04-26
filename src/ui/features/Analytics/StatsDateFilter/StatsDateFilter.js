/**
 * StatsDateFilter — Date range preset selector (7D / 30D / 90D / All Time).
 *
 * ─── FIX ─────────────────────────────────────────────────────────────────────
 *
 * emit('dateChange', ...) → this.container.dispatchEvent(CustomEvent)
 *
 * LinkStatsPage listens via:
 *   this.attachListener(el, 'dateChange', handler)
 * which expects a DOM CustomEvent on el (the #dateFilterMount container).
 * BaseComponent.emit() dispatches to object-level .on() callbacks — never
 * reaches the DOM listener. Fixed by dispatching directly on the container.
 *
 * EXPORTS:
 * - default: StatsDateFilter class
 * - named:   getDateRange(preset) — utility consumed by LinkStatsPage
 */

import './StatsDateFilter.css';
import BaseComponent from '../../../base/BaseComponent.js';

export const PRESETS = [
    {key: '7d', label: '7D', full: 'Last 7 Days'},
    {key: '30d', label: '30D', full: 'Last 30 Days'},
    {key: '90d', label: '90D', full: 'Last 90 Days'},
    {key: 'all', label: 'All Time', full: 'All Time'},
];

/**
 * Compute ISO date range from a preset key.
 * Exported so LinkStatsPage can call getDateRange('30d') in its constructor
 * without needing to instantiate StatsDateFilter first.
 *
 * @param {string} preset — '7d' | '30d' | '90d' | 'all'
 * @returns {{ startDate: string|null, endDate: string|null }}
 */
export function getDateRange(preset) {
    if (preset === 'all') return {startDate: null, endDate: null};

    const days = {'7d': 6, '30d': 29, '90d': 89}[preset] ?? 29;

    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999);

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    return {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
    };
}

export default class StatsDateFilter extends BaseComponent {
    constructor(container, props = {}) {
        super(container, props);
        this.activePreset = props.activePreset || '30d';
    }

    render() {
        return `
            <div class="stats-date-filter" role="group" aria-label="Date range selector">
                ${PRESETS.map(p => `
                    <button
                        class="date-preset-btn${this.activePreset === p.key ? ' active' : ''}"
                        data-preset="${p.key}"
                        title="${p.full}"
                        aria-pressed="${this.activePreset === p.key}"
                        type="button"
                    >${p.label}</button>
                `).join('')}
            </div>
        `;
    }

    setupEventListeners() {
        this.querySelectorAll('[data-preset]').forEach(btn => {
            this.attachListener(btn, 'click', () => {
                const preset = btn.dataset.preset;
                if (preset === this.activePreset) return;
                this.#select(preset, true);
            });
        });
    }

    // ─── Private ──────────────────────────────────────────────────────────────

    #select(preset, emitEvent = false) {
        this.activePreset = preset;

        this.querySelectorAll('[data-preset]').forEach(b => {
            const isActive = b.dataset.preset === preset;
            b.classList.toggle('active', isActive);
            b.setAttribute('aria-pressed', String(isActive));
        });

        if (emitEvent) {
            // DOM CustomEvent — LinkStatsPage listens via attachListener(el, 'dateChange', ...)
            this.container.dispatchEvent(
                new CustomEvent('dateChange', {
                    detail: {preset, ...getDateRange(preset)},
                    bubbles: true,
                })
            );
        }
    }

    // ─── Public API ───────────────────────────────────────────────────────────

    /** @returns {{ startDate: string|null, endDate: string|null }} */
    getDateRange() {
        return getDateRange(this.activePreset);
    }

    /** Set a preset programmatically without firing a DOM event. */
    setPreset(key) {
        this.#select(key, false);
    }
}