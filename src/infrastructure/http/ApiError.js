/**
 * ApiError — Structured error for all HTTP failures.
 *
 * Extracted from ApiClient so it can be imported independently by
 * services and tests without pulling in the full HTTP client.
 *
 * NEW FILE — was previously defined inline inside ApiClient.js.
 */
export class ApiError extends Error {
    /**
     * @param {string} message   - Human-readable error description
     * @param {number} status    - HTTP status code (0 for network/timeout errors)
     * @param {*}      data      - Raw response body or original Error object
     * @param {string} requestId - The X-Request-ID that was sent with the request
     */
    constructor(message, status = 0, data = null, requestId = null) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.data = data;
        this.requestId = requestId;
    }

    /** True for client errors where retrying without changes is pointless. */
    get isClientError() {
        return this.status >= 400 && this.status < 500;
    }

    /** True for server-side failures that may resolve on retry. */
    get isServerError() {
        return this.status >= 500;
    }

    /** True for authentication failures. */
    get isUnauthorized() {
        return this.status === 401;
    }

    /** True for network errors and timeouts (status 0 or 408). */
    get isNetworkError() {
        return this.status === 0 || this.status === 408;
    }
}