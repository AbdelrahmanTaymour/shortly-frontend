/**
 * BaseComponent — Base class for all UI ProfileHeaderCard.
 *
 * RESPONSIBILITY: Component lifecycle contract (mount → update → unmount → destroy).
 *
 * ALLOWED:   DOM manipulation within own container · emit events upward
 *            · manage own transient visual state
 * FORBIDDEN: API calls · service imports · navigation · parent component knowledge
 *
 * ─── BUGS FIXED FROM LEGACY ─────────────────────────────────────────────────
 *
 * 1. CRITICAL — isMounted property/method name collision.
 *    Legacy set `this.isMounted = false` in the constructor (instance property)
 *    AND defined `isMounted()` as a prototype method.
 *    In JS, instance properties shadow prototype methods.
 *    After mount() set `this.isMounted = true`, calling `this.isMounted()`
 *    threw TypeError: this.isMounted is not a function.
 *    The method was permanently inaccessible. Fixed with a private `#mounted` field
 *    and a public `get isMounted` getter.
 *
 * 2. _cleanupTasks and _callbacks used underscore convention (no enforcement).
 *    Replaced with private # fields.
 *
 * 3. No store subscription tracking.
 *    Added trackStoreSubscription() so ProfileHeaderCard can register unsubscribe
 *    functions that are automatically called in unmount().
 *
 * 4. No EventBus listener tracking.
 *    Added trackBusListener() for eventBus.on() calls — same pattern as store.
 *
 * 5. Dual-channel emit (DOM CustomEvent + object callbacks) was confusing.
 *    Components in this architecture communicate via EventBus (passed as a prop),
 *    not via DOM bubbling. The DOM CustomEvent path is removed.
 *    Use this.props.eventBus.emit() for cross-component communication.
 *    Use .on() / emit() for parent-child object-level callbacks.
 */

import {removeAllChildren} from '../../utils/dom.js';

export default class BaseComponent {
    // ─── Private Fields ───────────────────────────────────────────────────────

    /** @type {boolean} */
    #mounted = false;

    /** @type {Array<{element: Element, event: string, handler: Function}>} */
    #domListeners = [];

    /** @type {Function[]} — Return values of eventBus.on() */
    #busListeners = [];

    /** @type {Function[]} — Return values of store.subscribe() */
    #storeUnsubscribers = [];

    /** @type {Function[]} — Arbitrary cleanup functions */
    #cleanupTasks = [];

    /** @type {Map<string, Function[]>} — Object-level event callbacks */
    #callbacks = new Map();

    // ─── Constructor ──────────────────────────────────────────────────────────

    /**
     * @param {HTMLElement} container
     * @param {Object}      props
     * @param {import('../../app/EventBus.js').default} [props.eventBus]
     * @param {import('../../store/Store.js').Store}    [props.store]
     */
    constructor(container, props = {}) {
        this.container = container;
        this.props = props;
    }

    // ─── Lifecycle ────────────────────────────────────────────────────────────

    /** @returns {boolean} */
    get isMounted() {
        return this.#mounted;
    }

    /** @returns {Element} */
    get getContainer() {
        return this.container;
    }

    /** @returns {Object} */
    get getProps() {
        return this.props;
    }

    /**
     * Return an HTML string or Element to render.
     * Override in subclass.
     * @returns {string|Element}
     */
    render() {
        return '';
    }

    /**
     * Attach all event listeners after the DOM is ready.
     * Override in subclass.
     */
    setupEventListeners() {
    }

    /**
     * Mount: render content into the container, then attach listeners.
     */
    async mount() {
        if (!this.container) {
            console.error(`BaseComponent: No container for ${this.constructor.name}`);
            return;
        }

        const content = this.render();
        if (typeof content === 'string') {
            this.container.innerHTML = content;
        } else if (content instanceof Element) {
            removeAllChildren(this.container);
            this.container.appendChild(content);
        }

        this.#mounted = true;
        this.setupEventListeners();
    }

    // ─── Listener Tracking ────────────────────────────────────────────────────

