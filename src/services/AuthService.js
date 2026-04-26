/**
 * AuthService — Authentication Business Logic.
 *
 * RESPONSIBILITY: Orchestrate Auth flows, write Auth state to the Store,
 *                 and emit domain events on the EventBus.
 *
 * ALLOWED:   Call AuthApi · call TokenManager · dispatch to store · emit events
 * FORBIDDEN: DOM access · window.location · ApiClient.setAuthToken() · Router import
 *
 * ─── BFF SESSION MODEL ────────────────────────────────────────────────────────
 *
 * There are exactly two ways a session starts in this app:
 *
 *   A) Standard login / register:
 *      AuthController sets the HttpOnly refreshToken cookie AND returns the
 *      access token in the JSON body. AuthService stores the access token
 *      in TokenManager (in-memory only).
 *
 *   B) Google OAuth:
 *      OAuthController sets the HttpOnly refreshToken cookie and redirects
 *      the browser back to the frontend — NO tokens in the URL, ever.
 *      The frontend boots, calls checkAuth() → POST /api/auth/refresh-token,
 *      the browser sends the cookie automatically, the server returns the
 *      access token, and AuthService stores it in memory.
 */

export default class AuthService {
    /** Prevents parallel refresh calls across all instances. */
    static #refreshPromise = null;

    /**
     * @param {import('../infrastructure/http/AuthApi.js').default}  authApi
     * @param {import('../store/Store.js').Store}                    store
     * @param {import('../app/EventBus.js').default}                 eventBus
     * @param {import('./TokenManager.js').default}                  tokenManager
     */
    constructor(authApi, store, eventBus, tokenManager) {
        this.authApi = authApi;
        this.store = store;
        this.eventBus = eventBus;
        this.tokenManager = tokenManager;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // STORE GETTERS
    // ═══════════════════════════════════════════════════════════════════════

    get isAuthenticated() {
        return this.store.getState('auth').isAuthenticated;
    }

    get currentUser() {
        return this.store.getState('auth').currentUser;
    }

    get isLoading() {
        return this.store.getState('auth').isLoading;
    }

    get token() {
        return this.tokenManager.accessToken;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // INTERCEPTOR SETUP
    // Called once from main.js — keeps constructors side-effect free.
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * Registers request + response interceptors on the ApiClient.
     * Must be called exactly once from main.js after service construction.
     * @param {import('../infrastructure/http/ApiClient.js').ApiClient} apiClient
     */
    setupInterceptors(apiClient) {
        this.#setupRequestInterceptor(apiClient);
        this.#setupResponseInterceptor(apiClient);
    }

    /**
     * Attaches a valid Bearer token before every non-auth request.
     * If the in-memory token exists but is near expiry, refreshes proactively.
     * Skips auth endpoints to prevent infinite loops.
     * @private
     */
    #setupRequestInterceptor(apiClient) {
        apiClient.addRequestInterceptor(async (config) => {
            const isAuthEndpoint =
                config.url?.includes('/api/auth/login') ||
                config.url?.includes('/api/auth/register') ||
                config.url?.includes('/api/auth/refresh-token');

            if (isAuthEndpoint) return config;

            if (AuthService.#refreshPromise) {
                // A refresh is in flight — wait for it so we attach the new token.
                await AuthService.#refreshPromise;
            } else if (this.tokenManager.exists && this.tokenManager.isExpired) {
                // Proactively refresh when an in-memory token is within the
                // 5-minute buffer window (idle tab scenario).
                try {
                    await this.refreshAccessToken();
                } catch { /* guest */
                }
            }

            const token = this.tokenManager.accessToken;
            if (token) {
                config.headers = config.headers || {};
                config.headers['Authorization'] = `Bearer ${token}`;
            }

            return config;
        });
    }

    /**
     * Catches 401 responses on protected endpoints, attempts one token refresh,
     * then replays the original request with the new token.
     *
     * Skips: /login, /register (401 = wrong credentials), /refresh-token,
     * /logout (retrying would loop).
     * @private
     */
    #setupResponseInterceptor(apiClient) {
        let isRetrying = false;

        apiClient.addResponseInterceptor(async (response, context) => {
            if (response.status !== 401) return response;

            const ep = context.endpoint || '';
            const isSkipped =
                ep.includes('/api/auth/login') ||
                ep.includes('/api/auth/register') ||
                ep.includes('refresh-token') ||
                ep.includes('logout');

            if (isSkipped || isRetrying) return response;

            isRetrying = true;
            try {
                const refreshResult = await this.refreshAccessToken();
                if (refreshResult?.accessToken) {
                    return await apiClient.request(context.method, context.endpoint, context.options);
                }
                await this.logout(false);
                this.eventBus.emit(this.eventBus.EVENTS.AUTH_SESSION_EXPIRED);

            } catch (err) {
                console.error('AuthService: refresh during 401-retry failed:', err.message);
                await this.logout(false);
                this.eventBus.emit(this.eventBus.EVENTS.AUTH_SESSION_EXPIRED);

            } finally {
                isRetrying = false;
            }

            return response;
        });
    }

