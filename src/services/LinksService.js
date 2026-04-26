/**
 * LinksService — Links business logic.
 *
 * RESPONSIBILITY: Orchestrate link CRUD, write state to the Store,
 *                 emit domain events on the EventBus.
 *
 * ALLOWED:   Call LinksApi · dispatch to store · emit events · cache data
 * FORBIDDEN: DOM access · import authService · import apiConfig · import mock data
 */

export default class LinksService {
    /** @type {Map<string, object>} Per-ID link cache */
    #linkCache = new Map();

    /** @type {Map<string, object>} Per-ID stats cache */
    #statsCache = new Map();

    /** @type {ReturnType<typeof setTimeout>|null} */
    #searchTimeout = null;

    /**
     * @param {import('../infrastructure/http/LinksApi.js').default} linksApi
     * @param {import('../store/Store.js').Store}                    store
     * @param {import('../app/EventBus.js').default}                 eventBus
     */
    constructor(linksApi, store, eventBus) {
        this.linksApi = linksApi;
        this.store = store;
        this.eventBus = eventBus;
    }

    // ═══════════════════════════════════════════════════════════════
    // PRIVATE HELPERS
    // ═══════════════════════════════════════════════════════════════

    get isLoading() {
        return this.store.getState('links').isLoading;
    }

    get lastError() {
        return this.store.getState('links').error;
    }

