/**
 * Links.slice — Initial state shape for the Links domain.
 *
 * OWNED BY: LinksService (only LinksService calls store.dispatch('Links', ...))
 * READ BY:  LinksPage, HomePage (recent Links), LinkStatsPage
 */
export function createLinksSlice() {
    return {
        /** @type {Object[]} The current page of link objects */
        links: [],

        /** @type {{ page: number, pageSize: number, total: number, totalPages: number }} */
        pagination: {page: 1, pageSize: 20, total: 0, totalPages: 0},

        /** @type {{ search: string, status: string, visibility: string, dateFrom: string|null, dateTo: string|null, sortBy: string }} */
        filters: {search: '', status: '', visibility: '', dateFrom: null, dateTo: null, sortBy: 'newest'},

        /** @type {boolean} True while any link operation is in-flight */
        isLoading: false,

        /** @type {string|null} Last error message */
        error: null,
    };
}