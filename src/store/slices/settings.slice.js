/**
 * Settings.slice — Initial state shape for the Settings domain.
 *
 * OWNED BY:  SettingsService (only SettingsService calls store.dispatch('Settings', ...))
 * READ BY:   SettingsPage, SecurityStatusCard
 *
 * Settings operations (changePassword, changeEmail, sendVerification) are
 * fire-and-forget: the result is surfaced as a component feedback message,
 * not as persistent state. Only the security status panel needs reactive
 * store data because it is displayed as a read-only card that could be
 * refreshed.
 */
export function createSettingsSlice() {
    return {
        /**
         * @type {Object|null}
         * Cached security status response for the current user.
         * Populated by SettingsService.getSecurityStatus().
         */
        securityStatus: null,

        /** @type {boolean} True while any Settings operation is in-flight */
        isLoading: false,

        /** @type {string|null} Last error message from a Settings operation */
        error: null,
    };
}