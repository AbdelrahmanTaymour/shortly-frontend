/**
 * Auth.slice — Initial state shape for the authentication domain.
 *
 * With this slice, any component can:
 *   1. Read the current Auth state synchronously: store.getState('Auth')
 *   2. React to Auth changes automatically: store.subscribe('Auth', callback)
 *
 * OWNED BY: AuthService (only AuthService calls store.dispatch('Auth', ...))
 * READ BY:  UserDropdown, Header, ProfileHeaderCard, SecurityStatusCard,
 *           QuotaStatusCard, all pages (Auth guard), BasePage
 */

/** @returns {Object} The initial state for the Auth slice */
export function createAuthSlice() {
    return {
        /** @type {Object|null} The authenticated user object, or null if guest */
        currentUser: null,

        /** @type {boolean} True once checkAuth() has completed (success or failure) */
        isInitialized: false,

        /**
         * @type {boolean} True when the user has a valid session.
         * Derived from tokenManager.exists && currentUser !== null in AuthService,
         * then written here so ProfileHeaderCard don't need to know about TokenManager.
         */
        isAuthenticated: false,

        /** @type {boolean} True while login/register/logout is in-flight */
        isLoading: false,

        /** @type {string|null} Last error message from an Auth operation */
        error: null,
    };
}