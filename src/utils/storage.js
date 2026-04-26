/**
 * Storage Utilities - Wrapper around localStorage/sessionStorage
 *
 * RESPONSIBILITY: Provide type-safe storage access
 *
 * ALLOWED:
 * ✅ Read/write to storage
 * ✅ Serialize/deserialize data
 * ✅ Handle storage errors
 * ✅ Provide type safety
 *
 * FORBIDDEN:
 * ❌ Know about application state
 * ❌ Know about services
 */

class StorageManager {
    constructor(storageType = 'local') {
        this.storage = storageType === 'local' ? localStorage : sessionStorage;
    }

    /**
     * Set a value in storage
     * @param {string} key - Storage key
     * @param {*} value - Value to store (will be serialized if object)
     */
    set(key, value) {
        try {
            const serialized = typeof value === 'string' ? value : JSON.stringify(value);
            this.storage.setItem(key, serialized);
        } catch (error) {
            console.error(`Error setting storage key "${key}":`, error);
        }
    }

    /**
     * Get a value from storage
     * @param {string} key - Storage key
     * @param {boolean} parse - Whether to parse JSON (default: true)
     * @returns {*} Stored value or null
     */
    get(key, parse = true) {
        try {
            const value = this.storage.getItem(key);
            if (!value) return null;
            return parse ? JSON.parse(value) : value;
        } catch (error) {
            console.error(`Error getting storage key "${key}":`, error);
            return null;
        }
    }

    /**
     * Remove a value from storage
     * @param {string} key - Storage key
     */
    remove(key) {
        try {
            this.storage.removeItem(key);
        } catch (error) {
            console.error(`Error removing storage key "${key}":`, error);
        }
    }

    /**
     * Clear all storage
     */
    clear() {
        try {
            this.storage.clear();
        } catch (error) {
            console.error('Error clearing storage:', error);
        }
    }

    /**
     * Check if a key exists
     * @param {string} key - Storage key
     * @returns {boolean}
     */
    has(key) {
        return this.storage.getItem(key) !== null;
    }

    /**
     * Get all keys
     * @returns {string[]}
     */
    keys() {
        return Object.keys(this.storage);
    }
}

// Create singleton instances
const localStorageManager = new StorageManager('local');
const sessionStorageManager = new StorageManager('session');

export {localStorageManager, sessionStorageManager, StorageManager};
