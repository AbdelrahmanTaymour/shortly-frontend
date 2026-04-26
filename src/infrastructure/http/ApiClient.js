/**
 * ApiClient — Base HTTP transport layer.
 *
 * RESPONSIBILITY: Make HTTP requests. Nothing else.
 *
 * ALLOWED:   HTTP verbs · request/response interceptors · timeout/retry logic
 *            · CSRF header injection · request ID generation
 * FORBIDDEN: Business logic · Auth token storage · knowledge of any service
 *
 * ─── KEY CHANGES FROM LEGACY ────────────────────────────────────────────────
 *
 * 1. authToken / clearAuthToken / setAuthToken REMOVED.
 *    The legacy ApiClient stored the Bearer token as instance state AND
 *    AuthService called apiClient.setAuthToken() directly from the service
 *    layer — a violation of the dependency rule (services → infrastructure,
 *    never the reverse writing back up).
 *    Correct approach: AuthService's request interceptor attaches the token
 *    from TokenManager on every request. ApiClient never holds Auth state.
 *
 * 2. ApiError and SafeLogger extracted to their own files.
 *    They were previously defined inline here, making this file ~300 lines
 *    and making it impossible to import ApiError without importing ApiClient.
 *
 * 3. import.meta.env.MODE → process.env.NODE_ENV
 *    This is a Webpack project. import.meta.env is a Vite-ism that evaluates
 *    to undefined under Webpack — SafeLogger NEVER logged anything in the
 *    legacy build. Fixed in SafeLogger.js.
 *
 * 4. rateLimitInfo / validateContentType REMOVED.
 *    Both were initialized but never populated or called. Dead code removed.
 *
 * 5. onBeforeRequest() REMOVED.
 *    It was a thin wrapper around addRequestInterceptor() that discarded the
 *    return value, making it a footgun for anyone who relied on config mutations.
 *    Use addRequestInterceptor() directly — it is explicit and complete.
 */

import {ApiError} from './ApiError.js';
import {SafeLogger} from '../../utils/SafeLogger.js';

export class ApiClient {
    constructor(baseUrl, defaultHeaders = {}) {
        this.baseUrl = baseUrl;
        this.defaultHeaders = defaultHeaders;
        this.csrfToken = null;
        this.requestInterceptors = [];
        this.responseInterceptors = [];
    }

    // ─── CSRF ─────────────────────────────────────────────────────────────────

    setCsrfToken(token) {
        this.csrfToken = token;
    }

