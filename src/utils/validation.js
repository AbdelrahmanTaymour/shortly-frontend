/**
 * Validation Utilities - Pure validation functions
 *
 * RESPONSIBILITY: Provide validation logic
 *
 * ALLOWED:
 * ✅ Validate data
 * ✅ Return validation results
 * ✅ No side effects
 *
 * FORBIDDEN:
 * ❌ Know about forms
 * ❌ Know about storage
 */

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean}
 */
export function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email?.trim() || '');
}

/**
 * Validate URL format
 * @param {string} url - URL to validate
 * @returns {boolean}
 */
export function isValidUrl(url) {
    try {
        const urlObj = new URL(url);
        return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    } catch {
        return false;
    }
}

/**
 * Validate password strength
 * @param {string} password - Password to validate
 * @returns {Object} { isValid, score, feedback }
 */
export function isValidatePassword(password) {
    let score = 0;
    const feedback = [];

    if (!password) {
        return {isValid: false, score: 0, feedback: ['Password is required']};
    }

    if (password.length >= 8) {
        score++;
    } else {
        feedback.push('Password must be at least 8 characters');
    }

    if (/[A-Z]/.test(password)) {
        score++;
    } else {
        feedback.push('Add uppercase letters');
    }

    if (/[a-z]/.test(password)) {
        score++;
    } else {
        feedback.push('Add lowercase letters');
    }

    if (/[0-9]/.test(password)) {
        score++;
    } else {
        feedback.push('Add numbers');
    }

    if (/[^A-Za-z0-9]/.test(password)) {
        score++;
    } else {
        feedback.push('Add special characters');
    }

    return {
        isValid: score >= 3,
        score: Math.min(score, 4),
        feedback
    };
}

/**
 * Validate username
 * @param {string} username - Username to validate
 * @param {number} minLength - Minimum length (default: 3)
 * @returns {Object} { isValid, feedback }
 */
export function validateUsername(username, minLength = 3) {
    const feedback = [];

    if (!username) {
        return {isValid: false, feedback: ['Username is required']};
    }

    if (username.trim().length < minLength) {
        feedback.push(`Username must be at least ${minLength} characters`);
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
        feedback.push('Username can only contain letters, numbers, underscore, and dash');
    }

    return {
        isValid: feedback.length === 0,
        feedback
    };
}

/**
 * Validate custom URL alias
 * @param {string} alias - Alias to validate
 * @returns {Object} { isValid, feedback }
 */
export function validateAlias(alias) {
    const feedback = [];

    if (!alias) {
        return {isValid: false, feedback: ['Alias is required']};
    }

    if (alias.length < 2) {
        feedback.push('Alias must be at least 2 characters');
    }

    if (alias.length > 50) {
        feedback.push('Alias must be less than 50 characters');
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(alias)) {
        feedback.push('Alias can only contain letters, numbers, underscore, and dash');
    }

    return {
        isValid: feedback.length === 0,
        feedback
    };
}

/**
 * Validate date range
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {boolean}
 */
export function isValidDateRange(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    return start <= end;
}

/**
 * Validate required fields
 * @param {Object} data - Data object
 * @param {string[]} requiredFields - Required field names
 * @returns {Object} { isValid, missingFields }
 */
export function validateRequired(data, requiredFields) {
    const missingFields = requiredFields.filter(field => !data[field]);

    return {
        isValid: missingFields.length === 0,
        missingFields
    };
}
