/**
 * EventBus — Global pub/sub communication hub.
 *
 * RESPONSIBILITY: Message broker for cross-layer communication.
 *
 * ALLOWED:   Emit events · register/remove handlers · one-time listeners
 * FORBIDDEN: Store state · make decisions · transform data · know about subscribers
 *
 * ─── KEY CHANGES FROM LEGACY ────────────────────────────────────────────────
 *
 * 1. this.EVENTS = EventBus.EVENTS REMOVED from constructor.
 *    Accessing static data via an instance copy is redundant and confusing.
 *    Use EventBus.EVENTS directly, or the instance getter this.eventBus.EVENTS
 *    which is now a proper accessor.
 *
 * 2. New Auth lifecycle events added:
 *    AUTH_INITIALIZED, AUTH_SESSION_EXPIRED, AUTH_OAUTH_REDIRECT_REQUIRED.
 *    These replace implicit patterns like checking isInitialized on the service.
 *
 * 3. clear() with no argument documented as dangerous.
 *    It destroys ALL listeners including those from services and layout
 *    controllers. A warning is added to the method signature.
 */
export default class EventBus {
    #events = new Map();

    /**
     * Getter so code that accesses this.eventBus.EVENTS still works.
     * Avoids the legacy anti-pattern of storing a copy in the constructor.
     */
    get EVENTS() {
        return EventBus.EVENTS;
    }

    /**
     * Subscribe to an event.
     * @param {string}   event
     * @param {Function} handler
     * @returns {Function} Unsubscribe function — call this in unmount()
     */
    on(event, handler) {
        if (typeof handler !== 'function') {
            throw new Error(`EventBus.on: handler must be a function, got ${typeof handler}`);
        }
        if (!this.#events.has(event)) this.#events.set(event, []);
        this.#events.get(event).push(handler);
        return () => this.off(event, handler);
    }

    /**
     * Subscribe to an event exactly once.
     * @param {string}   event
     * @param {Function} handler
     * @returns {Function} Unsubscribe function
     */
    once(event, handler) {
        const wrapper = (...args) => {
            handler(...args);
            this.off(event, wrapper);
        };
        return this.on(event, wrapper);
    }

    /**
     * Unsubscribe a specific handler from an event.
     * @param {string}   event
     * @param {Function} handler
     */
    off(event, handler) {
        if (!this.#events.has(event)) return;
        const handlers = this.#events.get(event);
        const index = handlers.indexOf(handler);
        if (index > -1) handlers.splice(index, 1);
        if (handlers.length === 0) this.#events.delete(event);
    }

    /**
     * Emit an event to all registered handlers.
     * @param {string} event
     * @param {*}      data
     */
    emit(event, data) {
        if (!this.#events.has(event)) return;
        // Snapshot handlers to allow handlers to call off() safely
        [...this.#events.get(event)].forEach(handler => {
            try {
                handler(data);
            } catch (error) {
                console.error(`EventBus: Error in handler for "${event}":`, error);
            }
        });
    }

    /**
     * Clear listeners.
     * ⚠️ WARNING: Calling with no argument destroys ALL listeners including
     * those registered by services and layout controllers. Only call with
     * a specific event name unless you are intentionally tearing down
     * the entire application.
     * @param {string} [event] - Omit to clear everything (destructive)
     */
    clear(event) {
        if (event) {
            this.#events.delete(event);
        } else {
            this.#events.clear();
        }
    }

    /**
     * Returns the number of active listeners for an event.
     * Useful for debugging memory leaks.
     * @param {string} event
     * @returns {number}
     */
    listenerCount(event) {
        return this.#events.has(event) ? this.#events.get(event).length : 0;
    }
}

// ─── Global Event Catalogue ───────────────────────────────────────────────────
// Convention: 'domain:action' — past tense for facts, imperative for requests.
// Add new events here when extending the app. Never use string literals inline.

EventBus.EVENTS = Object.freeze({
    // ── Authentication ────────────────────────────────────────────
    USER_LOGGED_IN: 'Auth:loggedIn',
    USER_LOGGED_OUT: 'Auth:loggedOut',
    USER_UPDATED: 'Auth:userUpdated',
    TOKEN_REFRESHED: 'Auth:tokenRefreshed',
    AUTH_INITIALIZED: 'Auth:initialized',       // NEW — fires when checkAuth() completes
    AUTH_SESSION_EXPIRED: 'Auth:sessionExpired',    // NEW — fires when 401 refresh fails
    AUTH_OAUTH_REDIRECT_REQUIRED: 'Auth:oauthRedirect',    // NEW — replaces window.location in service

    // ── Links ─────────────────────────────────────────────────────
    LINK_CREATED: 'link:created',
    LINK_UPDATED: 'link:updated',
    LINK_DELETED: 'link:deleted',
    LINKS_LOADED: 'Links:loaded',
    LINK_SELECTED: 'link:selected',

    // ── UI ────────────────────────────────────────────────────────
    NOTIFICATION_SHOW: 'notification:show',
    NOTIFICATION_HIDE: 'notification:hide',
    MODAL_OPEN: 'modal:open',
    MODAL_CLOSE: 'modal:close',
    LOADING_START: 'loading:start',
    LOADING_END: 'loading:end',

    // ── Navigation ────────────────────────────────────────────────
    NAVIGATION_STARTED: 'navigation:started',
    NAVIGATION_COMPLETED: 'navigation:completed',

    // ── Errors ────────────────────────────────────────────────────
    ERROR_OCCURRED: 'error:occurred',
    API_ERROR: 'error:api',
});