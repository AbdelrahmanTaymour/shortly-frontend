/**
 * SafeLogger — Development-only logger that redacts sensitive fields.
 *
 * Extracted from ApiClient.js into its own utility so it can be used
 * by any infrastructure layer (not just the HTTP client).
 *
 * Uses process.env.NODE_ENV (Webpack) instead of import.meta.env.MODE (Vite).
 * The original code used import.meta.env.MODE which is a Vite-ism — in a
 * Webpack project it always evaluates to undefined, meaning SafeLogger
 * silently never logged anything in the legacy codebase.
 *
 * NEW FILE — was previously defined inline inside ApiClient.js.
 */
export class SafeLogger {
    static #SENSITIVE_KEYS = [
        'authorization', 'password', 'token', 'secret', 'apikey', 'x-csrf-token',
    ];

    static #isDev() {
        // process.env.NODE_ENV is set by Webpack's DefinePlugin.
        // import.meta.env.MODE is a Vite-ism that resolves to undefined in Webpack.
        return process.env.NODE_ENV === 'development';
    }

    static #redactHeaders(headers) {
        if (!headers || typeof headers !== 'object') return headers;
        const redacted = {};
        for (const [key, value] of Object.entries(headers)) {
            redacted[key] = this.#SENSITIVE_KEYS.some(sk => key.toLowerCase().includes(sk))
                ? '***REDACTED***'
                : value;
        }
        return redacted;
    }

    static #redactBody(body) {
        if (typeof body !== 'string') return '[Non-string body]';
        try {
            const parsed = JSON.parse(body);
            const redacted = {...parsed};
            this.#SENSITIVE_KEYS.forEach(k => {
                if (k in redacted) redacted[k] = '***REDACTED***';
            });
            return redacted;
        } catch {
            return '[Binary or non-JSON data]';
        }
    }

    /**
     * @param {'info'|'warn'|'error'} level
     * @param {string} message
     * @param {Object} data
     */
    static log(level, message, data = {}) {
        if (!this.#isDev()) return;
        console[level](`[Shortly] ${message}`, {
            ...data,
            ...(data.headers && {headers: this.#redactHeaders(data.headers)}),
            ...(data.body && {body: this.#redactBody(data.body)}),
        });
    }
}