    #mapLink(link) {
        if (!link) return null;
        if (!link.shortCode) {
            console.warn('LinksService: link.shortCode missing from API response.');
        }
        return {...link};
    }

    #setLoading(isLoading) {
        this.store.dispatch('links', prev => ({...prev, isLoading, error: null}));
    }

    #setError(message) {
        this.store.dispatch('links', prev => ({...prev, isLoading: false, error: message}));
        this.eventBus.emit(this.eventBus.EVENTS.ERROR_OCCURRED, {type: 'LINKS_ERROR', message});
    }

    // ═══════════════════════════════════════════════════════════════
    // DEBOUNCED LOAD
    // ═══════════════════════════════════════════════════════════════

    #getAuthenticatedUser() {
        const {currentUser} = this.store.getState('auth');
        if (!currentUser?.id) {
            throw new Error('LinksService: No authenticated user. Cannot load Links.');
        }
        return currentUser;
    }

    // ═══════════════════════════════════════════════════════════════
    // LOAD  (primary entry point for LinksPage)
    // ═══════════════════════════════════════════════════════════════

    /**
     * Extracts pagination metadata from the API response.
     * @private
     */
    #extractPagination(result, links, pageSize, pageNumber) {
        // Shape 1 — new PagedResult envelope (C# record with camelCase serialization)
        const total = result.totalCount
            ?? result.total
            ?? result.pagination?.total
            ?? result.meta?.total
            ?? links.length;

        const fallbackPages = Math.max(1, Math.ceil(total / pageSize));

        const totalPages = result.totalPages
            ?? result.pagination?.totalPages
            ?? result.meta?.totalPages
            ?? fallbackPages;

        // PagedResult uses pageNumber; legacy shapes may use page
        const page = result.pageNumber
            ?? result.page
            ?? result.pagination?.page
            ?? result.pagination?.pageNumber
            ?? pageNumber;

        return {total, totalPages, page};
    }

    // ═══════════════════════════════════════════════════════════════
    // CREATE
    // ═══════════════════════════════════════════════════════════════

    /**
     * Debounced version of loadLinks for search inputs.
     * @param {Object} options
     * @param {number} [delay=400]
     */
    debouncedLoadLinks(options = {}, delay = 400) {
        if (this.#searchTimeout) clearTimeout(this.#searchTimeout);
        return new Promise((resolve, reject) => {
            this.#searchTimeout = setTimeout(() => {
                this.loadLinks(options).then(resolve).catch(reject);
            }, delay);
        });
    }

    /**
     * Load Links for the authenticated user, applying the current store filters.
     *
     * Delegates to linksApi.searchLinks() which calls the new backend search
     * endpoint. All six filter params are forwarded so every UI control
     * (search, status, visibility, sort, date-range) has real effect.
     *
     * @param {{ page?: number, pageSize?: number, filters?: object }} options
     */
    async loadLinks(options = {}) {
        this.#setLoading(true);
        try {
            const user = this.#getAuthenticatedUser();

            // If the caller supplies filter overrides, persist them to the store
            // first so the rest of this method reads the merged, up-to-date state.
            if (options.filters) {
                this.store.dispatch('links', prev => ({
                    ...prev,
                    filters: {...prev.filters, ...options.filters},
                }));
            }

            const {filters, pagination} = this.store.getState('links');

            const pageNumber = options.page ?? pagination.page ?? 1;
            const pageSize = options.pageSize ?? pagination.pageSize;

            // ── Forward ALL filter fields to the API ──────────────────────────
            // Previously only search + status were forwarded; visibility, sortBy,
            // dateFrom, and dateTo were silently discarded.
            const params = {
                pageNumber,
                pageSize,
                search: filters.search || undefined,
                status: filters.status || undefined,
                visibility: filters.visibility || undefined,
                sortBy: filters.sortBy || undefined,
                dateFrom: filters.dateFrom || undefined,
                dateTo: filters.dateTo || undefined,
            };

            // Use the new search endpoint that returns a full PagedResult envelope
            const result = await this.linksApi.searchLinks(user.id, params);

            // PagedResult returns items[]; legacy endpoints use data[]
            const rawArray = result.items ?? result.data ?? (Array.isArray(result) ? result : []);
            const links = rawArray.map(l => this.#mapLink(l));

            const paginationMeta = this.#extractPagination(result, links, pageSize, pageNumber);

            this.store.dispatch('links', prev => ({
                ...prev,
                links,
                pagination: {
                    ...prev.pagination,
                    page: paginationMeta.page,
                    total: paginationMeta.total,
                    totalPages: paginationMeta.totalPages,
                },
                isLoading: false,
            }));

            this.eventBus.emit(this.eventBus.EVENTS.LINKS_LOADED, {
                links,
                pagination: this.store.getState('links').pagination,
            });

            return {links, pagination: this.store.getState('links').pagination};

        } catch (error) {
            this.#setError(error.message);
            throw error;
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // READ
    // ═══════════════════════════════════════════════════════════════

    async createLink(payload) {
        this.#setLoading(true);
        try {
            const link = await this.linksApi.createLink(payload);
            const mapped = this.#mapLink(link);

            this.store.dispatch('links', prev => ({
                ...prev,
                links: [mapped, ...prev.links],
                pagination: {...prev.pagination, total: prev.pagination.total + 1},
                isLoading: false,
            }));

            this.eventBus.emit(this.eventBus.EVENTS.LINK_CREATED, {link: mapped});
            return mapped;
        } catch (error) {
            this.#setError(error.message);
            throw error;
        }
    }

    async createBulkLinks(linksData) {
        this.#setLoading(true);
        try {
            const result = await this.linksApi.bulkCreateLinks(linksData);
            const newLinks = (result.data ?? []).map(l => this.#mapLink(l));

            this.store.dispatch('links', prev => ({
                ...prev,
                links: [...newLinks, ...prev.links],
                pagination: {...prev.pagination, total: prev.pagination.total + newLinks.length},
                isLoading: false,
            }));

            this.eventBus.emit(this.eventBus.EVENTS.LINKS_LOADED, {
                links: this.store.getState('links').links,
            });
            return result;
        } catch (error) {
            this.#setError(error.message);
            throw error;
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // UPDATE
    // ═══════════════════════════════════════════════════════════════

    async getLink(id) {
        if (this.#linkCache.has(id)) return this.#linkCache.get(id);

        this.#setLoading(true);
        try {
            const link = await this.linksApi.getLink(id);
            const mapped = this.#mapLink(link);
            this.#linkCache.set(id, mapped);
            this.store.dispatch('links', prev => ({...prev, isLoading: false}));
            return mapped;
        } catch (error) {
            this.#setError(error.message);
            throw error;
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // DELETE
    // ═══════════════════════════════════════════════════════════════

    async getLinkStats(id, params = {}) {
        const cacheKey = `${id}-${JSON.stringify(params)}`;
        const filterless = !params.dateFrom && !params.dateTo;
        if (filterless && this.#statsCache.has(cacheKey)) return this.#statsCache.get(cacheKey);

        this.#setLoading(true);
        try {
            const stats = await this.linksApi.getLinkStats(id, params);
            if (filterless) this.#statsCache.set(cacheKey, stats);
            this.store.dispatch('links', prev => ({...prev, isLoading: false}));
            return stats;
        } catch (error) {
            this.#setError(error.message);
            throw error;
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // BULK OPERATIONS
    // ═══════════════════════════════════════════════════════════════

    async updateLink(id, payload) {
        this.#setLoading(true);
        try {
            const response = await this.linksApi.updateLink(id, payload);
            const rawData = response?.data ?? response;
            if (!rawData) throw new Error('Update failed: no data returned from server.');

            const mapped = this.#mapLink(rawData);

            this.store.dispatch('links', prev => {
                const idx = prev.links.findIndex(l => String(l.id) === String(id));
                const links = [...prev.links];
                if (idx !== -1) links[idx] = {...links[idx], ...mapped};
                return {...prev, links, isLoading: false};
            });

            this.#linkCache.set(id, mapped);
            this.eventBus.emit(this.eventBus.EVENTS.LINK_UPDATED, {link: mapped});
            return mapped;
        } catch (error) {
            this.#setError(error.message);
            throw error;
        }
    }

    async deleteLink(id) {
        this.#setLoading(true);
        try {
            await this.linksApi.deleteLink(id);

            this.store.dispatch('links', prev => ({
                ...prev,
                links: prev.links.filter(l => String(l.id) !== String(id)),
                pagination: {...prev.pagination, total: Math.max(0, prev.pagination.total - 1)},
                isLoading: false,
            }));

            this.#linkCache.delete(id);
            this.eventBus.emit(this.eventBus.EVENTS.LINK_DELETED, {linkId: id});
        } catch (error) {
            this.#setError(error.message);
            throw error;
        }
    }

    async bulkDeleteLinks(ids) {
        this.#setLoading(true);
        try {
            await this.linksApi.bulkDeleteLinks(ids);

            this.store.dispatch('links', prev => ({
                ...prev,
                links: prev.links.filter(l => !ids.includes(l.id)),
                pagination: {...prev.pagination, total: Math.max(0, prev.pagination.total - ids.length)},
                isLoading: false,
            }));

            ids.forEach(id => {
                this.#linkCache.delete(id);
                this.#statsCache.delete(id);
            });
        } catch (error) {
            this.#setError(error.message);
            throw error;
        }
    }

    async bulkActivateLinks(ids) {
        this.#setLoading(true);
        try {
            await this.linksApi.bulkActivateLinks(ids);
            this.store.dispatch('links', prev => ({
                ...prev,
                links: prev.links.map(l =>
                    ids.includes(l.id) ? {...l, isActive: true} : l
                ),
                isLoading: false,
            }));
        } catch (error) {
            this.#setError(error.message);
            throw error;
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // FILTER MANAGEMENT
    // ═══════════════════════════════════════════════════════════════

    async bulkDeactivateLinks(ids) {
        this.#setLoading(true);
        try {
            await this.linksApi.bulkDeactivateLinks(ids);
            this.store.dispatch('links', prev => ({
                ...prev,
                links: prev.links.map(l =>
                    ids.includes(l.id) ? {...l, isActive: false} : l
                ),
                isLoading: false,
            }));
        } catch (error) {
            this.#setError(error.message);
            throw error;
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // CACHE MANAGEMENT
    // ═══════════════════════════════════════════════════════════════

    async bulkUpdateExpiration(ids, newExpirationDate) {
        this.#setLoading(true);
        try {
            await this.linksApi.bulkUpdateExpiration(ids, newExpirationDate);
            this.store.dispatch('links', prev => ({
                ...prev,
                links: prev.links.map(l =>
                    ids.includes(l.id) ? {...l, expiresAt: newExpirationDate} : l
                ),
                isLoading: false,
            }));
        } catch (error) {
            this.#setError(error.message);
            throw error;
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // SYNCHRONOUS READS (from store)
    // ═══════════════════════════════════════════════════════════════

    /**
     * Resets all filters to their default state.
     * Only LinksService may write to the filters slice — no component
     * calls store.dispatch() directly for filter mutations.
     */
    clearFilters() {
        this.store.dispatch('links', prev => ({
            ...prev,
            filters: {
                search: '',
                status: '',
                visibility: '',
                dateFrom: null,
                dateTo: null,
                sortBy: 'newest',
            },
        }));
    }

    clearCache() {
        this.#linkCache.clear();
        this.#statsCache.clear();
        this.store.dispatch('links', prev => ({
            ...prev,
            links: [],
            pagination: {page: 1, pageSize: prev.pagination.pageSize, total: 0, totalPages: 0},
        }));
    }

    getLinks() {
        return this.store.getState('links').links;
    }

    getPagination() {
        return this.store.getState('links').pagination;
    }

    getFilters() {
        return this.store.getState('links').filters;
    }
}