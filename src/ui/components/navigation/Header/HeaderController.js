/**
 * HeaderController — Header Authentication UI Controller
 *
 * RESPONSIBILITY: Own the #user-profile-slot DOM slice and keep it in sync
 *   with the current authentication state by listening to EventBus events.
 *
 * ALLOWED:
 *   ✅ Read auth state from AuthService
 *   ✅ Mount/unmount the UserDropdown component
 *   ✅ Subscribe to EventBus auth and navigation events
 *   ✅ Manipulate only the #user-profile-slot DOM node
 *
 * FORBIDDEN:
 *   ❌ Business logic (token refresh, login, logout operations)
 *   ❌ Direct API calls
 *   ❌ Navigation
 *   ❌ Accessing DOM nodes outside #user-profile-slot
 *   ❌ Knowing about other UI controllers or pages
 *
 * DEPENDS ON:
 *   - AuthService (read-only: isAuthenticated, currentUser)
 *   - EventBus (subscribe to USER_UPDATED, NAVIGATION_COMPLETED, USER_LOGGED_OUT)
 *   - UserDropdown (child component it mounts/unmounts)
 */

import './Header.css';
import UserDropdown from '../UserDropdown/UserDropdown.js';

export default class HeaderController {
    /**
     * @param {AuthService} authService
     * @param {EventBus}    eventBus
     */
    constructor(authService, eventBus) {
        this.authService = authService;
        this.eventBus = eventBus;
        this._unsubscribe = [];
    }

    /**
     * Attaches EventBus listeners. Called once from main.js after app.init().
     * Idempotent — safe to call more than once (won't duplicate listeners
     * because each call to eventBus.on() returns its own unsubscribed fn).
     */
    initialize() {
        // Re-render the slot after every navigation so the correct
        // state is always reflected regardless of page transitions.
        this._unsubscribe.push(
            this.eventBus.on(this.eventBus.EVENTS.NAVIGATION_COMPLETED, () => {
                requestAnimationFrame(() => this._render());
            })
        );

        // Re-render when user data changes (e.g., profile update, login).
        this._unsubscribe.push(
            this.eventBus.on(this.eventBus.EVENTS.USER_UPDATED, () => this._render())
        );

        // Immediately clear the slot on logout without waiting for navigation.
        this._unsubscribe.push(
            this.eventBus.on(this.eventBus.EVENTS.USER_LOGGED_OUT, () => this._clear())
        );
    }

    /**
     * Removes all EventBus subscriptions and clears the DOM slot.
     * Call this if the controller needs to be torn down (e.g., testing).
     */
    destroy() {
        this._unsubscribe.forEach(fn => fn());
        this._unsubscribe = [];
        this._clear();
    }

    // ─── Private ──────────────────────────────────────────────────────────────

    /**
     * Decides what to render in the header slot based on auth state.
     * @private
     */
    async _render() {
        const slot = document.getElementById('user-profile-slot');
        const authButtons = document.querySelector('.auth-buttons');

        if (!slot) return;

        if (this.authService.isAuthenticated && this.authService.currentUser) {
            // Hide the static auth buttons (Login / Sign Up links in landing nav)
            if (authButtons) authButtons.style.display = 'none';

            // Guard: skip if the dropdown is already mounted for this session
            if (slot.dataset.mounted === 'true') return;

            slot.innerHTML = '';
            const userDropdown = new UserDropdown(slot, {
                user: this.authService.currentUser,
                authService: this.authService,
            });
            await userDropdown.mount();
            slot.dataset.mounted = 'true';

        } else {
            this._clear();
        }
    }

    /**
     * Resets the header slot to its empty state.
     * @private
     */
    _clear() {
        const slot = document.getElementById('user-profile-slot');
        if (!slot) return;

        slot.innerHTML = '';
        delete slot.dataset.mounted;
    }
}

