/**
 * Pagination — Pagination control component.
 *
 * RESPONSIBILITY:
 *   - Render prev / page-numbers / next controls
 *   - Emit 'pageChange' CustomEvent when the user selects a page
 *
 * This component is a domain-agnostic PRIMITIVE. It knows nothing about Links,
 * users, or any Shortly-specific concept. It only understands numbers.
 */

import BaseComponent from '../../../base/BaseComponent.js';

class Pagination extends BaseComponent {
    constructor(container, props = {}) {
        super(container, props);

        // Resolve totalPages from whichever form the caller supplies
        this.state = {
            currentPage: Number(props.currentPage) || 1,
            totalPages: this.#resolveTotalPages(props),
            pageSize: Number(props.pageSize) || 20,
        };

        this.refs = {};
        this._isBusy = false;
    }

    // ─── Rendering ────────────────────────────────────────────────────────────

    render() {
        const {currentPage, totalPages} = this.state;

        // No controls needed (or possible) when there is only one page
        if (totalPages <= 1) {
            return `<div class="pagination-empty" aria-hidden="true"></div>`;
        }

        const pages = this._generatePageNumbers(currentPage, totalPages);
        const hasPrev = currentPage > 1;
        const hasNext = currentPage < totalPages;

        return `
            <nav class="pagination" data-ref="root" aria-label="Pagination">

                <button
                    class="pagination-btn"
                    data-ref="prevBtn"
                    ${!hasPrev ? 'disabled aria-disabled="true"' : ''}
                    aria-label="Go to previous page"
                >
                    <i class="fa-solid fa-chevron-left" aria-hidden="true"></i>
                </button>

                <div class="pagination-pages" data-ref="pages" role="list">
                    ${pages.map(p => {
            if (p === '...') {
                return `<span class="pagination-ellipsis" aria-hidden="true">…</span>`;
            }

            // Cast both sides to Number before comparing to guard against
            // string-typed page numbers arriving from URLSearchParams.
            const isActive = Number(p) === Number(currentPage);
            return `
                            <button
                                class="pagination-page${isActive ? ' active' : ''}"
                                data-page="${p}"
                                role="listitem"
                                ${isActive ? 'aria-current="page"' : ''}
                                aria-label="Page ${p}"
                            >${p}</button>`;
        }).join('')}
                </div>

                <button
                    class="pagination-btn"
                    data-ref="nextBtn"
                    ${!hasNext ? 'disabled aria-disabled="true"' : ''}
                    aria-label="Go to next page"
                >
                    <i class="fa-solid fa-chevron-right" aria-hidden="true"></i>
                </button>

            </nav>
        `;
    }

    setupEventListeners() {
        this.#cacheRefs();

        this.attachListener(this.refs.prevBtn, 'click', () => {
            this._goToPage(this.state.currentPage - 1);
        });

        this.attachListener(this.refs.nextBtn, 'click', () => {
            this._goToPage(this.state.currentPage + 1);
        });

        this.refs.pages?.querySelectorAll('[data-page]').forEach(btn => {
            this.attachListener(btn, 'click', () => {
                this._goToPage(Number(btn.dataset.page));
            });
        });
    }

    // ─── Public API ───────────────────────────────────────────────────────────

    /**
     * Update pagination state and re-render.
     *
     * Accepts any of:
     *   { currentPage, totalPages, pageSize }       — direct
     *   { currentPage, totalCount, pageSize }        — computed
     *   { currentPage, totalCount, totalPages, … }   — totalPages wins
     *
     * All values are silently cast to Number so callers don't need to worry
     * about string-typed values coming from URL params or the store.
     *
     * @param {Object} options
     * @param {number} [options.currentPage]
     * @param {number} [options.totalPages]
     * @param {number} [options.totalCount]   — alternative to totalPages
     * @param {number} [options.pageSize]
     */
    async setPagination(options = {}) {
        const pageSize = Number(options.pageSize ?? this.state.pageSize);

        this.state = {
            currentPage: Number(options.currentPage ?? this.state.currentPage),
            pageSize,
            totalPages: this.#resolveTotalPages({
                totalPages: options.totalPages,
                totalCount: options.totalCount,
                pageSize,
            }),
        };

        // Explicit unmount → mount (rather than update(newProps)) so that
        // this.state — not this.props — is always the authoritative source.
        await this.unmount();
        await this.mount();
    }

    // ─── Private ─────────────────────────────────────────────────────────────

    /**
     * Resolve totalPages from whichever form is available.
     * Priority: explicit totalPages > computed from totalCount > 1 (fallback).
     * @private
     */
    #resolveTotalPages({totalPages, totalCount, pageSize} = {}) {
        if (totalPages != null && Number(totalPages) > 0) {
            return Number(totalPages);
        }
        if (totalCount != null && pageSize != null && Number(pageSize) > 0) {
            return Math.max(1, Math.ceil(Number(totalCount) / Number(pageSize)));
        }
        return 1;
    }

    #cacheRefs() {
        this.refs = {
            root: this.querySelector('[data-ref="root"]'),
            prevBtn: this.querySelector('[data-ref="prevBtn"]'),
            nextBtn: this.querySelector('[data-ref="nextBtn"]'),
            pages: this.querySelector('[data-ref="pages"]'),
        };
    }

    _goToPage(page) {
        if (this._isBusy) return;

        const {totalPages} = this.state;
        if (page < 1 || page > totalPages) return;

        this._isBusy = true;
        this.state.currentPage = page;

        // Dispatch a bubbling DOM CustomEvent — LinksPage listens via attachListener()
        this.container?.dispatchEvent(
            new CustomEvent('pageChange', {
                detail: {page, pageSize: this.state.pageSize},
                bubbles: true,
            })
        );

        // Brief debounce to prevent rapid double-clicks
        setTimeout(() => {
            this._isBusy = false;
        }, 200);
    }

    /**
     * Generate the page number array with ellipsis sentinels.
     * Always shows the first and last page.
     * Shows up to 5 pages centred on the current page.
     *
     * Examples (current=5, total=10):
     *   [1, '...', 3, 4, 5, 6, 7, '...', 10]
     *
     * @param {number} current
     * @param {number} total
     * @returns {(number|string)[]}
     */
    _generatePageNumbers(current, total) {
        const pages = [];
        const maxVisible = 5;

        if (total <= maxVisible) {
            for (let i = 1; i <= total; i++) pages.push(i);
            return pages;
        }

        const left = Math.max(1, current - 2);
        const right = Math.min(total, current + 2);

        if (left > 1) {
            pages.push(1);
            if (left > 2) pages.push('...');
        }

        for (let i = left; i <= right; i++) pages.push(i);

        if (right < total) {
            if (right < total - 1) pages.push('...');
            pages.push(total);
        }

        return pages;
    }
}

export default Pagination;