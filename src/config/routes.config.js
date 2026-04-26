/**
 * Routes Configuration
 * Defines all application routes and their associated pages
 */

// Import page classes
import LoginPage from '../ui/pages/AuthPages/LoginPage/LoginPage.js';
import RegisterPage from '../ui/pages/AuthPages/RegisterPage/RegisterPage.js';
import ForgotPasswordPage from '../ui/pages/AuthPages/ForgotPasswordPage/ForgotPasswordPage.js';
import LandingPage from '../ui/pages/LandingPage/LandingPage.js';
import HomePage from '../ui/pages/HomePage/HomePage.js';
import LinksPage from '../ui/pages/LinksPage/LinksPage.js';
import LinkStatsPage from '../ui/pages/LinkStatsPage/LinkStatsPage.js';
import AnalyticsPage from '../ui/pages/AnalyticsPage/AnalyticsPage.js';
import ProfilePage from '../ui/pages/ProfilePage/ProfilePage.js';
import SettingsPage from '../ui/pages/SettingsPage/SettingsPage.js';

const routesConfig = [
    // Public routes
    {
        path: '/register',
        templatePath: '/ui/pages/AuthPages/RegisterPage/RegisterPage.html',
        pageClass: RegisterPage,
        title: 'Register - Shortly',
        public: true
    },
    {
        path: '/login',
        templatePath: '/ui/pages/AuthPages/LoginPage/LoginPage.html',
        pageClass: LoginPage,
        title: 'Login - Shortly',
        public: true
    },
    {
        path: '/forgot-password',
        templatePath: '/ui/pages/AuthPages/ForgotPasswordPage/ForgotPasswordPage.html',
        pageClass: ForgotPasswordPage,
        title: 'Forgot Password - Shortly',
        public: true
    },

    // Protected routes
    {
        path: '/',
        templatePath: '/ui/pages/LandingPage/LandingPage.html',
        pageClass: LandingPage,
        title: 'Shortly - Track Your Success',
        public: true
    },
    {
        path: '/home',
        templatePath: '/ui/pages/HomePage/HomePage.html',
        pageClass: HomePage,
        title: 'Dashboard - Shortly',
        public: false
    },
    {
        path: '/links',
        templatePath: '/ui/pages/LinksPage/LinksPage.html',
        pageClass: LinksPage,
        title: 'Links - Shortly',
        public: false
    },
    {
        path: '/links/:id/stats',
        templatePath: null,
        pageClass: LinkStatsPage,
        title: 'Link Statistics - Shortly',
        public: false
    },
    {
        path: '/qr',
        templatePath: 'sections/qr.html',
        pageClass: null, // To be defined
        title: 'QR Codes - Shortly',
        public: false
    },
    {
        path: '/analytics',
        templatePath: '/ui/pages/AnalyticsPage/AnalyticsPage.html',
        pageClass: AnalyticsPage,
        title: 'Analytics - Shortly',
        public: false
    },
    {
        path: '/profile',
        templatePath: '/ui/pages/ProfilePage/ProfilePage.html',
        pageClass: ProfilePage,
        title: 'Profile - Shortly',
        public: false
    },
    {
        path: '/settings',
        templatePath: '/ui/pages/SettingsPage/SettingsPage.html',
        pageClass: SettingsPage,
        title: 'Settings - Shortly',
        public: false
    },
    {
        path: '/admin',
        templatePath: 'sections/admin.html',
        pageClass: null, // To be defined
        title: 'Admin Panel - Shortly',
        public: false
    },
    {
        path: '/organization',
        templatePath: 'sections/organization.html',
        pageClass: null, // To be defined
        title: 'My Organization - Shortly',
        public: false
    }
];

export default routesConfig;
