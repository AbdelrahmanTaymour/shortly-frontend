/**
 * Routes Configuration
 *
 * ─── CHANGE FROM PREVIOUS VERSION ───────────────────────────────────────────
 *
 * Static page-class imports replaced with `pageLoader` factory functions.
 *
 * BEFORE:
 *   import HomePage from '../ui/pages/HomePage/HomePage.js';
 *   { path: '/home', pageClass: HomePage, ... }
 *
 * AFTER:
 *   { path: '/home', pageLoader: () => import('../ui/pages/HomePage/HomePage.js'), ... }
 *
 * WHY THIS WORKS:
 *   Each `() => import(...)` is a dynamic import expression. Webpack sees these
 *   at build time and splits each page's module graph into its own async chunk.
 *   The chunk is downloaded only when Router.navigate() calls pageLoader()
 *   for the first time — i.e. when the user actually visits that route.
 *
 *   Subsequent visits to the same route are free: the browser has cached the
 *   chunk and the module is already in the module registry.
 *
 * ROUTES WITH pageClass: null (qr, admin, organization):
 *   These routes have no pageLoader. _setupRoutes() in main.js guards on
 *   `!route.pageLoader` and skips them, so they remain unregistered
 *   (navigating to them emits a 404 event, same as before).
 *
 * NO CHANGES REQUIRED IN:
 *   Application.js   — receives a resolved class in NAVIGATION_COMPLETED, as always.
 *   BasePage.js      — unchanged.
 *   Any page class   — unchanged internally.
 */

const routesConfig = [

    // ── Public routes ─────────────────────────────────────────────────────────

    {
        path: '/register',
        templatePath: '/ui/pages/AuthPages/RegisterPage/RegisterPage.html',
        pageLoader: () => import('../ui/pages/AuthPages/RegisterPage/RegisterPage.js'),
        title: 'Register - Shortly',
        public: true,
    },
    {
        path: '/login',
        templatePath: '/ui/pages/AuthPages/LoginPage/LoginPage.html',
        pageLoader: () => import('../ui/pages/AuthPages/LoginPage/LoginPage.js'),
        title: 'Login - Shortly',
        public: true,
    },
    {
        path: '/forgot-password',
        templatePath: '/ui/pages/AuthPages/ForgotPasswordPage/ForgotPasswordPage.html',
        pageLoader: () => import('../ui/pages/AuthPages/ForgotPasswordPage/ForgotPasswordPage.js'),
        title: 'Forgot Password - Shortly',
        public: true,
    },

    // ── Landing ───────────────────────────────────────────────────────────────

    {
        path: '/',
        templatePath: '/ui/pages/LandingPage/LandingPage.html',
        pageLoader: () => import('../ui/pages/LandingPage/LandingPage.js'),
        title: 'Shortly - Track Your Success',
        public: true,
    },

    // ── Protected routes ──────────────────────────────────────────────────────

    {
        path: '/home',
        templatePath: '/ui/pages/HomePage/HomePage.html',
        pageLoader: () => import('../ui/pages/HomePage/HomePage.js'),
        title: 'Dashboard - Shortly',
        public: false,
    },
    {
        path: '/links',
        templatePath: '/ui/pages/LinksPage/LinksPage.html',
        pageLoader: () => import('../ui/pages/LinksPage/LinksPage.js'),
        title: 'Links - Shortly',
        public: false,
    },
    {
        path: '/links/:id/stats',
        templatePath: null,
        pageLoader: () => import('../ui/pages/LinkStatsPage/LinkStatsPage.js'),
        title: 'Link Statistics - Shortly',
        public: false,
    },
    {
        path: '/analytics',
        templatePath: '/ui/pages/AnalyticsPage/AnalyticsPage.html',
        pageLoader: () => import('../ui/pages/AnalyticsPage/AnalyticsPage.js'),
        title: 'Analytics - Shortly',
        public: false,
    },
    {
        path: '/profile',
        templatePath: '/ui/pages/ProfilePage/ProfilePage.html',
        pageLoader: () => import('../ui/pages/ProfilePage/ProfilePage.js'),
        title: 'Profile - Shortly',
        public: false,
    },
    {
        path: '/settings',
        templatePath: '/ui/pages/SettingsPage/SettingsPage.html',
        pageLoader: () => import('../ui/pages/SettingsPage/SettingsPage.js'),
        title: 'Settings - Shortly',
        public: false,
    },
];

export default routesConfig;