/**
 * DashboardPageHeader — Generic dashboard page header component.
 *
 * Replaces the three different ad-hoc header patterns that previously existed:
 *   • LinksPage:        .links-section-header   (h1 + create button)
 *   • AnalyticsPage:    .stats-page-header       (icon + title + date filter)
 *   • LinkStatsPage:    .stats-page-header       (back btn + favicon + title + date filter)
 */

import BaseComponent from '../../base/BaseComponent.js';

export default class DashboardPageHeader extends BaseComponent {
    render() {
        const {
            variant = 'default',
            backButton = false,
            icon = null,
            iconColor = "var(--accent-purple, #a78bfa)",
            faviconSrc = null,
            title = '',
            subtitle = null,
            subtitleHtml = null,
        } = this.props;


        // ── Favicon / icon area ───────────────────────────────────────────────
        let faviconHtml;
        if (faviconSrc) {
            faviconHtml = `
                <div class="stats-link-favicon" aria-hidden="true">
                    <img
                        src="${this.escapeHtml(faviconSrc)}"
                        alt=""
                        onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
                    <div class="favicon-fallback" style="display:none">
                        <i class="fa-solid fa-link"></i>
                    </div>
                </div>`;
        } else if (icon) {
            const colorStyle = iconColor ? ` style="color:${iconColor}"` : '';
            faviconHtml = `
                <div class="stats-link-favicon" aria-hidden="true">
                    <i class="fa-solid ${this.escapeHtml(icon)}"${colorStyle}></i>
                </div>`;
        } else {
            faviconHtml = '';
        }

        // ── Subtitle area ─────────────────────────────────────────────────────
        let subtitleAreaHtml = '';
        if (subtitleHtml) {
            subtitleAreaHtml = `<div class="stats-link-urls">${subtitleHtml}</div>`;
        } else if (subtitle) {
            subtitleAreaHtml = `
                <div class="stats-link-urls">
                    <span class="stats-origin-url">${this.escapeHtml(subtitle)}</span>
                </div>`;
        }

        // ── Back button ───────────────────────────────────────────────────────
        const backBtnHtml = backButton ? `
            <button
                class="stats-back-btn"
                id="pageHeaderBackBtn"
                type="button"
                title="Go back"
                aria-label="Go back">
                <i class="fa-solid fa-arrow-left" aria-hidden="true"></i>
            </button>` : '';

        return `
            <div class="stats-page-header">
                <div class="stats-header-left">
                    ${backBtnHtml}
                    <div class="stats-link-info">
                        ${faviconHtml}
                        <div class="stats-link-details">
                            <h2>${this.escapeHtml(title)}</h2>
                            ${subtitleAreaHtml}
                        </div>
                    </div>
                </div>
                <!--
                    Right slot — parent fills this after mounting:
                      const slot = this.querySelector('.page-header-right-slot');
                      slot.innerHTML = '...' or mount a component into it
                -->
                <div class="page-header-right-slot"></div>
            </div>
        `;
    }

    setupEventListeners() {
        const backBtn = this.querySelector('#pageHeaderBackBtn');
        if (backBtn) {
            this.attachListener(backBtn, 'click', () => {
                this.container.dispatchEvent(
                    new CustomEvent('header:back', {bubbles: true})
                );
            });
        }
    }

    // ─── Public API ───────────────────────────────────────────────────────────

    /**
     * Returns the right-slot element so the parent can mount components into it.
     * Always use this after the component is mounted.
     * @returns {HTMLElement|null}
     */
    getRightSlot() {
        return this.querySelector('.page-header-right-slot');
    }

    /**
     * Update the title text in-place without remounting.
     * @param {string} newTitle
     */
    updateTitle(newTitle) {
        const h2 = this.querySelector('.stats-link-details h2');
        if (h2) h2.textContent = newTitle;
    }

    /**
     * Update the subtitle in-place.
     * @param {string} html — pre-escaped HTML string
     */
    updateSubtitleHtml(html) {
        const urls = this.querySelector('.stats-link-urls');
        if (urls) urls.innerHTML = html;
    }
}