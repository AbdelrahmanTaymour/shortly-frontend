/**
 * StatCard — Pure function component for a single statistics summary card.
 *
 * RESPONSIBILITY: Render one stat card as an HTML string.
 * No state, no events, no DOM side effects.
 *
 * MOVED TO: src/ui/features/Home/StatCard/StatCard.js
 *
 * ─── FIX FROM LEGACY ─────────────────────────────────────────────────────────
 * Legacy import: '../../../../../src/utils/formatting.js' (absolute traversal)
 * Fixed import:  '../../../utils/formatting.js' (correct relative path)
 *
 * @param {{ label: string, value: number|null, icon: string, change: number|null }} stat
 * @returns {string} HTML string
 */

export const StatCard = ({label, value, icon, sub}) => `
    <div class="stat-card" role="region" aria-label="${label}">
        <div class="stat-header">
            <div class="stat-title">${label}</div>
            <div class="stat-icon" aria-hidden="true">
                <i class="fa-solid ${icon}"></i>
            </div>
        </div>
        <div class="stat-value" aria-label="${label}: ${value}">${value}</div>
        <div class="stat-change stat-change--neutral">${sub}</div>
    </div>
`;