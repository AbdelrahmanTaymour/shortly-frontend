/**
 * Router — URL Routing and Page Navigation
 *
 * RESPONSIBILITY: Match URL to route config, load templates, manage history.
 *
 * ─── CHANGE FROM PREVIOUS VERSION ───────────────────────────────────────────
 *
 * Lazy page loading via pageLoader factory functions.
 *
 * BEFORE:
 *   Route config stored { pageClass: SomePageClass }.
 *   navigate() passed pageClass directly to the NAVIGATION_COMPLETED event.
 *
 * AFTER:
 *   Route config stores { pageLoader: () => import('./SomePage.js') }.
 *   navigate() resolves the factory and extracts .default inside the existing
 *   isNavigating lock, then emits the resolved class — identical payload shape.
 *
 * KEY DECISIONS:
 *
 * 1. Resolution happens HERE, not in Application._loadPage().
 *    The isNavigating lock already lives in navigate(). Resolving the dynamic
 *    import inside the lock means a rapid second navigation cannot race with
 *    an in-flight module download. If we resolved in Application, that
 *    protection would be lost.
 *
 * 2. Template fetch and module download run in parallel via Promise.all().
 *    These are two independent network requests. Running them concurrently
 *    is a free performance improvement on every navigation.
 *    - Template errors remain fault-tolerant (logs warning, continues with '').
 *    - Module errors are fatal (page cannot be shown without its code).
 *
 * 3. Application.js receives the same { pageClass, template, ... } payload.
 *    Zero changes needed there.
 *
 * 4. addRoute() now validates pageLoader instead of pageClass.
 *    Routes without a pageLoader (null entries for qr/admin/org) are filtered
 *    out in main.js._setupRoutes() before addRoute() is even called.
 */
class Router {
    constructor(eventBus) {
        this.eventBus      = eventBus;
        this.routes        = new Map();
        this.currentRoute  = null;
        this.isNavigating  = false;
        this.templateCache = new Map();

        // Injected via setAuthGuard(). Defaults to () => false (safe-by-default).
        this._authGuard = () => false;
    }

    /**
     * Provides the authentication predicate for the route guard.
     * Must be called exactly once from main.js after AuthService is ready.
     * @param {() => boolean} predicate
     */
    setAuthGuard(predicate) {
        if (typeof predicate !== 'function') {
            throw new Error('Router.setAuthGuard: predicate must be a function.');
        }
        this._authGuard = predicate;
    }

    /**
     * Register a route.
     *
     * @param {string} path   - Route path (e.g., '/links', '/links/:id')
     * @param {Object} config
     * @param {Function} config.pageLoader   - () => import('./Page.js') factory (required)
     * @param {string}   config.templatePath - Path to HTML template (optional)
     * @param {string}   config.title        - Browser tab title
     * @param {boolean}  config.public       - false = requires authentication
     */
    addRoute(path, config) {
        if (typeof config.pageLoader !== 'function') {
            throw new Error(`Router: Route "${path}" must have a pageLoader function.`);
        }
        this.routes.set(path, config);
    }