    #getCsrfTokenFromMeta() {
        if (typeof document === 'undefined') return null;
        const meta = document.querySelector('meta[name="csrf-token"]');
        return meta ? meta.getAttribute('content') : null;
    }

    // ─── Interceptor Registry ─────────────────────────────────────────────────

    /**
     * Registers a request interceptor.
     * Interceptors receive the full request config and must return it
     * (optionally mutated). They are run in registration order.
     *
     * @param {(config: Object) => Promise<Object>} interceptor
     */
    addRequestInterceptor(interceptor) {
        this.requestInterceptors.push(interceptor);
    }

    /**
     * Registers a response interceptor.
     * Interceptors receive (result, context) and must return result.
     *
     * @param {(result: Object, context: Object) => Promise<Object>} interceptor
     */
    addResponseInterceptor(interceptor) {
        this.responseInterceptors.push(interceptor);
    }

    // ─── Core Request ─────────────────────────────────────────────────────────

    async request(method, endpoint, options = {}) {
        const {body = null, headers = {}, timeout = 30000, retry = 0} = options;

        const url = this.#buildUrl(endpoint);
        const isJson = body && typeof body === 'object'
            && !(body instanceof FormData)
            && !(body instanceof Blob);

        const finalHeaders = {
            Accept: 'application/json',
            ...(isJson && {'Content-Type': 'application/json'}),
            // Note: do NOT put Content-Type in defaultHeaders — it overrides
            // the conditional set above and breaks multipart/FormData requests.
            ...this.defaultHeaders,
            ...headers,
        };

        const isMutatingMethod = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);
        if (isMutatingMethod) {
            const csrf = this.csrfToken || this.#getCsrfTokenFromMeta();
            if (csrf) finalHeaders['X-CSRF-Token'] = csrf;
        }

        const requestId = this.#generateRequestId();
        finalHeaders['X-Request-ID'] = requestId;

        // Attach url + endpoint so interceptors can inspect which endpoint
        // is being called (e.g., AuthService skips token refresh for /refresh-token).
        let requestConfig = {
            method,
            headers: finalHeaders,
            credentials: 'include',
            url,
            endpoint,
            ...(body && {body: isJson ? JSON.stringify(body) : body}),
        };

        for (const interceptor of this.requestInterceptors) {
            requestConfig = await interceptor(requestConfig) || requestConfig;
        }

        SafeLogger.log('info', 'API Request', {
            requestId,
            url,
            method: requestConfig.method,
            headers: requestConfig.headers,
            body: requestConfig.body,
        });

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeout);

            // Destructure our custom fields out so fetch() only receives
            // standard RequestInit properties (url/endpoint are not valid there).
            const {url: _u, endpoint: _ep, ...fetchConfig} = requestConfig;
            const response = await fetch(url, {...fetchConfig, signal: controller.signal});

            clearTimeout(timeoutId);

            let result = {
                status: response.status,
                ok: response.ok,
                headers: Object.fromEntries(response.headers.entries()),
                method,
                endpoint,
                url,
                options,
            };

            const contentType = response.headers.get('content-type');
            if (response.status !== 204 && contentType?.includes('application/json')) {
                result.data = await response.json().catch(() => ({}));
            }

            for (const interceptor of this.responseInterceptors) {
                const intercepted = await interceptor(result, {method, endpoint, url, options});
                if (intercepted) result = intercepted;
            }

            if (!result.ok) {
                // Pass 401 through on refresh-token so the response interceptor
                // can detect "session dead" without triggering an infinite loop.
                if (result.status === 401 && endpoint.includes('refresh-token')) {
                    return result;
                }
                throw new ApiError(
                    result.data?.message || `Request failed: ${result.status}`,
                    result.status,
                    result.data,
                    requestId,
                );
            }

            return result;

        } catch (error) {
            if (error instanceof ApiError) {
                SafeLogger.log('error', 'API Error', {
                    requestId, message: error.message, status: error.status,
                });
                throw error;
            }

            if (error.name === 'AbortError') {
                SafeLogger.log('error', 'Request Timeout', {requestId, timeout});
                throw new ApiError('Request timeout', 408, null, requestId);
            }

            if (retry > 0 && this.#isRetryable(error)) {
                const delayMs = Math.pow(2, 3 - retry) * 1000;
                SafeLogger.log('warn', 'Retrying request', {requestId, retry, delayMs});
                await new Promise(resolve => setTimeout(resolve, delayMs));
                return this.request(method, endpoint, {...options, retry: retry - 1});
            }

            SafeLogger.log('error', 'Network Error', {requestId, message: error.message});
            throw new ApiError(error.message || 'Network error', 0, error, requestId);
        }
    }

    // ─── Private Helpers ──────────────────────────────────────────────────────

    #buildUrl(endpoint) {
        return endpoint.startsWith('http') ? endpoint : this.baseUrl + endpoint;
    }

    #generateRequestId() {
        if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
        return Date.now().toString(36) + Math.random().toString(36).substring(2);
    }

    #isRetryable(error) {
        if (error.status >= 400 && error.status < 500) return false;
        return error.status === 0 || error.status >= 500;
    }

    // ─── HTTP Shortcuts ───────────────────────────────────────────────────────

    get(endpoint, options = {}) {
        return this.request('GET', endpoint, options);
    }

    post(endpoint, body = null, options = {}) {
        return this.request('POST', endpoint, {...options, body});
    }

    put(endpoint, body = null, options = {}) {
        return this.request('PUT', endpoint, {...options, body});
    }

    patch(endpoint, body = null, options = {}) {
        return this.request('PATCH', endpoint, {...options, body});
    }

    delete(endpoint, options = {}) {
        return this.request('DELETE', endpoint, options);
    }
}