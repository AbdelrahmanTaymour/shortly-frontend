/**
 * Profile.slice — Initial state shape for the Profile domain.
 *
 * OWNED BY:  ProfileService (only ProfileService calls store.dispatch('Profile', ...))
 * READ BY:   ProfilePage, ProfileHeaderCard, ProfileEditForm, QuotaStatusCard
 *
 * Components subscribe to this slice and re-render automatically when
 * ProfileService.updateProfile() or getProfile() dispatches new data.
 * No component ever holds its own copy of Profile or quota data.
 */
export function createProfileSlice() {
    return {
        /** @type {Object|null} The authenticated user's full Profile object */
        profile: null,

        /** @type {Object|null} Quota / usage limits returned by the API */
        quota: null,

        /** @type {boolean} True while any Profile operation is in-flight */
        isLoading: false,

        /** @type {string|null} Last error message from a Profile operation */
        error: null,
    };
}