    /**
     * Unmount: remove all listeners, clean up subscriptions, clear DOM.
     * Subclasses that override must call super.unmount().
     */
    async unmount() {
        // 1. Remove DOM event listeners
        this.#domListeners.forEach(({element, event, handler}) => {
            element?.removeEventListener(event, handler);
        });
        this.#domListeners = [];

        // 2. Remove EventBus listeners
        this.#busListeners.forEach(unsub => {
            try {
                unsub?.();
            } catch { /* ignore */
            }
        });
        this.#busListeners = [];

        // 3. Unsubscribe from store slices
        this.#storeUnsubscribers.forEach(unsub => {
            try {
                unsub?.();
            } catch { /* ignore */
            }
        });
        this.#storeUnsubscribers = [];

        // 4. Run arbitrary cleanup tasks
        this.#cleanupTasks.forEach(task => {
            try {
                task?.();
            } catch { /* ignore */
            }
        });
        this.#cleanupTasks = [];

        // 5. Clear object-level callbacks
        this.#callbacks.clear();

        // 6. Clear the DOM
        removeAllChildren(this.container);
        this.#mounted = false;
    }

    /**
     * Destroy: unmount and release all references.
     */
    async destroy() {
        await this.unmount();
        this.container = null;
        this.props = null;
    }

    /**
     * Update props and re-render.
     * @param {Object} newProps
     */
    async update(newProps) {
        this.props = {...this.props, ...newProps};
        if (this.#mounted) {
            await this.unmount();
            await this.mount();
        }
    }

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

    // ─── Object-level Event System ────────────────────────────────────────────
    // Use for parent → child callback injection (e.g., onDelete, onSelect).
    // Use this.props.eventBus for cross-component / cross-layer communication.

    /**
     * Track an EventBus.on() return value for automatic cleanup.
     * Usage: this.trackBusListener(this.props.eventBus.on('event', handler));
     * @param {Function} unsubscribeFn — The function returned by eventBus.on()
     */
    trackBusListener(unsubscribeFn) {
        if (typeof unsubscribeFn === 'function') this.#busListeners.push(unsubscribeFn);
    }

    /**
     * Track a store.subscribe() return value for automatic cleanup.
     * Usage: this.trackStoreSubscription(this.props.store.subscribe('slice', cb));
     * @param {Function} unsubscribeFn — The function returned by store.subscribe()
     */
    trackStoreSubscription(unsubscribeFn) {
        if (typeof unsubscribeFn === 'function') this.#storeUnsubscribers.push(unsubscribeFn);
    }

    // ─── DOM Helpers ──────────────────────────────────────────────────────────

    /**
     * Register an arbitrary cleanup function (e.g., clearInterval, observer.disconnect).
     * @param {Function} fn
     */
    addCleanupTask(fn) {
        if (typeof fn === 'function') this.#cleanupTasks.push(fn);
    }

    /**
     * Subscribe to an object-level component event.
     * @param {string}   eventName
     * @param {Function} callback
     * @returns {this}
     */
    on(eventName, callback) {
        if (!this.#callbacks.has(eventName)) this.#callbacks.set(eventName, []);
        this.#callbacks.get(eventName).push(callback);
        return this;
    }

    // ─── Getters ──────────────────────────────────────────────────────────────

    /**
     * Emit an object-level component event (calls registered .on() handlers).
     * Does NOT dispatch a DOM CustomEvent — use this.props.eventBus for cross-layer events.
     * @param {string} eventName
     * @param {*}      detail
     */
    emit(eventName, detail) {
        this.#callbacks.get(eventName)?.forEach(cb => {
            try {
                cb(detail);
            } catch (e) {
                console.error(`BaseComponent emit error (${eventName}):`, e);
            }
        });
    }

    /**
     * Scoped querySelector — never queries outside this component's container.
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

    // ─── Utilities ────────────────────────────────────────────────────────────

    /**
     * Escape HTML special characters to prevent XSS.
     * Always use this before rendering user-supplied content as innerHTML.
     * @param {string} text
     * @returns {string}
     */
    escapeHtml(text) {
        if (text == null) return '';
        return String(text).replace(/[&<>"']/g, m => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;',
        }[m]));
    }
}