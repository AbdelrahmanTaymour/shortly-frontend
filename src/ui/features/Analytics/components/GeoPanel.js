/**
 * GeoPanel — Top Countries + Top Cities ranked lists.
 *
 * PHASE 1 FIX:
 *   item.count → item.clicks throughout _renderList().
 *
 *   Root cause: the backend DTO is `record StatItem(string Name, int Clicks)`
 *   which serializes to { "name": "...", "clicks": 123 }. The previous version
 *   read item.count (always undefined), making all bars render at 0% width
 *   and all totals show as 0 even when the API returned data.
 */

import BaseComponent from '../../../base/BaseComponent.js';

function fmt(n) {
    if (n == null) return '0';
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return n.toLocaleString();
}

const FLAG_MAP = {
    'United States': '🇺🇸', 'USA': '🇺🇸',
    'United Kingdom': '🇬🇧', 'UK': '🇬🇧',
    'Germany': '🇩🇪', 'France': '🇫🇷', 'India': '🇮🇳',
    'Canada': '🇨🇦', 'Australia': '🇦🇺', 'Brazil': '🇧🇷',
    'Japan': '🇯🇵', 'China': '🇨🇳', 'Russia': '🇷🇺',
    'Netherlands': '🇳🇱', 'Spain': '🇪🇸', 'Italy': '🇮🇹',
    'Mexico': '🇲🇽', 'South Korea': '🇰🇷', 'Turkey': '🇹🇷',
    'Indonesia': '🇮🇩', 'Saudi Arabia': '🇸🇦', 'Egypt': '🇪🇬',
    'Poland': '🇵🇱', 'Sweden': '🇸🇪', 'Norway': '🇳🇴',
    'Other': '🌐', 'Unknown': '🌐',
};

class GeographyPanel extends BaseComponent {
    constructor(container, props = {}) {
        super(container, props);
        this.geography = props.geography || {};
    }

    render() {
        const geo = this.geography;
        return `
            <div class="stats-two-column geo-panel">
                <div class="stats-chart-card">
                    <div class="chart-card-header">
                        <h3>Top Countries</h3>
                        ${geo.totalCountries
            ? `<span class="chart-badge">${geo.totalCountries} countries</span>`
            : ''}
                    </div>
                    <div class="stats-ranked-list">
                        ${this._renderList(geo.topCountries, 'bar-purple', this._countryIcon.bind(this))}
                    </div>
                </div>
                <div class="stats-chart-card">
                    <div class="chart-card-header">
                        <h3>Top Cities</h3>
                        ${geo.totalCities
            ? `<span class="chart-badge">${geo.totalCities} cities</span>`
            : ''}
                    </div>
                    <div class="stats-ranked-list">
                        ${this._renderList(geo.topCities, 'bar-teal', this._cityIcon.bind(this))}
                    </div>
                </div>
            </div>`;
    }

    // ── Shared renderer ───────────────────────────────────────────────────────

    _renderList(items, barClass, iconFn) {
        if (!items?.length) {
            return this._empty('No geographic data for this period');
        }

        // FIXED: item.clicks (backend: StatItem.Clicks) — was item.count (always undefined)
        const max = items[0].clicks || 1;
        const total = items.reduce((s, item) => s + (item.clicks || 0), 0) || 1;

        return items.map((item, i) => {
            const isOther = item.name === 'Other' || item.name === 'Unknown';
            // FIXED: item.clicks (was item.count)
            const barPct = ((item.clicks / max) * 100).toFixed(1);
            const sharePct = ((item.clicks / total) * 100).toFixed(1);

            return `
                <div class="ranked-item${isOther ? ' ranked-item--other' : ''}">
                    <div class="ranked-pos">${isOther ? '·' : i + 1}</div>
                    <div class="ranked-flag">${iconFn(item.name)}</div>
                    <div class="ranked-body">
                        <div class="ranked-row">
                            <span class="ranked-label">${this.escapeHtml(item.name || 'Unknown')}</span>
                            <!-- FIXED: item.clicks (was item.count) -->
                            <span class="ranked-value">${fmt(item.clicks)} <em>${sharePct}%</em></span>
                        </div>
                        <div class="ranked-bar">
                            <div class="ranked-bar-fill ${barClass}" style="width:${barPct}%"></div>
                        </div>
                    </div>
                </div>`;
        }).join('');
    }

    // ── Icon helpers ──────────────────────────────────────────────────────────

    _countryIcon(name) {
        return FLAG_MAP[name] ?? '🌐';
    }

    _cityIcon() {
        return `<i class="fa-solid fa-city" style="font-size:0.8rem;color:var(--text-muted)"></i>`;
    }

    _empty(msg) {
        return `
            <div class="stats-empty-mini">
                <i class="fa-solid fa-globe"></i>
                <span>${msg}</span>
            </div>`;
    }

    // ── Public API ────────────────────────────────────────────────────────────

    update(geography) {
        this.geography = geography || {};
        const root = this.querySelector('.geo-panel');
        if (!root) return;
        const temp = document.createElement('div');
        temp.innerHTML = this.render();
        root.replaceWith(temp.firstElementChild);
    }
}

export default GeographyPanel;