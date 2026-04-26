/**
 * BasePage — Base class for all route-level page controllers.
 *
 * RESPONSIBILITY: Page lifecycle, child component management, service access.
 *
 * ALLOWED:   Lifecycle management · coordinate UI ProfileHeaderCard · call services
 *            · local UI state · EventBus event handling
 * FORBIDDEN: Direct API calls · business logic · reference other page classes
 *            · DOM access outside this.container
 *
 * ─── FIXES FROM LEGACY ───────────────────────────────────────────────────────
 *
 * 1. No EventBus listener cleanup.
 *    Legacy only tracked DOM addEventListener calls in this.eventListeners[].
 *    eventBus.on() calls in pages were NEVER cleaned up — classic memory leak
 *    and a cause of "ghost handlers" firing on pages that are no longer mounted.
 *    Fixed: trackBusListener() stores the unsubscribe fn; unmount() calls all.
 *
 * 2. No store subscription cleanup.
 *    If a page subscribed to a store slice, the callback would keep firing after
 *    navigation away from the page.
 *    Fixed: trackStoreSubscription() stores unsubscribe fns; unmount() calls all.
 *
 * 3. destroy() called async unmount() without await.
 *    Since destroy() was synchronous, cleanup was not guaranteed to finish before
 *    references were nulled. Fixed: destroy() is now async.
 *
 * 4. highlightActiveNavItem() used global document.querySelectorAll.
 *    The sidebar is a layout-level element, so a scoped query from the page
 *    container won't find it. This is an acceptable exception — documented below.
 *
 * 5. store added as a first-class property (was missing from original context injection).
 *    Pages access it via this.store, consistent with how ProfileHeaderCard receive it.
 */
export default class BasePage {

    // ─── Private cleanup registries ───────────────────────────────────────────

    #domListeners = [];   // { element, event, handler }
    #busListeners = [];   // unsubscribe functions from eventBus.on()
    #storeUnsubscribers = [];  // unsubscribe functions from store.subscribe()

    // ─── Constructor ──────────────────────────────────────────────────────────

    /**
     * @param {HTMLElement} container  — The page's root DOM element
     * @param {Object}      options
     * @param {Map}         options.services
     * @param {import('../store/Store.js').Store}            options.store
     * @param {import('../app/EventBus.js').default}         options.eventBus
     * @param {import('../app/Router.js').default}           options.router
     * @param {Object}      options.params    — URL route parameters
     */
    constructor(container, options = {}) {
        this.container = container;
        this.services = options.services || new Map();
        this.store = options.store || null;
        this.eventBus = options.eventBus || null;
        this.router = options.router || null;
        this.params = options.params || {};

        this.isPageMounted = false;
        this.components = [];           // child BaseComponent instances
    }

    // ─── Lifecycle ────────────────────────────────────────────────────────────

    /**
     * Mount: override in subclass.
     * Always call await super.mount() first.
     */
    async mount() {
        this.isPageMounted = true;
    }