    // ═══════════════════════════════════════════════════════════════════════
    // SESSION MANAGEMENT
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * Entry point called by main.js on every page load — including the page
     * load that immediately follows a Google OAuth redirect.
     *
     * Because the server puts the refresh token in an HttpOnly cookie (not the
     * URL), both scenarios are identical from this method's perspective:
     * just call checkAuth() and let the cookie do the work.
     *
     * @returns {Promise<boolean>}
     */
    async restoreSession() {
        try {
            return await this.checkAuth();
        } catch {
            return false;
        }
    }

    /**
     * Attempts to restore a session via the HttpOnly refresh-token cookie.
     * Sets isInitialized = true regardless of outcome so router guards and
     * UI components are never left waiting.
     *
     * @returns {Promise<boolean>}
     */
    async checkAuth() {
        try {
            const tokenData = await this.refreshAccessToken();
            if (tokenData?.accessToken) {
                await this.loadCurrentUser();
                this.store.dispatch('auth', prev => ({...prev, isAuthenticated: true}));
                return true;
            }
            this.store.dispatch('auth', prev => ({
                ...prev, isAuthenticated: false, currentUser: null,
            }));
            return false;
        } catch {
            this.store.dispatch('auth', prev => ({
                ...prev, isAuthenticated: false, currentUser: null,
            }));
            return false;
        } finally {
            await this.#finalizeAuthInit();
        }
    }

    /**
     * Requests a fresh access token from the server via the HttpOnly cookie.
     *
     * Deduplicates concurrent calls with a static Promise lock — if two requests
     * fire simultaneously after an idle period only one hits the network.
     *
     * Returns null (never throws) when the session is unrecoverable.
     *
     * @returns {Promise<{accessToken:string, accessTokenExpiry:string}|null>}
     */
    async refreshAccessToken() {
        if (AuthService.#refreshPromise) return AuthService.#refreshPromise;

        AuthService.#refreshPromise = (async () => {
            try {
                const result = await this.authApi.refreshToken();
                if (!result?.accessToken) throw new Error('Empty refresh-token response.');

                // Access token stored in memory only — never in localStorage.
                this.tokenManager.setToken(result.accessToken, result.accessTokenExpiry);

                this.eventBus.emit(this.eventBus.EVENTS.TOKEN_REFRESHED);
                return result;

            } catch {
                this.tokenManager.clear();
                this.store.dispatch('auth', prev => ({
                    ...prev, isAuthenticated: false, currentUser: null,
                }));
                return null;
            } finally {
                AuthService.#refreshPromise = null;
            }
        })();

        return AuthService.#refreshPromise;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // PUBLIC AUTH METHODS
    // ═══════════════════════════════════════════════════════════════════════

