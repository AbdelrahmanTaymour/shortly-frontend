/**
 * Application Configuration
 * Global app Settings and constants
 */
const appConfig = {
    // App info
    name: 'Shortly',
    version: '2.0.0',
    description: 'URL Shortener Dashboard',
    url: 'https://shortly.runasp.net',
    //url: 'https://localhost:5002',  // dev

    // Environment
    environment: typeof process !== 'undefined' && process.env ? process.env.NODE_ENV : 'development',

    // Storage keys
    storage: {
        accessToken: 'accessToken',
        refreshToken: 'refreshToken',
        user: 'user',
        preferences: 'userPreferences'
    },

    // Feature flags
    features: {
        analytics: true,
        qrCodes: true,
        customDomains: true,
        passwordProtection: true,
        linkExpiration: true,
        bulkActions: true,
        api: true
    },

    // Pagination defaults
    pagination: {
        defaultPageSize: 10,
        pageSizes: [10, 25, 50, 100]
    },

    // Validation rules
    validation: {
        minPasswordLength: 8,
        minUsernameLength: 3,
        maxUrlLength: 2048,
        maxCustomAliasLength: 50
    },

    // UI Settings
    ui: {
        animationDuration: 300, // ms
        debounceDelay: 300, // ms
        toastDuration: 3000 // ms
    },

    // Keyboard shortcuts
    shortcuts: {
        toggleSidebar: 'Ctrl+Shift+S',
        focusSearch: 'Ctrl+K',
        newLink: 'Ctrl+N'
    }
};

export default appConfig;
