/**
 * ProfileService — Profile business logic.
 *
 * RESPONSIBILITY: Orchestrate Profile CRUD, write state to the Store,
 *                 emit domain events on the EventBus.
 *
 * ALLOWED:   Call ProfileApi · dispatch to store · emit events · cache data
 * FORBIDDEN: DOM access · import any UI module · navigate routes
 *
 * ─── FIXES IN THIS REVISION ──────────────────────────────────────────────────
 *
 * FIX 1 — CRITICAL: Constructor signature corrected.
 *   Before: constructor(profileApi, eventBus)
 *   After:  constructor(profileApi, store, eventBus)
 *
 *   main.js already called: new ProfileService(profileApi, store, eventBus)
 *   The old constructor silently received `store` as `eventBus` and dropped
 *   the real `eventBus` entirely. This meant:
 *     - eventBus.emit() called on the store object → TypeError at runtime
 *     - No events were ever emitted from this service
 *
 * FIX 2: All state moved to the Store.
 *   Before: _profile and _quota lived as private instance properties.
 *           Components had to call service methods to get data, and could
 *           not react to changes automatically.
 *   After:  ProfileService dispatches to store('Profile'). Components
 *           subscribe to the slice and re-render automatically.
 *   Note:   #profileCache and #quotaCache remain on the instance purely
 *           as a performance optimization (avoid redundant API calls).
 *           The authoritative copy is always the store slice.
 *
 * FIX 3: Private fields use # (ES2022) instead of _ underscore convention.
 *
 * FIX 4: #handleSave flow corrected.
 *   Before: After updateProfile, the page called profileService.getProfile(true)
 *           to refresh and then manually pushed data into each component.
 *   After:  updateProfile dispatches an optimistic update to the store. Any
 *           component subscribed to 'Profile' re-renders automatically.
 *           If a server-confirmed refresh is needed, call getProfile(true)
 *           from the page — the store subscriber propagates the result.
 */

export default class ProfileService {
    /** @type {Object|null} In-memory cache to avoid redundant API calls */
    #profileCache = null;

    /** @type {Object|null} In-memory cache for quota data */
    #quotaCache = null;

    /**
     * @param {import('../infrastructure/http/ProfileApi.js').default} profileApi
     * @param {import('../store/Store.js').Store}                      store
     * @param {import('../app/EventBus.js').default}                   eventBus
     */
    constructor(profileApi, store, eventBus) {
        this.profileApi = profileApi;
        this.store = store;
        this.eventBus = eventBus;
    }

    // ─── Private helpers ──────────────────────────────────────────────────────

    get isLoading() {
        return this.store.getState('profile').isLoading;
    }

    get lastError() {
        return this.store.getState('profile').error;
    }

    // ─── Profile ──────────────────────────────────────────────────────────────

    /** @private */
    #setLoading(isLoading) {
        this.store.dispatch('profile', prev => ({...prev, isLoading, error: null}));
    }

    /** @private */
    #setError(message) {
        this.store.dispatch('profile', prev => ({...prev, isLoading: false, error: message}));
        this.eventBus.emit(this.eventBus.EVENTS.ERROR_OCCURRED, {
            type: 'PROFILE_ERROR',
            message,
        });
    }

    // ─── Quota ────────────────────────────────────────────────────────────────

    /**
     * Fetch the current user's Profile.
     * Dispatches to the 'Profile' store slice so all subscribers update.
     *
     * @param {boolean} [forceRefresh=false] — bypass the in-memory cache
     * @returns {Promise<Object>}
     */
    async getProfile(forceRefresh = false) {
        if (this.#profileCache && !forceRefresh) {
            return this.#profileCache;
        }

        this.#setLoading(true);
        try {
            const profile = await this.profileApi.getProfile();
            this.#profileCache = profile;

            this.store.dispatch('profile', prev => ({
                ...prev,
                profile,
                isLoading: false,
            }));

            return profile;
        } catch (error) {
            this.#setError(error.message);
            throw error;
        }
    }

    // ─── Account deletion ─────────────────────────────────────────────────────

    /**
     * Persist updated Profile fields.
     * Dispatches an optimistic update to the store immediately on success,
     * so subscribers re-render without waiting for a follow-up getProfile() call.
     *
     * @param {Object} data — UpdateUserProfileRequest fields
     * @returns {Promise<boolean>}
     */
    async updateProfile(data) {
        this.#setLoading(true);
        try {
            // Strip server-managed fields that must not be sent in the payload
            const {updatedAt, createdAt, id, email, ...payload} = data;

            const result = await this.profileApi.updateProfile(payload);

            if (result) {
                // Optimistic update — merge into cache and store
                this.#profileCache = {
                    ...this.#profileCache,
                    ...payload,
                    updatedAt: new Date().toISOString(),
                };

                this.store.dispatch('profile', prev => ({
                    ...prev,
                    profile: this.#profileCache,
                    isLoading: false,
                }));

                // Notify the header and any other cross-feature subscribers
                this.eventBus.emit(this.eventBus.EVENTS.USER_UPDATED, this.#profileCache);
            } else {
                this.store.dispatch('profile', prev => ({...prev, isLoading: false}));
            }

            return result;
        } catch (error) {
            this.#setError(error.message);
            throw error;
        }
    }

    // ─── Cache management ─────────────────────────────────────────────────────

    /**
     * Fetch quota / usage limits.
     * Dispatches to the 'Profile' store slice.
     *
     * @param {boolean} [forceRefresh=false]
     * @returns {Promise<Object>}
     */
    async getQuotaStatus(forceRefresh = false) {
        if (this.#quotaCache && !forceRefresh) {
            return this.#quotaCache;
        }

        this.#setLoading(true);
        try {
            const quota = await this.profileApi.getQuotaStatus();
            this.#quotaCache = quota;

            this.store.dispatch('profile', prev => ({
                ...prev,
                quota,
                isLoading: false,
            }));

            return quota;
        } catch (error) {
            this.#setError(error.message);
            throw error;
        }
    }

    // ─── Synchronous reads ────────────────────────────────────────────────────

    /**
     * Initiate a soft-delete / account deletion request.
     * Clears all local and store state on success.
     * @returns {Promise<boolean>}
     */
    async requestAccountDeletion() {
        this.#setLoading(true);
        try {
            const result = await this.profileApi.requestAccountDeletion();
            if (result) {
                this.clearCache();
                this.eventBus.emit(this.eventBus.EVENTS.USER_LOGGED_OUT);
            } else {
                this.store.dispatch('profile', prev => ({...prev, isLoading: false}));
            }
            return result;
        } catch (error) {
            this.#setError(error.message);
            throw error;
        }
    }

    /**
     * Clears both the in-memory caches and the store slice.
     * Called on logout or account deletion.
     */
    clearCache() {
        this.#profileCache = null;
        this.#quotaCache = null;

        this.store.dispatch('profile', prev => ({
            ...prev,
            profile: null,
            quota: null,
            isLoading: false,
            error: null,
        }));
    }

    getProfile_sync() {
        return this.store.getState('profile').profile;
    }

    getQuotaStatus_sync() {
        return this.store.getState('profile').quota;
    }
}