    /**
     * Unmount: removes all listeners, destroys child ProfileHeaderCard, resets state.
     * Always call await super.unmount() at the END of subclass unmount().
     */
    async unmount() {
        // 1. Remove DOM event listeners
        this.#domListeners.forEach(({element, event, handler}) => {
            element?.removeEventListener(event, handler);
        });
        this.#domListeners = [];

        // 2. Unsubscribe EventBus listeners
        this.#busListeners.forEach(unsub => {
            try {
                unsub?.();
            } catch { /* ignore */
            }
        });
        this.#busListeners = [];

        // 3. Unsubscribe store subscriptions
        this.#storeUnsubscribers.forEach(unsub => {
            try {
                unsub?.();
            } catch { /* ignore */
            }
        });
        this.#storeUnsubscribers = [];

        // 4. Destroy all registered child ProfileHeaderCard
        await this.destroyComponents();

        this.isPageMounted = false;
    }

    /**
     * Destroy: unmount and release all references.
     * Called by Application when a page is being permanently disposed.
     */
    async destroy() {
        await this.unmount();
        this.container = null;
        this.services = null;
        this.store = null;
        this.eventBus = null;
        this.router = null;
    }

    // ─── Listener Tracking ────────────────────────────────────────────────────

    /**
     * Attach a DOM event listener. Automatically removed in unmount().
     * @param {Element}  element
     * @param {string}   event
     * @param {Function} handler
     */
    attachListener(element, event, handler) {
        if (!element) return;
        element.addEventListener(event, handler);
        this.#domListeners.push({element, event, handler});
    }

    /**
     * Track an EventBus.on() return value for automatic cleanup in unmount().
     *
     * Usage:
     *   this.trackBusListener(
     *     this.eventBus.on('link:deleted', ({ id }) => this.#handleDelete(id))
     *   );
     *
     * @param {Function} unsubscribeFn — The function returned by eventBus.on()
     */
    trackBusListener(unsubscribeFn) {
        if (typeof unsubscribeFn === 'function') this.#busListeners.push(unsubscribeFn);
    }

    /**
     * Track a store.subscribe() return value for automatic cleanup in unmount().
     *
     * Usage:
     *   this.trackStoreSubscription(
     *     this.store.subscribe('Auth', ({ currentUser }) => this.#renderUser(currentUser))
     *   );
     *
     * @param {Function} unsubscribeFn — The function returned by store.subscribe()
     */
    trackStoreSubscription(unsubscribeFn) {
        if (typeof unsubscribeFn === 'function') this.#storeUnsubscribers.push(unsubscribeFn);
    }

    // ─── Component Registry ───────────────────────────────────────────────────

    /**
     * Register a child component so it is destroyed automatically in unmount().
     * @param {import('./BaseComponent.js').default} component
     */
    registerComponent(component) {
        if (component) this.components.push(component);
    }

    /** Destroy all registered child ProfileHeaderCard. */
    async destroyComponents() {
        await Promise.all(
            this.components.map(c => typeof c.destroy === 'function' ? c.destroy() : Promise.resolve())
        );
        this.components = [];
    }

    // ─── Service Access ───────────────────────────────────────────────────────

    /**
     * @param {string} name
     * @returns {*}
     */
    getService(name) {
        return this.services.get(name);
    }

    /**
     * @param {string} name
     * @returns {boolean}
     */
    hasService(name) {
        return this.services.has(name);
    }

    // ─── DOM Helpers ──────────────────────────────────────────────────────────

    /**
     * Scoped querySelector — always within this.container.
     * Never use document.querySelector() in a page.
     * @param {string} selector
     * @returns {Element|null}
     */
    querySelector(selector) {
        return this.container?.querySelector(selector) ?? null;
    }

    /**
     * Scoped querySelectorAll.
     * @param {string} selector
     * @returns {Element[]}
     */
    querySelectorAll(selector) {
        return Array.from(this.container?.querySelectorAll(selector) ?? []);
    }

    // ─── Navigation ───────────────────────────────────────────────────────────

    /**
     * Navigate to a route.
     * @param {string} path
     * @param {Object} params
     */
    navigateTo(path, params = {}) {
        this.router?.navigate(path, {updateHistory: true, params});
    }

    // ─── UI Helpers ───────────────────────────────────────────────────────────

    /**
     * Emit a notification via the EventBus.
     * @param {string} message
     * @param {'success'|'error'|'info'|'warning'} type
     */
    showNotification(message, type = 'info') {
        this.eventBus?.emit(this.eventBus.EVENTS.NOTIFICATION_SHOW, {message, type});
    }

    /** Emit loading:start on the EventBus. */
    showLoading() {
        this.eventBus?.emit(this.eventBus.EVENTS.LOADING_START);
    }

    /** Emit loading:end on the EventBus. */
    hideLoading() {
        this.eventBus?.emit(this.eventBus.EVENTS.LOADING_END);
    }

    /**
     * Render a full-container error message.
     * @param {string} message
     */
    renderError(message = 'Failed to load page content.') {
        if (!this.container) return;
        this.container.innerHTML = `
            <div class="error-container p-10 text-center" role="alert">
                <i class="fa-solid fa-circle-exclamation text-4xl text-danger mb-4" aria-hidden="true"></i>
                <p class="text-lg">${this.escapeHtml(message)}</p>
                <button class="btn btn-primary mt-4" onclick="location.reload()">Retry</button>
            </div>`;
    }

    /**
     * Highlight the active nav item in the sidebar.
     * NOTE: The sidebar is a layout-level element rendered by DashboardLayout,
     * outside this page's container. Global document query is the only option here.
     * This is a documented, intentional exception to the scoped-query rule.
     * @param {string} route — e.g. '/Links'
     */
    highlightActiveNavItem(route) {
        document.querySelectorAll('.menu-item').forEach(item => item.classList.remove('active'));
        document.querySelector(`.menu-item[href="${route}"]`)?.classList.add('active');
    }

    // ─── Route Parameters ─────────────────────────────────────────────────────

    getParams() {
        return this.params;
    }

    getParam(key) {
        return this.params[key];
    }

    isMounted() {
        return this.isPageMounted;
    }

    // ─── Utilities ────────────────────────────────────────────────────────────

    /**
     * Escape HTML special characters to prevent XSS.
     * @param {string} text
     * @returns {string}
     */
    escapeHtml(text) {
        if (text == null) return '';
        return String(text).replace(/[&<>"']/g, m => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;',
        }[m]));
    }

    /**
     * Emit an EventBus event (shorthand).
     * @param {string} event
     * @param {*}      data
     */
    emit(event, data = {}) {
        this.eventBus?.emit(event, data);
    }
}