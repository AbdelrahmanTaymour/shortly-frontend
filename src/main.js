/**
 * main.js — Application Bootstrap.
 *
 * RESPONSIBILITY: Wire dependencies and start the application.
 *                 Read like a table of contents. Zero business logic.
 *
 * ALLOWED:   Instantiate infrastructure · register services · call setup methods
 *            · restore session · trigger initial navigation
 * FORBIDDEN: Business logic · DOM manipulation · inline event handler logic · HTTP calls
 */

import '../styles/main.css';
import {store} from './store';
import EventBus from './app/EventBus.js';
import Router from './app/Router.js';
import Application from './app/Application.js';
import UIEventManager from './utils/uiEventManager.js';
import apiConfig from './config/api.config.js';
import appConfig from './config/app.config.js';
import routesConfig from './config/routes.config.js';

import {ApiClient} from './infrastructure/http/ApiClient.js';
import AuthApi from './infrastructure/http/AuthApi.js';
import LinksApi from './infrastructure/http/LinksApi.js';
import AnalyticsApi from './infrastructure/http/AnalyticsApi.js';
import ProfileApi from './infrastructure/http/ProfileApi.js';
import SettingsApi from './infrastructure/http/SettingsApi.js';

import TokenManager from './services/TokenManager.js';
import AuthService from './services/AuthService.js';
import LinksService from './services/LinksService.js';
import AnalyticsService from './services/AnalyticsService.js';
import ProfileService from './services/ProfileService.js';
import SettingsService from './services/SettingsService.js';
import ToastService from './services/ToastService.js';

import HeaderController from './ui/components/navigation/Header/HeaderController.js';


document.addEventListener('DOMContentLoaded', async () => {
    try {
        await initializeApp();
    } catch (error) {
        console.error('Critical bootstrap error:', error);
        _displayCrashPage(error);
    }
});

async function initializeApp() {
    // Core Infrastructure
    const eventBus = new EventBus();
    const apiClient = new ApiClient(apiConfig.baseUrl);

    // API Layer (pure HTTP wrappers) ─────────────────────────────────────
    const authApi = new AuthApi(apiClient);
    const linksApi = new LinksApi(apiClient);
    const analyticsApi = new AnalyticsApi(apiClient);
    const profileApi = new ProfileApi(apiClient);
    const settingsApi = new SettingsApi(apiClient);

    // Service Layer
    const router = new Router(eventBus);
    const tokenManager = new TokenManager();
    const authService = new AuthService(authApi, store, eventBus, tokenManager);
    const linksService = new LinksService(linksApi, store, eventBus);
    const analyticsService = new AnalyticsService(analyticsApi, store, eventBus);
    const profileService = new ProfileService(profileApi, store, eventBus);
    const settingsService = new SettingsService(settingsApi, store, eventBus);
    const toastService = new ToastService(eventBus);

    // Router auth guard
    router.setAuthGuard(() => authService.isAuthenticated);

    // HTTP Interceptors
    authService.setupInterceptors(apiClient);

    // OAuth redirect listener
    // AuthService emits this event; the actual window.location mutation
    // happens here in main.js (the only place allowed to touch the browser).
    eventBus.on(eventBus.EVENTS.AUTH_OAUTH_REDIRECT_REQUIRED, ({provider}) => {
        if (provider === 'google') {
            window.location.href = `${apiConfig.baseUrl}${apiConfig.endpoints.oauth.googleLogin}`;
        }
    });

    // Session-expired listener
    // The 401-retry interceptor emits this instead of calling router.navigate()
    // directly — the service layer must not import the Router.
    eventBus.on(eventBus.EVENTS.AUTH_SESSION_EXPIRED, () => {
        router.navigate('/login');
    });

    // Application assembly
    const app = new Application(appConfig);
    app.registerService('eventBus', eventBus);
    app.registerService('router', router);
    app.registerService('store', store);
    app.registerService('auth', authService);
    app.registerService('links', linksService);
    app.registerService('analytics', analyticsService);
    app.registerService('profile', profileService);
    app.registerService('settings', settingsService);
    app.registerService('toast', toastService);

    await app.init();

    // UI Controllers
    const headerController = new HeaderController(authService, eventBus);
    headerController.initialize();

    // Route Registration
    _setupRoutes(router);
    UIEventManager.initialize(router);

    // Session Restore & Initial Navigation
    await authService.restoreSession();

    const targetPath = _normalizeInitialPath(window.location.pathname);
    await router.navigate(targetPath, {updateHistory: false});

    if (process.env.NODE_ENV === 'development') window.__app = app;
}

// ─── Private Helpers ──────────────────────────────────────────────────────────

function _setupRoutes(router) {
    routesConfig.forEach(route => {
        if (!route.pageClass) return;
        router.addRoute(route.path, {
            templatePath: route.templatePath,
            pageClass: route.pageClass,
            title: route.title,
            public: route.public,
        });
    });
}

function _normalizeInitialPath(pathname) {
    let path = pathname.replace(/\.html$/, '').replace(/\/index$/, '/');
    if (path.length > 1 && path.endsWith('/')) path = path.slice(0, -1);
    return path || '/';
}

function _displayCrashPage(error) {
    document.body.innerHTML = `
        <div class="error-page">
            <div class="error-container">
                <h1>Application Error</h1>
                <p>${error.message}</p>
                <button onclick="location.reload()">Retry</button>
            </div>
        </div>`;
}