/**
 * Router — URL Routing and Page Navigation
 *
 * RESPONSIBILITY: Match URL to route config, load templates, manage history.
 */
class Router {
    constructor(eventBus) {
        this.eventBus = eventBus;
        this.routes = new Map();
        this.currentRoute = null;
        this.isNavigating = false;
        this.templateCache = new Map();

        // Injected via setAuthGuard(). Returns true when the user is authenticated.
        // Defaults to () => false so protected routes redirect to /login even
        // if the guard is never configured (safe-by-default).
        this._authGuard = () => false;
    }

    /**
     * Provides the authentication predicate for the route guard.
     * Must be called exactly once from main.js after AuthService is ready.
     *
     * Example:
     *   router.setAuthGuard(() => authService.isAuthenticated);
     *
     * The function is called on every navigation, so it always reflects the
     * current live state — no stale snapshot issues.
     *
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
     * @param {string} path   - Route path (e.g., '/Links', '/Links/:id')
     * @param {Object} config
     * @param {Function} config.pageClass    - Page class to instantiate (required)
     * @param {string}   config.templatePath - Path to HTML template (optional)
     * @param {string}   config.title        - Browser tab title
     * @param {boolean}  config.public       - false = requires authentication
     */
    addRoute(path, config) {
        if (!config.pageClass) {
            throw new Error(`Router: Route "${path}" must have a pageClass.`);
        }
        this.routes.set(path, config);
    }

    /**
     * Navigate to a path.
     *
     * @param {string}  path
     * @param {{updateHistory: boolean}}  options
     * @param {boolean} options.updateHistory - Push to browser history (default: true)
     * @param {Object}  options.params        - Extra params merged with URL params
     * @returns {Promise<void>}
     */
    async navigate(path, options = {}) {
        const {updateHistory = true, params = {}} = options;

        // Prevent overlapping navigations (e.g., rapid link clicks)
        if (this.isNavigating) return;

        const match = this._matchRoute(path);
        if (!match) {
            console.error(`Router: No route registered for "${path}"`);
            this._emit404();
            return;
        }

        const {config: route, urlParams} = match;
        const combinedParams = {...urlParams, ...params};

        // ── Auth guard ─────────────────────────────────────────────────────────
        // route.public === false means the route requires authentication.
        // this._authGuard() is the injected predicate — Router knows nothing
        // about *how* authentication works, only the boolean result.
        if (route.public === false && !this._authGuard()) {
            return this.navigate('/login', {
                params: {...combinedParams, redirect: path},
            });
        }

        try {
            this.isNavigating = true;
            this.eventBus.emit(this.eventBus.EVENTS.NAVIGATION_STARTED, {path});

            let template = '';
            if (route.templatePath) {
                try {
                    template = await this._loadTemplate(route.templatePath);
                } catch (templateError) {
                    console.warn(
                        `Router: Template "${route.templatePath}" could not be loaded — ` +
                        `mounting "${path}" without pre-loaded HTML. ` +
                        `PageClass.mount() must render its own content.`,
                        templateError.message
                    );
                    // template stays ''
                }
            }

            if (updateHistory) {
                const url = new URL(window.location);
                url.pathname = path;
                history.pushState({path, params: combinedParams}, route.title, url);
            }

            document.title = route.title || 'Shortly';
            this.currentRoute = {path, config: route, params: combinedParams};

            this.eventBus.emit(this.eventBus.EVENTS.NAVIGATION_COMPLETED, {
                path,
                params: combinedParams,
                template,
                pageClass: route.pageClass,
                public: route.public,    // Application reads this to pick the layout shell
            });

        } catch (error) {
            console.error('Router: Navigation error:', error);
        } finally {
            this.isNavigating = false;
        }
    }

    // ─── History helpers ──────────────────────────────────────────────────────

    back() {
        history.back();
    }

    forward() {
        history.forward();
    }

    getCurrentRoute() {
        return this.currentRoute;
    }

    /**
     * Registers the popstate listener so browser back/forward triggers navigation.
     * Called once from Application._setupEventListeners().
     *
     * @param {Function} callback - (path, params, updateHistory) => void
     */
    setupHistoryListener(callback) {
        window.addEventListener('popstate', (event) => {
            const path = event.state?.path || '/';
            const params = event.state?.params || {};
            callback(path, params, false);
        });
    }

    // ─── Private ──────────────────────────────────────────────────────────────

    /**
     * Matches a URL path against all registered routes.
     * Supports dynamic segments: /Links/:id, /users/:userId/stats, etc.
     * Returns { config, urlParams } or null if no route matches.
     * @private
     */
    _matchRoute(path) {
        for (const [routePath, config] of this.routes) {
            const paramNames = [];
            const regexPath = routePath.replace(/:([^/]+)/g, (_, name) => {
                paramNames.push(name);
                return '([^/]+)';
            });

            const match = path.match(new RegExp(`^${regexPath}$`));
            if (!match) continue;

            const urlParams = {};
            paramNames.forEach((name, i) => {
                urlParams[name] = match[i + 1];
            });
            return {config, urlParams};
        }
        return null;
    }

    /**
     * Fetches and caches an HTML template file.
     * Throws if the file is not found or if the server falls back to index.html
     * (the standard Webpack dev-server behaviour for missing static files).
     * @private
     */
    async _loadTemplate(templatePath) {
        const path = templatePath.startsWith('/') ? templatePath : `/${templatePath}`;

        if (this.templateCache.has(path)) {
            return this.templateCache.get(path);
        }

        const response = await fetch(path);
        if (!response.ok) {
            throw new Error(`Router: Template fetch failed (${response.status}): ${path}`);
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
            type: 'NOT_FOUND',
            message: 'Route not found',
        });
    }
}

export default Router;