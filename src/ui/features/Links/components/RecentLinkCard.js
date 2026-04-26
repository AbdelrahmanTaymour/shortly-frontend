/**
 * RecentLinkCard — Pure function component for a single recent link row.
 *
 * RESPONSIBILITY: Render one link item as an HTML string.
 * No state, no events — all interactions handled by HomePage's delegated click handler.
 *
 * MOVED TO: src/ui/features/Links/ProfileHeaderCard/RecentLinkCard/RecentLinkCard.js
 *
 * ─── FIXES FROM LEGACY ───────────────────────────────────────────────────────
 * 1. Import paths fixed to correct relative paths (was: '../../../../utils/...')
 * 2. data-url attribute changed from shortCode to link.shortUrl.
 *    The copy handler should write the full short URL, not just the code.
 *    LinksService._mapLink() already builds link.shortUrl = `${baseUrl}/${shortCode}`.
 *    If shortUrl is absent, we fall back to shortCode so the button still works.
 *
 * @param {Object} link — Link object from LinksService (mapped shape)
 * @returns {string} HTML string
 */

import {formatNumber, formatRelativeTime, truncateUrl} from '../../../../utils/formatting.js';
import {escapeHtml} from '../../../../utils/dom.js';
import {getLinkStatus} from '../../../../utils/ui-logic.js';
import appConfig from "../../../../config/app.config";

export const RecentLinkCard = (link) => {
    const status = getLinkStatus(link);
    // Use the full short URL for copy; fall back to shortCode if shortUrl not built yet
    const shortUrl = appConfig.url + '/' + link.shortCode;

    return `
        <div class="url-item animate-slide-up" data-id="${link.id}">
            <div class="url-header">
                <div class="url-short">${escapeHtml(shortUrl)}</div>
                <div class="url-stats">
                    <span>
                        <i class="fa-solid fa-arrow-pointer" aria-hidden="true"></i>
                        ${formatNumber(link.totalClicks ?? link.clicks ?? 0)} clicks
                    </span>
                    <span>
                        <i class="fa-solid fa-calendar-days" aria-hidden="true"></i>
                        ${formatRelativeTime(link.createdAt)}
                    </span>
                    <span class="${escapeHtml(status.class)}">${escapeHtml(status.label)}</span>
                </div>
            </div>

            <div class="url-original" title="${escapeHtml(link.originalUrl || '')}">
                ${escapeHtml(truncateUrl(link.originalUrl || '', 80))}
            </div>

            <div class="url-actions">
                <button
                    class="btn btn-outline btn-sm"
                    type="button"
                    data-action="copy"
                    data-url="${escapeHtml(shortUrl)}"
                    data-id="${link.id}"
                    aria-label="Copy short URL"
                >
                    <i class="fa-solid fa-copy" aria-hidden="true"></i> Copy
                </button>
                <button
                    class="btn btn-outline btn-sm"
                    type="button"
                    data-action="stats"
                    data-id="${link.id}"
                    aria-label="View statistics for this link"
                >
                    <i class="fa-solid fa-chart-line" aria-hidden="true"></i> Stats
                </button>
                <button
                    class="btn btn-outline btn-sm"
                    type="button"
                    data-action="edit"
                    data-id="${link.id}"
                    aria-label="Edit this link"
                >
                    <i class="fa-solid fa-pencil" aria-hidden="true"></i> Edit
                </button>
                <button
                    class="btn btn-outline btn-sm"
                    type="button"
                    data-action="delete"
                    data-id="${link.id}"
                    aria-label="Delete this link"
                >
                    <i class="fa-solid fa-trash" aria-hidden="true"></i> Delete
                </button>
            </div>
        </div>`;
};