    async login(payload) {
        this.#setLoading(true);
        try {
            const result = await this.authApi.login(payload);

            if (result.success && result.tokens?.accessToken) {
                await this.#syncAuthState(
                    result.tokens.accessToken,
                    result.tokens.accessTokenExpiry,
                );
                this.eventBus.emit(this.eventBus.EVENTS.USER_LOGGED_IN, {
                    user: this.store.getState('auth').currentUser,
                });
                return result;
            }

            throw new Error(result.message || 'Invalid credentials.');

        } catch (error) {
            this.tokenManager.clear();
            const message = this.#extractErrorMessage(error);
            this.#setError(message);
            throw new Error(message);
        } finally {
            this.#setLoading(false);
        }
    }

    async register(payload) {
        this.#setLoading(true);
        try {
            const result = await this.authApi.register(payload);

            if (result.success && result.tokens?.accessToken) {
                await this.#syncAuthState(
                    result.tokens.accessToken,
                    result.tokens.accessTokenExpiry,
                );
                this.eventBus.emit(this.eventBus.EVENTS.USER_LOGGED_IN, {
                    user: this.store.getState('auth').currentUser,
                });
                this.eventBus.emit(this.eventBus.EVENTS.NOTIFICATION_SHOW, {
                    type: 'success',
                    message: 'Welcome! Your account has been created.',
                });
                return result;
            }

            throw new Error(result.message || 'Registration failed.');

        } catch (error) {
            const message = this.#extractErrorMessage(error);
            this.#setError(message);
            throw new Error(message);
        } finally {
            this.#setLoading(false);
        }
    }

    /**
     * @param {boolean} shouldCallApi  Pass false during 401-recovery paths
     *                                 to avoid a redundant network call.
     */
    async logout(shouldCallApi = true) {
        try {
            // The server's logout endpoint revokes the refresh token and
            // clears the HttpOnly cookie in the same response.
            if (shouldCallApi) await this.authApi.logout();
        } finally {
            this.tokenManager.clear();
            this.store.dispatch('auth', () => ({
                currentUser: null,
                isAuthenticated: false,
                isInitialized: true,
                isLoading: false,
                error: null,
            }));
            this.eventBus.emit(this.eventBus.EVENTS.USER_LOGGED_OUT);
        }
    }

    // ─── OAuth ────────────────────────────────────────────────────────────────

    /**
     * Triggers a Google OAuth redirect.
     *
     * Emits AUTH_OAUTH_REDIRECT_REQUIRED instead of touching window.location
     * directly — services must not access the browser environment.
     * The listener in main.js performs the navigation.
     *
     * After the Google flow, OAuthController sets the HttpOnly cookie and
     * redirects back to the frontend. restoreSession() → checkAuth() picks
     * up the session on that next page load automatically.
     */
    initiateGoogleOAuth() {
        this.eventBus.emit(this.eventBus.EVENTS.AUTH_OAUTH_REDIRECT_REQUIRED, {
            provider: 'google',
        });
    }

    // ═══════════════════════════════════════════════════════════════════════
    // HELPER METHODS
    // ═══════════════════════════════════════════════════════════════════════

    async loadCurrentUser() {
        try {
            const response = await this.authApi.getCurrentUser();
            const userData = response?.data || response;
            const user = this.#mapUser(userData);
            this.store.dispatch('auth', prev => ({...prev, currentUser: user}));
            this.eventBus.emit(this.eventBus.EVENTS.USER_UPDATED, user);
            return user;
        } catch (error) {
            this.store.dispatch('auth', prev => ({...prev, currentUser: null}));
            throw error;
        }
    }

    async requestPasswordReset(email) {
        try {
            return await this.authApi.requestPasswordReset(email);
        } catch (error) {
            throw new Error(this.#extractErrorMessage(error));
        }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // PRIVATE HELPERS
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * Stores the access token in memory and loads the user profile after any
     * successful credential exchange (login, register).
     *
     * There is deliberately no refreshToken parameter — the server already
     * set the HttpOnly cookie before this method is called.
     * @private
     */
    async #syncAuthState(accessToken, expiry) {
        this.tokenManager.setToken(accessToken, expiry);
        try {
            await this.loadCurrentUser();
            this.store.dispatch('auth', prev => ({...prev, isAuthenticated: true}));
        } catch (error) {
            console.error('AuthService: failed to load user after auth sync:', error);
            await this.logout(false);
            throw error;
        }
    }

    /**
     * Sets isInitialized and emits AUTH_INITIALIZED exactly once per startup.
     * Called from checkAuth()'s finally block.
     * @private
     */
    async #finalizeAuthInit() {
        this.store.dispatch('auth', prev => ({...prev, isInitialized: true}));
        this.eventBus.emit(this.eventBus.EVENTS.AUTH_INITIALIZED);
    }

    /**
     * Extracts a human-readable message from any backend error shape.
     * Handles FluentValidation arrays, ProblemDetails, and plain Error objects.
     * @private
     */
    #extractErrorMessage(error) {
        const data = error?.data;
        if (data?.errors && typeof data.errors === 'object') {
            const messages = Object.values(data.errors).flat().filter(Boolean);
            if (messages.length > 0) return messages[0];
        }
        if (data?.message) return data.message;
        if (data?.title) return data.title;
        if (error?.message) return error.message;
        return 'An unexpected error occurred. Please try again.';
    }

    /** @private */
    #setLoading(isLoading) {
        this.store.dispatch('auth', prev => ({...prev, isLoading, error: null}));
    }

    /** @private */
    #setError(message) {
        this.store.dispatch('auth', prev => ({...prev, error: message}));
        this.eventBus.emit(this.eventBus.EVENTS.ERROR_OCCURRED, {type: 'AUTH_ERROR', message});
    }

    /** @private */
    #mapUser(data) {
        if (!data) return null;
        return {...data, id: data.id || data.sub || data.nameid};
    }
}