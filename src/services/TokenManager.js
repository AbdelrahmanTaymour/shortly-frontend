/**
 * TokenManager — In-memory access token store.
 *
 * RESPONSIBILITY: Hold the current short-lived access token in JavaScript
 *                 process memory. Nothing else.
 *
 * ─── SECURITY MODEL (BFF — Backend For Frontend) ─────────────────────────────
 *
 * There are two tokens in this system with very different security profiles:
 *
 *   REFRESH TOKEN  (long-lived, ~7 days)
 *     Lives exclusively in an HttpOnly / Secure / SameSite=None cookie managed
 *     by the server. JavaScript can NEVER read, write, or intercept it.
 *     An XSS attack cannot steal it. It is sent automatically by the browser
 *     only to the exact endpoints that need it (/api/auth/refresh-token,
 *     /api/auth/logout). TokenManager has no knowledge of it.
 *
 *   ACCESS TOKEN  (short-lived, typically 15 min)
 *     Lives in JavaScript memory — a plain private field on this class.
 *     It is NEVER written to localStorage, sessionStorage, or a JS-readable
 *     cookie. An XSS attack can read it only for the lifetime of the current
 *     page; it expires in minutes and cannot be refreshed without the server
 *     issuing a new one via the HttpOnly cookie.
 *
 * ─── TRADE-OFF ────────────────────────────────────────────────────────────────
 *
 *  Consequence: every cold page load (F5, new tab) loses the in-memory token.
 *  AuthService.checkAuth() calls POST /api/auth/refresh-token immediately on
 *  startup; the browser sends the HttpOnly cookie automatically; the server
 *  validates it and returns a fresh access token. This takes one round-trip
 *  (~50–200 ms on localhost). The user sees no login prompt.
 *
 *  This is an intentional, accepted cost for eliminating the primary vector
 *  for persistent token theft via XSS.
 *
 * ALLOWED:   Read / write the access token and its expiry in memory
 * FORBIDDEN: localStorage · sessionStorage · cookies · HTTP calls · EventBus
 */

/** Refresh early when the token is within this window of expiry. */
const REFRESH_BUFFER_MS = 5 * 60 * 1000; // 5 minutes

export default class TokenManager {
    #accessToken = null;
    #expiry = null;

    // ─── Public API ───────────────────────────────────────────────────────────

    /** The current access token string, or null if absent / cleared. */
    get accessToken() { return this.#accessToken; }

    /** True when an access token is held in memory (regardless of expiry). */
    get exists() { return !!this.#accessToken; }

    /**
     * True when no token is held OR when the token is within REFRESH_BUFFER_MS
     * of its expiry time. Used by AuthService to proactively refresh before
     * sending a protected request from an idle tab.
     */
    get isExpired() {
        if (!this.#expiry) return true;
        return Date.now() > (this.#expiry - REFRESH_BUFFER_MS);
    }

    /**
     * Store a new access token in memory.
     * Calling with a falsy accessToken is equivalent to calling clear().
     *
     * Note: there is deliberately NO refreshToken parameter.
     *       The refresh token is managed solely by the server (HttpOnly cookie).
     *
     * @param {string}        accessToken  - The JWT access token string.
     * @param {string|number} expiry       - ISO date string or Unix ms timestamp.
     */
    setToken(accessToken, expiry) {
        if (!accessToken) return this.clear();
        this.#accessToken = accessToken;
        this.#expiry = this.#parseExpiry(expiry);
    }

    /**
     * Wipe the in-memory token.
     * Called by AuthService on logout or when a refresh attempt fails.
     * Has no effect on the server-side HttpOnly cookie — that is cleared
     * by the server's /api/auth/logout endpoint.
     */
    clear() {
        this.#accessToken = null;
        this.#expiry = null;
    }

    // ─── Private Helpers ──────────────────────────────────────────────────────

    /**
     * Normalizes expiry to a Unix timestamp in milliseconds.
     * Falls back to 1 hour from now if the value is missing or unparseable.
     * @private
     */
    #parseExpiry(expiry) {
        if (!expiry) return Date.now() + 3_600_000;
        const parsed = new Date(expiry).getTime();
        return Number.isNaN(parsed) ? Date.now() + 3_600_000 : parsed;
    }
}