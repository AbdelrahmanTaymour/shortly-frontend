/**
 * Formatting Utilities - Data formatting helpers
 *
 * RESPONSIBILITY: Format data for display purposes or secure URL building
 *
 * ALLOWED:
 * ✅ Format strings, dates, numbers
 * ✅ Transform data for display
 * ✅ Localize values
 *
 * FORBIDDEN:
 * ❌ Know about business logic
 * ❌ Know about storage
 */

/**
 * Format date to readable string
 * @param {Date|string} date - Date to format
 * @param {string} format - Format template (e.g., 'MM/DD/YYYY')
 * @returns {string}
 */
export function formatDate(date, format = 'MM/DD/YYYY') {
    if (!date) return '';

    const d = new Date(date);
    if (isNaN(d.getTime())) return '';

    const pad = (n) => String(n).padStart(2, '0');

    const replacements = {
        'YYYY': d.getFullYear(),
        'MM': pad(d.getMonth() + 1),
        'DD': pad(d.getDate()),
        'HH': pad(d.getHours()),
        'mm': pad(d.getMinutes()),
        'ss': pad(d.getSeconds())
    };

    let result = format;
    Object.entries(replacements).forEach(([key, value]) => {
        result = result.replace(key, value);
    });

    return result;
}

/**
 * Formats a duration string into a human-readable format.
 * Converts a duration given in the format `[days.]hours:minutes:seconds[.fractions]`
 * into a readable format using days (d), hours (h), minutes (m), and seconds (s).
 *
 * @param {string} timeStr The input duration string to format. If the value is `null`, `undefined`,
 *        or an invalid format, it will return the original string or a default fallback.
 * @return {string} Returns the formatted duration in a human-readable format or the original/fallback string if invalid.
 */
export function formatDuration(timeStr) {
    if (!timeStr || timeStr === '--') return '--';

    // Regex to extract [days.]hours:minutes:seconds[.fractions]
    const match = String(timeStr).match(/^(?:(\d+)\.)?(\d{1,2}):(\d{2}):(\d{2})(?:\.(\d+))?$/);

    if (!match) return timeStr; // Fallback if it's already formatted

    const d = parseInt(match[1] || 0);
    const h = parseInt(match[2] || 0);
    const m = parseInt(match[3] || 0);
    const s = parseInt(match[4] || 0);

    const parts = [];
    if (d > 0) parts.push(`${d}d`);
    if (h > 0) parts.push(`${h}h`);
    if (m > 0) parts.push(`${m}m`);
    // Only show seconds if the duration is short (under a day)
    if (s > 0 && d === 0) parts.push(`${s}s`);

    return parts.length > 0 ? parts.join(' ') : '0s';
}

/**
 * Format date as relative time (e.g., "2 hours ago, Just Now, etc.")
 * @param {Date|string} date - Date to format
 * @returns {string}
 */
export function formatRelativeTime(date) {
    if (!date) return '';

    // If the date is a string and doesn't have timezone info (Z or +), 
    // we assume it's UTC from the backend and append 'Z'
    let dateValue = date;
    if (typeof date === 'string' && !date.includes('Z') && !date.includes('+')) {
        dateValue = date.endsWith(' ') ? date.trim() + 'Z' : date + 'Z';
    }

    const d = new Date(dateValue);
    if (isNaN(d.getTime())) return '';

    const now = new Date();
    const seconds = Math.floor((now - d) / 1000);

    if (seconds < 30) return 'just now';

    const intervals = [
        {label: 'year', seconds: 31536000},
        {label: 'month', seconds: 2592000},
        {label: 'week', seconds: 604800},
        {label: 'day', seconds: 86400},
        {label: 'hour', seconds: 3600},
        {label: 'minute', seconds: 60}
    ];

    for (const interval of intervals) {
        const count = Math.floor(seconds / interval.seconds);
        if (count >= 1) return `${count} ${interval.label}${count > 1 ? 's' : ''} ago`;
    }

    return 'just now';
}

/**
 * Formats ISO string for input type="datetime-local".
 * Requirement: YYYY-MM-DDTHH:mm
 * @param {string} isoString
 * @returns {string} - YYYY-MM-DDTHH:mm
 */
export function formatForDateTimeLocal(isoString) {
    if (!isoString) return '';

    const date = new Date(isoString);

    // Check for invalid date
    if (isNaN(date.getTime())) return '';

    // Adjust for the local timezone offset
    // datetime-local expects local time, but Date objects are often UTC
    const offset = date.getTimezoneOffset() * 60000; // in ms
    const localISOTime = new Date(date.getTime() - offset)
        .toISOString()
        .slice(0, 16); // Extract "YYYY-MM-DDTHH:mm"

    return localISOTime;
}


