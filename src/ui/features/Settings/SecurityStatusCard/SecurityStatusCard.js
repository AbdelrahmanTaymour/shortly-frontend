/**
 * SecurityStatusCard  –  src/ui/ProfileHeaderCard/Settings/SecurityStatusCard.js
 *
 * Read-only view of the user's security status: lock state, failed attempts, reason.
 */

import './SecurityStatusCard.css';
import BaseComponent from '../../../base/BaseComponent.js';

class SecurityStatusCard extends BaseComponent {
    /**
     * @param {Element} container
     * @param {{ status: import('../../types.js').UserSecurityStatusResponse|null }} props
     */
    constructor(container, props) {
        super(container, props);
    }

    // ─── Helpers ───────────────────────────────────────────────────────────────

    _formatDate(iso) {
        if (!iso) return '—';
        return new Date(iso).toLocaleString(undefined, {
            dateStyle: 'medium', timeStyle: 'short',
        });
    }

    _attemptsColor(n) {
        if (n === 0) return 'status-value--green';
        if (n < 3) return 'status-value--yellow';
        return 'status-value--red';
    }

    // ─── Render ────────────────────────────────────────────────────────────────

    render() {
        const s = this.props.status;

        if (!s) {
            return `
            <div class="settings-card">
                <div class="settings-card-header">
                    <div class="settings-card-icon settings-card-icon--orange">
                        <i class="fa-solid fa-shield" aria-hidden="true"></i>
                    </div>
                    <div>
                        <h3 class="settings-card-title">Security Status</h3>
                        <p class="settings-card-desc">Unable to load security information.</p>
                    </div>
                </div>
            </div>`;
        }

        const locked = s.isLocked;
        const attempts = s.failedAttemptsCount || 0;
        const maxAttempts = 5; // threshold for visual indicator
        const attPct = Math.min(100, (attempts / maxAttempts) * 100);

        return `
        <div class="settings-card">
            <div class="settings-card-header">
                <div class="settings-card-icon ${locked ? 'Settings-card-icon--red' : 'Settings-card-icon--green'}">
                    <i class="fa-solid ${locked ? 'fa-lock' : 'fa-unlock'}" aria-hidden="true"></i>
                </div>
                <div>
                    <h3 class="settings-card-title">Security Status</h3>
                    <p class="settings-card-desc">Overview of your account's security health.</p>
                </div>
            </div>

            <div class="settings-card-body">
                <!-- Lock status banner -->
                <div class="ssc-status-banner ${locked ? 'ssc-status-banner--locked' : 'ssc-status-banner--ok'}">
                    <i class="fa-solid ${locked ? 'fa-lock' : 'fa-unlock'}" aria-hidden="true"></i>
                    <div>
                        <strong>${locked ? 'Account Locked' : 'Account Active'}</strong>
                        <span>${locked ? 'You cannot sign in until this is resolved.' : 'Your account is in good standing.'}</span>
                    </div>
                </div>

                <!-- Details grid -->
                <div class="ssc-details">
                    ${locked ? `
                    <div class="ssc-detail-row">
                        <span class="ssc-detail-label">
                            <i class="fa-regular fa-calendar-xmark" aria-hidden="true"></i>
                            Locked Until
                        </span>
                        <span class="ssc-detail-value status-value--red">
                            ${this._formatDate(s.lockedUntil)}
                            ${s.daysUntilUnlock > 0 ? `<span class="ssc-days-badge">${s.daysUntilUnlock} day(s)</span>` : ''}
                        </span>
                    </div>
                    ${s.lockReason ? `
                    <div class="ssc-detail-row">
                        <span class="ssc-detail-label">
                            <i class="fa-solid fa-circle-info" aria-hidden="true"></i>
                            Reason
                        </span>
                        <span class="ssc-detail-value">${this.escapeHtml(s.lockReason)}</span>
                    </div>` : ''}
                    ` : ''}

                    <!-- Failed attempts -->
                    <div class="ssc-detail-row ssc-detail-row--attempts">
                        <span class="ssc-detail-label">
                            <i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i>
                            Failed Login Attempts
                        </span>
                        <span class="ssc-detail-value ${this._attemptsColor(attempts)}">
                            ${attempts} / ${maxAttempts}
                        </span>
                    </div>

                    <!-- Attempt progress -->
                    <div class="ssc-attempt-bar-wrap" aria-label="Failed attempts: ${attempts} out of ${maxAttempts}">
                        <div class="ssc-attempt-bar-track">
                            <div class="ssc-attempt-bar-fill ${attempts >= maxAttempts ? 'ssc-attempt-bar-fill--danger' : attempts >= 3 ? 'ssc-attempt-bar-fill--warn' : 'ssc-attempt-bar-fill--ok'}"
                                 style="width: ${attPct}%"
                                 role="progressbar"
                                 aria-valuenow="${attPct}"
                                 aria-valuemin="0"
                                 aria-valuemax="100">
                            </div>
                        </div>
                        <p class="ssc-attempt-hint">
                            ${attempts === 0
            ? '<i class="fa-solid fa-circle-check"></i> No recent failed attempts.'
            : attempts >= maxAttempts
                ? '<i class="fa-solid fa-circle-xmark"></i> Maximum failed attempts reached.'
                : `<i class="fa-solid fa-triangle-exclamation"></i> ${maxAttempts - attempts} more failed attempt(s) will lock your account.`
        }
                        </p>
                    </div>
                </div>

                <!-- Contact support note -->
                <p class="ssc-support-note">
                    <i class="fa-solid fa-circle-info" aria-hidden="true"></i>
                    If your account is locked unfairly, please contact
                    <a href="mailto:support@shortly.app" class="ssc-support-link">support@shortly.app</a>.
                </p>
            </div>
        </div>`;
    }
}

export default SecurityStatusCard;