    /**
     * Navigate to a path.
     *
     * Template fetch and page-module download run in parallel inside the
     * isNavigating lock. The resolved class is emitted as `pageClass` in
     * NAVIGATION_COMPLETED — Application.js sees no difference.
     *
     * @param {string}  path
     * @param {Object}  options
     * @param {boolean} options.updateHistory - Push to browser history (default: true)
     * @param {Object}  options.params        - Extra params merged with URL params
     * @returns {Promise<void>}
     */
    async navigate(path, options = {}) {
        const { updateHistory = true, params = {} } = options;

        // Prevent overlapping navigations (e.g., rapid link clicks)
        if (this.isNavigating) return;

        const match = this._matchRoute(path);
        if (!match) {
            console.error(`Router: No route registered for "${path}"`);
            this._emit404();
            return;
        }

        const { config: route, urlParams } = match;
        const combinedParams = { ...urlParams, ...params };

        // ── Auth guard ─────────────────────────────────────────────────────────
        if (route.public === false && !this._authGuard()) {
            return this.navigate('/login', {
                params: { ...combinedParams, redirect: path },
            });
        }

        try {
            this.isNavigating = true;
            this.eventBus.emit(this.eventBus.EVENTS.NAVIGATION_STARTED, { path });

            // ── Parallel load: HTML template + JS page module ──────────────────
            //
            // Both are independent network requests. Promise.all() runs them
            // concurrently — on a cold navigation this can halve the wait time.
            //
            // Template failure → fault-tolerant (warn + empty string).
            // Module failure   → fatal (re-thrown, caught by outer try/catch).

            const templatePromise = route.templatePath
                ? this._loadTemplate(route.templatePath).catch(templateError => {
                    console.warn(
                        `Router: Template "${route.templatePath}" could not be loaded — ` +
                        `mounting "${path}" without pre-loaded HTML. ` +
                        `PageClass.mount() must render its own content.`,
                        templateError.message
                    );
                    return ''; // non-fatal
                })
                : Promise.resolve('');

            const modulePromise = route.pageLoader()
                .then(mod => mod.default);

            const [template, PageClass] = await Promise.all([
                templatePromise,
                modulePromise,
            ]);

            // ── History ────────────────────────────────────────────────────────

            if (updateHistory) {
                const url = new URL(window.location);
                url.pathname = path;
                history.pushState(
                    { path, params: combinedParams },
                    route.title,
                    url
                );
            }

            document.title    = route.title || 'Shortly';
            this.currentRoute = { path, config: route, params: combinedParams };

            // ── Emit — identical payload shape, Application.js unchanged ───────

            this.eventBus.emit(this.eventBus.EVENTS.NAVIGATION_COMPLETED, {
                path,
                params:    combinedParams,
                template,
                pageClass: PageClass,      // resolved class, not a factory
                public:    route.public,   // Application reads this to pick the layout shell
            });

        } catch (error) {
            console.error('Router: Navigation error:', error);
        } finally {
            this.isNavigating = false;
        }
    }

    // ─── History Helpers ──────────────────────────────────────────────────────

    back() { history.back(); }

    forward() { history.forward(); }

    getCurrentRoute() { return this.currentRoute; }

    /**
     * Registers the popstate listener so browser back/forward triggers navigation.
     * Called once from Application._setupEventListeners().
     * @param {Function} callback - (path, params, updateHistory) => void
     */
    setupHistoryListener(callback) {
        window.addEventListener('popstate', (event) => {
            const path   = event.state?.path   || '/';
            const params = event.state?.params || {};
            callback(path, params, false);
        });
    }

    // ─── Private ──────────────────────────────────────────────────────────────

    /**
     * Matches a URL path against all registered routes.
     * Supports dynamic segments: /links/:id, /users/:userId/stats, etc.
     * @private
     */
    _matchRoute(path) {
        for (const [routePath, config] of this.routes) {
            const paramNames = [];
            const regexPath  = routePath.replace(/:([^/]+)/g, (_, name) => {
                paramNames.push(name);
                return '([^/]+)';
            });

            const match = path.match(new RegExp(`^${regexPath}$`));
            if (!match) continue;

            const urlParams = {};
            paramNames.forEach((name, i) => {
                urlParams[name] = match[i + 1];
            });
            return { config, urlParams };
        }
        return null;
    }

    /**
     * Fetches and caches an HTML template file.
     * Throws if the file is not found or if the server falls back to index.html.
     * @private
     */
    async _loadTemplate(templatePath) {
        const path = templatePath.startsWith('/') ? templatePath : `/${templatePath}`;

        if (this.templateCache.has(path)) {
            return this.templateCache.get(path);
        }

        const response = await fetch(path);
        if (!response.ok) {
            throw new Error(
                `Router: Template fetch failed (${response.status}): ${path}`
            );
        }

        const html = await response.text();

        // Detect Webpack's "return index.html for unknown paths" fallback
        if (html.includes('src/main.js') || html.includes('<div id="app">')) {
            throw new Error(
                `Router: Server returned index.html for "${path}". Verify the template path.`
            );
        }

        this.templateCache.set(path, html);
        return html;
    }

    /** @private */
    _emit404() {
        this.eventBus.emit(this.eventBus.EVENTS.ERROR_OCCURRED, {
            type:    'NOT_FOUND',
            message: 'Route not found',
        });
    }
}

export default Router;