/**
 * Format number with thousands separator
 * @param {number} num - Number to format
 * @param {number} decimals - Decimal places
 * @returns {string}
 */
export function formatNumber(num, decimals = 0) {
    if (num === null || num === undefined) return '0';
    const val = Number(num);
    if (isNaN(val)) return '0';

    if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}M`;
    if (val >= 1_000) return `${(val / 1_000).toFixed(1)}K`;

    // For small decimals (like 0.04), show up to 2 decimal places
    return val % 1 === 0 ? val.toLocaleString() : val.toFixed(2);
}

/**
 * Format number as currency
 * @param {number} amount - Amount to format
 * @param {string} currency - Currency code (e.g., 'USD')
 * @returns {string}
 */
export function formatCurrency(amount, currency = 'USD') {
    if (typeof amount !== 'number') return '';
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency
    }).format(amount);
}

/**
 * Format bytes as human-readable string
 * @param {number} bytes - Number of bytes
 * @param {number} decimals - Decimal places
 * @returns {string}
 */
export function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)) + ' ' + sizes[i];
}

/**
 * Truncate string with ellipsis
 * @param {string} str - String to truncate
 * @param {number} maxLength - Max length
 * @param {string} suffix - Suffix (default: '...')
 * @returns {string}
 */
export function truncate(str, maxLength, suffix = '...') {
    if (!str || str.length <= maxLength) return str;
    return str.substring(0, maxLength - suffix.length) + suffix;
}

/**
 * Truncate URL for display
 * @param {string} url - URL to truncate
 * @param {number} maxLength - Max length
 * @returns {string}
 */
export function truncateUrl(url, maxLength = 50) {
    if (!url || url.length <= maxLength) return url;

    // Try to remove protocol
    let display = url.replace(/^https?:\/\//, '');
    if (display.length <= maxLength) return display;

    // Truncate with ellipsis in middle
    const start = display.substring(0, Math.floor(maxLength / 2));
    const end = display.substring(display.length - Math.floor(maxLength / 2));
    return start + '...' + end;
}

/**
 * Convert string to URL slug
 * @param {string} str - String to slugify
 * @returns {string}
 */
export function slugify(str) {
    return str
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');
}

/**
 * Capitalize first letter
 * @param {string} str - String to capitalize
 * @returns {string}
 */
export function capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Convert to title case
 * @param {string} str - String to convert
 * @returns {string}
 */
export function titleCase(str) {
    if (!str) return '';
    return str.split(' ').map(capitalize).join(' ');
}

/**
 * Used to allow empty strings but handle undefined
 * @param {string} str
 * @returns {string|null}
 */
export function cleanString(str) {
    return str?.trim() ?? null;
}

/**
 * Format percentage
 * @param {number} value - Value to format
 * @param {number} decimals - Decimal places
 * @returns {string}
 */
export function formatPercentage(value, decimals = 1) {
    if (value === null || value === undefined) return '0%';
    return `${Number(value).toFixed(1)}%`;
}

/**
 * Format duration in seconds
 * @param {number} seconds - Duration in seconds
 * @returns {string}
 */
export function formatDurationInSeconds(seconds) {
    if (typeof seconds !== 'number' || seconds < 0) return '';

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    const parts = [];
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (secs > 0) parts.push(`${secs}s`);

    return parts.length > 0 ? parts.join(' ') : '0s';
}


/**
 * Secure URL builder with validation
 * @param {string} endpoint - API endpoint template
 * @param {Object} params - Path parameters
 * @param {Object} queryParams - Query parameters
 * @returns {string} Completed endpoint URL
 */
export function buildEndpointUrl(endpoint, params = {}, queryParams = {}) {
    let url = endpoint;

    Object.keys(params).forEach(key => {
        const value = _sanitizeParam(params[key]);
        url = url.replace(`{${key}}`, encodeURIComponent(value));
    });

    // Handle query parameters securely
    if (Object.keys(queryParams).length > 0) {
        const query = new URLSearchParams();
        Object.keys(queryParams).forEach(key => {
            if (queryParams[key] !== null && queryParams[key] !== undefined) {
                query.append(key, queryParams[key]);
            }
        });
        url += `?${query.toString()}`;
    }

    return url;
}


// ----------------------
// Helper Functions
// ----------------------

/**
 * Sanitize path parameters to prevent injection
 */
function _sanitizeParam(value) {
    if (typeof value !== 'string' && typeof value !== 'number') {
        throw new Error('Invalid parameter type');
    }

    const str = String(value);

    if (str.includes('..') || str.includes('/') || str.includes('\\')) {
        throw new Error('Invalid characters in parameter');
    }

    return str;
}