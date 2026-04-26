/**
 * TopLinksPanel — Ranked list of top-performing URLs.
 */

import './TopUrlsPanel.css';
import BaseComponent from '../../../base/BaseComponent.js';
import {formatDate, formatNumber} from '../../../../utils/formatting.js';
import appConfig from "../../../../config/app.config";

export default class TopLinksPanel extends BaseComponent {
    constructor(container, props = {}) {
        super(container, props);
        this.links = props.links ?? [];
    }

    render() {
        return `<div class="top-links-panel">${this.#renderList()}</div>`;
    }

    #renderList() {
        if (!this.links?.length) {
            return `
                <div class="stats-empty-mini">
                    <i class="fa-solid fa-chart-bar" aria-hidden="true"></i>
                    <span>No link data available for this period</span>
                </div>`;
        }

        const rows = this.links.slice(0, 10).map((link, i) => {
            const domain = (() => {
                try {
                    return new URL(link.originalUrl).hostname;
                } catch {
                    return '';
                }
            })();
            const clicks = link.totalClicks ?? link.clicks ?? 0;
            const title = link.originalUrl || 'Untitled';
            const shortCode = link.shortCode || '';
            const shortUrl = appConfig.url + '/' + shortCode;
            const origUrl = link.originalUrl || '';
            const createdAt = link.createdAt ?? '';

            return `
                <div class="top-link-row" data-id="${link.shortUrlId}" role="row" tabindex="0"
                     aria-label="${this.escapeHtml(title)}: ${formatNumber(clicks)} clicks">
                    <div class="top-link-rank">${i + 1}</div>
                    
                    <div class="link-favicon">
                        <img src="https://www.google.com/s2/favicons?domain=${domain}&sz=32"
                             alt=""
                             onerror="this.style.display='none';this.nextElementSibling.style.display='block';">
                        <i class="fa-solid fa-link default-icon" style="display:none;"></i>
                    </div>

                    <div class="top-link-info">
                        <div class="top-link-title" title="Original Url">${this.escapeHtml(title)}</div>
                        <div class="top-link-urls">
                            <a class="top-link-short"
                               title="${this.escapeHtml(shortUrl)}"
                               href="${this.escapeHtml(shortUrl)}"
                               target="_blank"
                               rel="noopener noreferrer"
                               tabindex="-1">
                                <i class="fa-solid fa-arrow-up-right-from-square" aria-hidden="true"></i>
                                ${this.escapeHtml(shortCode)}
                            </a>
                            ${origUrl ? `<span class="top-link-orig" title="${formatDate(createdAt)}">${formatDate(createdAt)}</span>` : ''}
                        </div>
                    </div>

                    <div class="top-link-clicks">
                        <span class="top-link-clicks-val">${formatNumber(clicks)}</span>
                        <span class="top-link-clicks-lbl">clicks</span>
                    </div>
                </div>`;
        }).join('');

        return `
            <div class="top-links-list" role="table" aria-label="Top performing links">
                ${rows}
            </div>`;
    }

    setupEventListeners() {
        // Delegated click — works even after updateLinks() replaces innerHTML
        this.attachListener(this.container, 'click', (e) => {
            const row = e.target.closest('.top-link-row[data-id]');
            if (row && !e.target.closest('a')) {
                this.#dispatchStatsClick(row.dataset.id);
            }
        });

        this.attachListener(this.container, 'keydown', (e) => {
            if (e.key !== 'Enter' && e.key !== ' ') return;
            const row = e.target.closest('.top-link-row[data-id]');
            if (row) {
                e.preventDefault();
                this.#dispatchStatsClick(row.dataset.id);
            }
        });
    }

    #dispatchStatsClick(id) {
        if (!id) return;
        this.container.dispatchEvent(
            new CustomEvent('linkStatsClick', {detail: {id}, bubbles: true})
        );
    }

    updateLinks(links) {
        this.links = links ?? [];
        if (!this.isMounted) return;
        const root = this.querySelector('.top-Links-panel');
        if (root) root.innerHTML = this.#renderList();
    }
}