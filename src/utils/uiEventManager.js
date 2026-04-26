/**
 * UIEventManager - Centralized event delegation for UI interactions
 * Prevents multiple listeners and ensures consistent event handling
 */

class UIEventManager {
    constructor() {
        this.initialized = false;
        this.globalClickHandler = null;
    }

    /**
     * Initialize global event handlers (called once on app startup)
     * @param {Router} router - Router instance for navigation
     */
    initialize(router) {
        if (this.initialized) return;

        this.globalClickHandler = this._createGlobalClickHandler(router);
        document.addEventListener('click', this.globalClickHandler, true); // capture phase for priority
        this.initialized = true;
    }

    /**
     * Create a single global click handler with event delegation
     * Handles:
     * - SPA navigation (a[data-link])
     * - Dropdown toggles
     * - Any other UI interactions
     * @private
     */
    _createGlobalClickHandler(router) {
        return (e) => {
            const target = e.target;

            // SPA navigation
            const navLink = target.closest('a[data-link]');
            if (navLink) {
                e.preventDefault();
                const href = navLink.getAttribute('href');
                if (href) router.navigate(href);
                return;
            }

            // Dropdown toggle
            const dropdownToggle = target.closest('[data-dropdown-toggle]');
            if (dropdownToggle) {
                e.stopPropagation();
                const dropdownId = dropdownToggle.getAttribute('data-dropdown-toggle');
                const dropdown = document.getElementById(dropdownId);
                if (dropdown) {
                    const isVisible = dropdown.style.display === 'block';
                    dropdown.style.display = isVisible ? 'none' : 'block';
                }
                return;
            }

            // Close dropdowns on outside click
            const openDropdowns = document.querySelectorAll('[id$="Dropdown"][style*="display: block"]');
            const isClickInsideDropdown = target.closest('[id$="Dropdown"]');
            const isClickOnToggle = target.closest('[data-dropdown-toggle]');

            if (!isClickInsideDropdown && !isClickOnToggle) {
                openDropdowns.forEach(dropdown => {
                    dropdown.style.display = 'none';
                });
            }
        };
    }

    /**
     * Cleanup when app tears down
     */
    destroy() {
        if (this.globalClickHandler) {
            document.removeEventListener('click', this.globalClickHandler, true);
        }
        this.initialized = false;
    }
}

// Export singleton instance
export default new UIEventManager();
