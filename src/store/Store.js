/**
 * Store — Lightweight observable state container.
 *
 * NEW FILE — replaces implicit per-service state scattered across
 * AuthService.isAuthenticated, AuthService.currentUser, etc.
 *
 * PATTERN:
 *   Services WRITE via dispatch().
 *   Components READ via getState() or react via subscribe().
 *   No component ever calls dispatch() directly — only services do.
 *
 * IMMUTABILITY:
 *   getState() returns structuredClone() so callers cannot accidentally
 *   mutate the stored state by modifying the returned object.
 *
 * CLEANUP:
 *   subscribe() returns an unsubscribe function. Always call it in unmount().
 *   Failure to do so is the primary cause of memory leaks in this architecture.
 *
 * EXAMPLE:
 *   // Service writing:
 *   store.dispatch('Auth', prev => ({ ...prev, isAuthenticated: true, currentUser: user }));
 *
 *   // Component reading once:
 *   const { currentUser } = store.getState('Auth');
 *
 *   // Component subscribing to changes:
 *   const unsubscribe = store.subscribe('Auth', (next, prev) => {
 *     this.render(next.currentUser);
 *   });
 *   // In unmount():
 *   unsubscribe();
 */
export class Store {
    #state = {};
    #subscribers = new Map();

    /**
     * Initialize a slice with its starting state.
     * Should be called once per slice from store/index.js at boot.
     *
     * @param {string} sliceName
     * @param {Object} initialState
     */
    initSlice(sliceName, initialState) {
        this.#state[sliceName] = initialState;
    }

    /**
     * Update a slice's state and notify all subscribers.
     *
     * @param {string}   sliceName
     * @param {Function} updater   - (prevState) => nextState  (pure function)
     */
    dispatch(sliceName, updater) {
        const prev = this.#state[sliceName];
        this.#state[sliceName] = updater(prev);
        this.#notify(sliceName, this.#state[sliceName], prev);
    }

    /**
     * Subscribe to state changes on a slice.
     * The callback is fired synchronously after every dispatch() to this slice.
     *
     * @param {string}   sliceName
     * @param {Function} callback  - (nextState, prevState) => void
     * @returns {Function}         - Call to unsubscribe (do this in unmount())
     */
    subscribe(sliceName, callback) {
        if (!this.#subscribers.has(sliceName)) {
            this.#subscribers.set(sliceName, new Set());
        }
        this.#subscribers.get(sliceName).add(callback);
        return () => this.#subscribers.get(sliceName).delete(callback);
    }

    /**
     * Read the current state of a slice.
     * Returns a deep clone — mutations on the return value are safe and harmless.
     *
     * @param {string} sliceName
     * @returns {Object}
     */
    getState(sliceName) {
        if (!(sliceName in this.#state)) {
            throw new Error(`Store: Slice "${sliceName}" has not been initialized. Call initSlice() first.`);
        }
        return structuredClone(this.#state[sliceName]);
    }

    // ─── Private ──────────────────────────────────────────────────────────────

    #notify(sliceName, next, prev) {
        this.#subscribers.get(sliceName)?.forEach(cb => {
            try {
                cb(next, prev);
            } catch (error) {
                console.error(`Store: Subscriber error on slice "${sliceName}":`, error);
            }
        });
    }
}