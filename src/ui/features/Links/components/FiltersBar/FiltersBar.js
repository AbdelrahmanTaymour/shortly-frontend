/**
 * FiltersBar — Search + filter controls for the Links list.
 */

import './FiltersBar.css';
import BaseComponent from '../../../../base/BaseComponent.js';

const EVT_CLOSE_FILTER = 'Links:closeFilterPopover';
const EVT_CLOSE_DROPDOWNS = 'Links:closeDropdowns';

export default class FiltersBar extends BaseComponent {
    constructor(container, props = {}) {
        super(container, props);
        this.filters = props.filters || {
            search: '',
            status: '',
            visibility: '',
            dateFrom: '',
            dateTo: '',
            sortBy: 'newest',
        };
        this.isPopoverOpen = false;
    }

    render() {
        const {search, status, visibility, dateFrom, dateTo, sortBy} = this.filters;

        const activeFilterCount = Object.entries(this.filters)
            .filter(([key, val]) => !['sortBy', 'search'].includes(key) && val !== '' && val !== null)
            .length;

        return `
            <div class="toolbar-container">
                <div class="toolbar-left">
                    <div class="search-box">
                        <input
                            type="search"
                            class="search-input"
                            id="searchFilter"
                            placeholder="Search links…"
                            value="${this.escapeHtml(search)}"
                            aria-label="Search links"
                        />
                        <div class="search-icon" aria-hidden="true">
                            <i class="fa-solid fa-magnifying-glass"></i>
                        </div>
                    </div>
                </div>

                <div class="toolbar-right">
                    <div class="filter-popover-wrapper">
                        <button
                            class="btn btn-outline btn-sm ${activeFilterCount > 0 ? 'active-filter-btn' : ''}"
                            id="togglePopoverBtn"
                            aria-expanded="${this.isPopoverOpen}"
                            aria-haspopup="true"
                            aria-label="Filter options${activeFilterCount > 0 ? ` (${activeFilterCount} active)` : ''}"
                        >
                            <i class="fa-solid fa-sliders" aria-hidden="true"></i>
                            ${activeFilterCount > 0
            ? `<span class="filter-count-badge" aria-hidden="true">${activeFilterCount}</span>`
            : ''}
                        </button>

                        <div class="filter-popover ${this.isPopoverOpen ? 'active' : ''}"
                            id="filterPopover" role="dialog" aria-label="Filter options">
                            <div class="popover-body">

                                <div class="pop-group">
                                    <label class="filter-label" for="statusFilter">Status</label>
                                    <select class="filter-select" id="statusFilter">
                                        <option value="">All Status</option>
                                        <option value="active"   ${status === 'active' ? 'selected' : ''}>Active</option>
                                        <option value="inactive" ${status === 'inactive' ? 'selected' : ''}>Inactive</option>
                                    </select>
                                </div>

                                <div class="pop-group">
                                    <label class="filter-label" for="visibilityFilter">Visibility</label>
                                    <select class="filter-select" id="visibilityFilter">
                                        <option value="">All Visibility</option>
                                        <option value="public"  ${visibility === 'public' ? 'selected' : ''}>Public</option>
                                        <option value="private" ${visibility === 'private' ? 'selected' : ''}>Private</option>
                                    </select>
                                </div>

                                <div class="pop-group">
                                    <label class="filter-label">Created Range</label>
                                    <div class="pop-date-row">
                                        <label for="dateFromFilter" class="sr-only">From date</label>
                                        <input type="date" class="filter-input-date"
                                            id="dateFromFilter" value="${dateFrom || ''}">
                                        <span class="date-sep" aria-hidden="true">/</span>
                                        <label for="dateToFilter" class="sr-only">To date</label>
                                        <input type="date" class="filter-input-date"
                                            id="dateToFilter" value="${dateTo || ''}">
                                    </div>
                                </div>

                                <div class="pop-group">
                                    <label class="filter-label" for="sortFilter">Sort By</label>
                                    <select class="filter-select" id="sortFilter">
                                        <option value="newest"      ${sortBy === 'newest' ? 'selected' : ''}>Newest</option>
                                        <option value="oldest"      ${sortBy === 'oldest' ? 'selected' : ''}>Oldest</option>
                                        <option value="most-clicks" ${sortBy === 'most-clicks' ? 'selected' : ''}>Most Popular</option>
                                        <option value="least-clicks"${sortBy === 'least-clicks' ? 'selected' : ''}>Least Popular</option>
                                    </select>
                                </div>

                            </div>
                            <div class="popover-footer">
                                <button class="btn-reset" id="clearFiltersBtn">Reset All</button>
                                <button class="btn btn-primary btn-sm" id="applyFiltersBtn">
                                    Apply Filters
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    setupEventListeners() {
        const toggleBtn = this.querySelector('#togglePopoverBtn');
        const applyBtn = this.querySelector('#applyFiltersBtn');
        const clearBtn = this.querySelector('#clearFiltersBtn');
        const searchInput = this.querySelector('#searchFilter');
        const popover = this.querySelector('#filterPopover');

        // ── Debounced search ──────────────────────────────────────────────────
        let searchTimeout;
        this.attachListener(searchInput, 'input', () => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => this.#emitFilterChange(), 300);
        });

        // ── Toggle popover ────────────────────────────────────────────────────
        this.attachListener(toggleBtn, 'click', (e) => {
            e.stopPropagation();
            this.isPopoverOpen = !this.isPopoverOpen;
            popover.classList.toggle('active', this.isPopoverOpen);
            toggleBtn.setAttribute('aria-expanded', String(this.isPopoverOpen));

            if (this.isPopoverOpen) {
                // Tell LinksList to close any open card dropdowns
                document.dispatchEvent(new CustomEvent(EVT_CLOSE_DROPDOWNS));
            }
        });

        // Close popover when clicking outside
        this.attachListener(document, 'click', (e) => {
            if (!this.isPopoverOpen) return;
            if (!popover?.contains(e.target) && !toggleBtn?.contains(e.target)) {
                this.#closePopover();
            }
        });

        // ── Apply filters ─────────────────────────────────────────────────────
        this.attachListener(applyBtn, 'click', () => {
            this.#closePopover();
            this.#emitFilterChange();
        });

        // ── Clear filters ─────────────────────────────────────────────────────
        this.attachListener(clearBtn, 'click', () => this.#handleClear());

        // ── Close when LinksList opens a card dropdown ────────────────────────
        const closeListener = () => this.#closePopover();
        document.addEventListener(EVT_CLOSE_FILTER, closeListener);
        this.addCleanupTask(() => document.removeEventListener(EVT_CLOSE_FILTER, closeListener));
    }

    // ─── Private helpers ──────────────────────────────────────────────────────

    #closePopover() {
        if (!this.isPopoverOpen) return;
        this.isPopoverOpen = false;
        const popover = this.querySelector('#filterPopover');
        const btn = this.querySelector('#togglePopoverBtn');
        popover?.classList.remove('active');
        btn?.setAttribute('aria-expanded', 'false');
    }

    /**
     * Dispatch 'filterChange' as a bubbling DOM CustomEvent.
     * LinksPage listens via attachListener(filtersBar.container, 'filterChange', ...).
     */
    #emitFilterChange() {
        const filters = this.getFilters();
        this.container.dispatchEvent(
            new CustomEvent('filterChange', {detail: {filters}, bubbles: true})
        );
    }

    async #handleClear() {
        this.filters = {search: '', status: '', visibility: '', dateFrom: '', dateTo: '', sortBy: 'newest'};
        this.isPopoverOpen = false;

        // Dispatch BEFORE remounting so the page reacts to the clear
        this.container.dispatchEvent(
            new CustomEvent('clearFilters', {detail: {}, bubbles: true})
        );

        await this.unmount();
        await this.mount();
    }

    // ─── Public API ───────────────────────────────────────────────────────────

    getFilters() {
        return {
            search: this.querySelector('#searchFilter')?.value || '',
            status: this.querySelector('#statusFilter')?.value || '',
            visibility: this.querySelector('#visibilityFilter')?.value || '',
            dateFrom: this.querySelector('#dateFromFilter')?.value || '',
            dateTo: this.querySelector('#dateToFilter')?.value || '',
            sortBy: this.querySelector('#sortFilter')?.value || 'newest',
        };
    }
}