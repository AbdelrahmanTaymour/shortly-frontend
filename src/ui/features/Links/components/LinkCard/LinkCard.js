
import {formatNumber, formatRelativeTime, truncateUrl} from '../../../../../utils/formatting.js';
import {escapeHtml} from '../../../../../utils/dom.js';
import {getLinkStatus} from '../../../../../utils/ui-logic.js';
import appConfig from "../../../../../config/app.config";

export const LinkCard = (link, isSelected = false) => {
    const status = getLinkStatus(link);
    const shortUrl = appConfig.url + '/' + link.shortCode;
    const domain = (() => {
        try {
            return new URL(link.originalUrl).hostname;
        } catch {
            return '';
        }
    })();

    const isActive = link.isActive ?? link.active ?? true;
    const hasPassword = !!(link.hasPassword || link.isPasswordProtected);
    const isPrivate = !!(link.isPrivate);
    const noteText = link.note || link.description || '';

    const lockIcon = hasPassword
        ? `<i class="fa-solid fa-lock link-lock-icon" title="Password protected"></i>`
        : '';

    const noteIndicator = noteText
        ? `<span class="link-meta-item link-note-indicator tooltip" data-tooltip="${escapeHtml(noteText)}">
               <i class="fa-solid fa-note-sticky"></i>
           </span>`
        : '';

    return `
        <div class="link-card${isSelected ? ' selected' : ''}" data-link-id="${link.id}">

            <div class="link-checkbox-wrapper">
                <div class="link-checkbox${isSelected ? ' checked' : ''}"
                     data-action="select"
                     data-id="${link.id}"
                     role="checkbox"
                     aria-checked="${isSelected ? 'true' : 'false'}"
                     tabindex="0">
                </div>
            </div>

            <div class="link-favicon">
                <img src="https://www.google.com/s2/favicons?domain=${domain}&sz=32"
                     alt=""
                     onerror="this.style.display='none';this.nextElementSibling.style.display='block';">
                <i class="fa-solid fa-link default-icon" style="display:none;"></i>
            </div>

            <div class="link-content">
                <div class="link-title-row">
                    <span class="link-title">
                        ${link.title ? escapeHtml(link.title) : escapeHtml(truncateUrl(link.originalUrl, 40))}
                    </span>
                    ${lockIcon}
                </div>

                <div class="link-short-url"
                     data-tooltip="Click to copy"
                     data-action="copy-url"
                     data-id="${link.id}"
                     data-url="${escapeHtml(shortUrl)}">
                    <span>${escapeHtml(shortUrl)}</span>
                    <span class="copy-hint"><i class="fa-solid fa-copy"></i></span>
                </div>

                <div class="link-meta">
                    <span class="link-meta-item">
                        <i class="fa-solid fa-arrow-pointer"></i>
                        ${formatNumber(link.totalClicks)} clicks
                    </span>
                    <span class="link-status ${status.class}">${status.label}</span>
                    <span class="link-meta-item">
                        <i class="fa-solid fa-clock"></i>
                        ${formatRelativeTime(link.createdAt)}
                    </span>
                    ${noteIndicator}
                </div>
            </div>

            <div class="link-actions">
                <button class="link-action-btn primary"
                        data-action="stats"
                        data-id="${link.id}"
                        title="View Statistics">
                    <i class="fa-solid fa-chart-line"></i>
                </button>
                <button class="link-action-btn"
                        data-action="copy"
                        data-url="${escapeHtml(shortUrl)}"
                        data-id="${link.id}"
                        title="Copy Link">
                    <i class="fa-solid fa-copy"></i>
                </button>
                <div class="link-dropdown">
                    <button class="link-action-btn"
                            data-action="toggle-dropdown"
                            title="More Actions"
                            aria-haspopup="true"
                            aria-expanded="false">
                        <i class="fa-solid fa-ellipsis-vertical"></i>
                    </button>
                    <div class="link-dropdown-menu" role="menu">
                        <button class="link-dropdown-item" data-action="stats" data-id="${link.id}" role="menuitem">
                            <i class="fa-solid fa-chart-line"></i> Statistics
                        </button>
                        <button class="link-dropdown-item" data-action="edit" data-id="${link.id}" role="menuitem">
                            <i class="fa-solid fa-pencil"></i> Edit
                        </button>

                        <!-- FIX 1: uses isActive (not link.active) for correct label & icon -->
                        <button class="link-dropdown-item" data-action="toggle-active" data-id="${link.id}" role="menuitem">
                            <i class="fa-solid fa-${isActive ? 'pause' : 'play'}"></i>
                            ${isActive ? 'Deactivate' : 'Activate'}
                        </button>

                        <!-- FIX 1: uses isPrivate for correct label & icon -->
                        <button class="link-dropdown-item" data-action="toggle-private" data-id="${link.id}" role="menuitem">
                            <i class="fa-solid fa-${isPrivate ? 'eye' : 'eye-slash'}"></i>
                            ${isPrivate ? 'Make Public' : 'Make Private'}
                        </button>

                        <button class="link-dropdown-item" data-action="reset-stats" data-id="${link.id}" role="menuitem">
                            <i class="fa-solid fa-rotate-left"></i> Reset Stats
                        </button>
                        <div class="link-dropdown-divider"></div>
                        <button class="link-dropdown-item danger" data-action="delete" data-id="${link.id}" role="menuitem">
                            <i class="fa-solid fa-trash"></i> Delete
                        </button>
                    </div>
                </div>
            </div>

        </div>`;
};