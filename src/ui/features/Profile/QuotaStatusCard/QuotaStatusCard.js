/**
 * QuotaStatusCard  –  src/ui/ProfileHeaderCard/Profile/QuotaStatusCard.js
 */

import BaseComponent from '../../../base/BaseComponent.js';

const PLAN_LABELS = {
    0: 'Free',
    1: 'Pro',
    2: 'Business',
    3: 'Enterprise',
    Free: 'Free',
    Pro: 'Pro',
    Business: 'Business',
    Enterprise: 'Enterprise',
};

const PLAN_ICON = {
    0: 'fa-solid fa-seedling',
    1: 'fa-solid fa-bolt',
    2: 'fa-solid fa-rocket',
    3: 'fa-solid fa-crown',
    Free: 'fa-solid fa-seedling',
    Pro: 'fa-solid fa-bolt',
    Business: 'fa-solid fa-rocket',
    Enterprise: 'fa-solid fa-crown',
};

class QuotaStatusCard extends BaseComponent {
    /**
     * @param {Element} container
     * @param {{ quota: Object }} props
     */
    constructor(container, props) {
        super(container, props);
    }

    // ─── Helpers ───────────────────────────────────────────────────────────────

    _barColor(pct, isExhausted, isNear) {
        if (isExhausted) return 'bar--danger';
        if (isNear) return 'bar--warning';
        return 'bar--primary';
    }

    _formatReset(iso) {
        if (!iso) return '—';
        return new Date(iso).toLocaleDateString(undefined, {month: 'long', day: 'numeric', year: 'numeric'});
    }

    _safeNum(v) {
        const n = Number(v);
        return isNaN(n) ? 0 : n;
    }

    _pct(q, key) {
        return Math.min(100, Math.round(this._safeNum(q[key]) * 10) / 10);
    }

    // ─── Render ────────────────────────────────────────────────────────────────

    render() {
        const q = this.props.quota || {};
        const plan = q.subscriptionPlan ?? 0;

        const linkPct = this._pct(q, 'linksUsagePercentage');
        const qrPct = this._pct(q, 'qrCodesUsagePercentage');

        const linkColor = this._barColor(linkPct, q.isLinksQuotaExhausted, q.isNearLinksQuotaLimit);
        const qrColor = this._barColor(qrPct, q.isQrCodesQuotaExhausted, q.isNearQrCodesQuotaLimit);

        const planLabel = PLAN_LABELS[plan] || 'Free';
        const planIcon = PLAN_ICON[plan] || 'fa-solid fa-seedling';

        return `
        <div class="quota-card">
            <!-- Card header -->
            <div class="quota-card-header">
                <div>
                    <h3 class="quota-card-title">
                        <i class="fa-solid fa-gauge-high" aria-hidden="true"></i>
                        Usage &amp; Quota
                    </h3>
                    <p class="quota-card-subtitle">Your monthly resource usage</p>
                </div>
                <span class="quota-plan-badge">
                    <i class="${this.escapeHtml(planIcon)}" aria-hidden="true"></i>
                    ${this.escapeHtml(planLabel)}
                </span>
            </div>

            <!-- Links quota -->
            <div class="quota-meter">
                <div class="quota-meter-header">
                    <span class="quota-meter-label">
                        <i class="fa-solid fa-link" aria-hidden="true"></i>
                        Short Links
                    </span>
                    <span class="quota-meter-counts">
                        <strong>${this._safeNum(q.usedLinksThisMonth)}</strong>
                        <span class="quota-meter-sep">/</span>
                        <span>${this._safeNum(q.maxLinksPerMonth)}</span>
                        <span class="quota-meter-unit">used</span>
                    </span>
                </div>
                <div class="quota-bar-track" role="progressbar" aria-valuenow="${linkPct}" aria-valuemin="0" aria-valuemax="100" aria-label="Links usage: ${linkPct}%">
                    <div class="quota-bar-fill ${linkColor}" style="width: ${linkPct}%"></div>
                </div>
                <div class="quota-meter-footer">
                    <span class="quota-remaining ${q.isLinksQuotaExhausted ? 'quota-remaining--exhausted' : ''}">
                        ${q.isLinksQuotaExhausted
            ? '<i class="fa-solid fa-circle-xmark"></i> Quota exhausted'
            : `<i class="fa-solid fa-circle-check"></i> <strong>${this._safeNum(q.remainingLinksThisMonth)}</strong> remaining this month`
        }
                    </span>
                    <span class="quota-pct">${linkPct}%</span>
                </div>
                ${q.isNearLinksQuotaLimit && !q.isLinksQuotaExhausted ? `
                <p class="quota-warning">
                    <i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i>
                    You're approaching your links limit.
                </p>` : ''}
            </div>

            <!-- QR codes quota -->
            <div class="quota-meter">
                <div class="quota-meter-header">
                    <span class="quota-meter-label">
                        <i class="fa-solid fa-qrcode" aria-hidden="true"></i>
                        QR Codes
                    </span>
                    <span class="quota-meter-counts">
                        <strong>${this._safeNum(q.usedQrCodesThisMonth)}</strong>
                        <span class="quota-meter-sep">/</span>
                        <span>${this._safeNum(q.maxQrCodesPerMonth)}</span>
                        <span class="quota-meter-unit">used</span>
                    </span>
                </div>
                <div class="quota-bar-track" role="progressbar" aria-valuenow="${qrPct}" aria-valuemin="0" aria-valuemax="100" aria-label="QR codes usage: ${qrPct}%">
                    <div class="quota-bar-fill ${qrColor}" style="width: ${qrPct}%"></div>
                </div>
                <div class="quota-meter-footer">
                    <span class="quota-remaining ${q.isQrCodesQuotaExhausted ? 'quota-remaining--exhausted' : ''}">
                        ${q.isQrCodesQuotaExhausted
            ? '<i class="fa-solid fa-circle-xmark"></i> Quota exhausted'
            : `<i class="fa-solid fa-circle-check"></i> <strong>${this._safeNum(q.remainingQrCodesThisMonth)}</strong> remaining this month`
        }
                    </span>
                    <span class="quota-pct">${qrPct}%</span>
                </div>
                ${q.isNearQrCodesQuotaLimit && !q.isQrCodesQuotaExhausted ? `
                <p class="quota-warning">
                    <i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i>
                    You're approaching your QR codes limit.
                </p>` : ''}
            </div>

            <!-- Reset info -->
            <div class="quota-reset-info">
                <i class="fa-solid fa-rotate" aria-hidden="true"></i>
                Quota resets on <strong>${this._formatReset(q.quotaResetDate)}</strong>
                ${q.daysUntilQuotaReset != null
            ? `<span class="quota-days-badge">${this._safeNum(q.daysUntilQuotaReset)} days left</span>`
            : ''}
            </div>
        </div>`;
    }
}

export default QuotaStatusCard;