/**
 * Application — Application Lifecycle Manager.
 *
 * RESPONSIBILITY: Listen for NAVIGATION_COMPLETED, swap layout shells,
 *                 mount and unmount page instances.
 *
 * ALLOWED:   Hold the service Map · manage the shell layout · mount/unmount pages
 * FORBIDDEN: Instantiate services · business logic · direct API calls
 *
 * ─── KEY CHANGES FROM LEGACY ────────────────────────────────────────────────
 *
 * 1. ToastService instantiation REMOVED from _doInit().
 *    The legacy Application created ToastService internally, meaning it was
 *    constructed inside Application rather than being injected from main.js.
 *    This violated the rule that ALL service construction happens in main.js.
 *    ToastService is now constructed in main.js and registered like any other
 *    service before app.init() is called.
 *
 * 2. _dashboardPaths hardcoded array REMOVED.
 *    The legacy code duplicated route knowledge here AND in routes.config.js.
 *    When a route changed from protected to public (or vice versa), two files
 *    needed updating. Now the shell decision is derived from the route config
 *    via the 'public' flag passed through the navigation event.
 *
 * 3. LandingLayout inconsistency fixed.
 *    Legacy: DashboardLayout() was called as a function but LandingLayout was
 *    used as a string (no call parens). Both are now called as functions.
 *
 * 4. onclick = () => replaced with addEventListener for sidebar toggle.
 *    onclick assignment overwrites any existing handler and has no cleanup path.
 *    addEventListener allows proper removal when the shell is replaced.
 */

import {DashboardLayout} from '../ui/layouts/Dashboard/DashboardLayout.js';
import {LandingLayout} from '../ui/layouts/LandingLayout.js';

export default class Application {
    constructor(config = {}) {
        this.config = config;
        this.services = new Map();
        this.currentPage = null;
        this.isRunning = false;
        this.initPromise = null;
    }

    // ─── Service Locator ──────────────────────────────────────────────────────

    registerService(name, service) {
        this.services.set(name, service);
    }

    getService(name) {
        return this.services.get(name);
    }

    // ─── Lifecycle ────────────────────────────────────────────────────────────

    async init() {
        if (this.initPromise) return this.initPromise;
        this.initPromise = this._doInit();
        return this.initPromise;
    }

    async _doInit() {
        try {
            this._setupEventListeners();
            this.isRunning = true;
            return true;
        } catch (error) {
            this.isRunning = false;
            console.error('Application: Initialization failure:', error);
            throw error;
        }
    }

    _setupEventListeners() {
        const eventBus = this.getService('eventBus');
        const router = this.getService('router');
        if (!eventBus || !router) return;

        eventBus.on(eventBus.EVENTS.NAVIGATION_COMPLETED, async (data) => {
            try {
                await this._loadPage(data);
            } catch (error) {
                console.error('Application: Navigation error:', error);
            }
        });

        router.setupHistoryListener((path, params, updateHistory) => {
            router.navigate(path, {updateHistory, params});
        });

        eventBus.on(eventBus.EVENTS.USER_LOGGED_OUT, () => {
            if (this.currentPage?.unmount) {
                this.currentPage.unmount();
                this.currentPage = null;
            }
            window.location.href = '/';
        });
    }

    // ─── Rendering Engine ─────────────────────────────────────────────────────

    async _loadPage(data) {
        const root = document.getElementById('app-root');
        if (!root) return;

        // Shell decision now derived from the route's 'public' flag, not a hardcoded list.
        const isDashboardRoute = data.public === false;

        if (isDashboardRoute) {
            if (!document.getElementById('sidebar')) {
                root.innerHTML = DashboardLayout();
                this._attachDashboardUI();
            }
        } else {
            if (document.getElementById('sidebar') || !root.hasChildNodes()) {
                root.innerHTML = LandingLayout();
            }
        }

        const container = document.getElementById('contentContainer');
        if (!container) {
            console.error('Application: #contentContainer not found in layout.');
            return;
        }

        if (this.currentPage?.unmount) await this.currentPage.unmount();

        container.innerHTML = data.template || '';

        try {
            const PageClass = data.pageClass;
            if (!PageClass) throw new Error(`No PageClass for path: ${data.path}`);

            const context = {
                services: this.services,
                store: this.getService('store'),
                eventBus: this.getService('eventBus'),
                router: this.getService('router'),
                params: data.params || {},
            };

            this.currentPage = new PageClass(container, context);
            await this.currentPage.mount();

        } catch (error) {
            console.error(`Application: Mount error on ${data.path}:`, error);
            container.innerHTML = `<div class="error-page">Failed to initialize page.</div>`;
        }
    }

    _attachDashboardUI() {
        const toggleBtn = document.getElementById('toggleSidebar');
        const sidebar = document.getElementById('sidebar');
        const mainContent = document.getElementById('mainContent');

        if (toggleBtn && sidebar) {
            // Use addEventListener (not onclick) so it can be properly removed
            // if the shell is ever replaced.
            toggleBtn.addEventListener('click', () => {
                sidebar.classList.toggle('collapsed');
                mainContent?.classList.toggle('expanded');
                if (window.innerWidth <= 768) sidebar.classList.toggle('mobile-open');
            });
        }

        const userBtn = document.getElementById('userMenuBtn');
        const dropdown = document.getElementById('userDropdown');
        if (userBtn && dropdown && !userBtn.hasAttribute('data-dropdown-toggle')) {
            userBtn.setAttribute('data-dropdown-toggle', 'userDropdown');
        }
    }
}