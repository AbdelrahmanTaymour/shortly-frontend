/**
 * FloatingBulkActionsBar — Floating overlay bulk-operations toolbar.
 *
 * DROP-IN REPLACEMENT for BulkActionsBar.
 *
 * RESPONSIBILITY: Render a fixed, centered floating toolbar at the bottom of
 *   the viewport when Links are selected.  Communicate upward via the same
 *   DOM CustomEvents the old bar used so LinksPage requires no logic changes.
 *
 * ALLOWED:   DOM manipulation within own container · dispatch CustomEvents
 * FORBIDDEN: Service calls · store access · navigation · layout side-effects
 */

import './FloatingBulkActionsBar.css';
import BaseComponent from '../../../../base/BaseComponent.js';

export default class FloatingBulkActionsBar extends BaseComponent {

    /** @type {number} */
    #count = 0;

    /** @type {boolean} */
    #visible = false;

    /**
     * @param {HTMLElement} container — A bare <div> appended to document.body by the caller.
     * @param {Object}      props
     * @param {number}      [props.selectedCount=0]
     */
    constructor(container, props = {}) {
        super(container, props);
        this.#count = props.selectedCount ?? 0;
        this.#visible = false;                // Always start hidden
    }

    // ─── Render ───────────────────────────────────────────────────────────────

    render() {
        const count = this.#count;
        return /* html */`
            <div
                class="fbar-portal"
                role="toolbar"
                aria-label="Bulk link actions"
                aria-live="polite"
                aria-atomic="false"
            >
                <div class="fbar-inner">

                    <!-- Left: deselect + counter -->
                    <div class="fbar-left">
                        <button
                            class="fbar-deselect-btn"
                            id="fbDeselectBtn"
                            type="button"
                            title="Clear selection"
                            aria-label="Clear selection"
                        >
                            <i class="fa-solid fa-xmark" aria-hidden="true"></i>
                        </button>

                        <div class="fbar-count-wrap" aria-live="polite" aria-atomic="true">
                            <span class="fbar-count">${count}</span>
                            <span class="fbar-count-label">
                                link${count !== 1 ? 's' : ''} selected
                            </span>
                        </div>
                    </div>

                    <!-- Divider -->
                    <div class="fbar-divider" aria-hidden="true"></div>

                    <!-- Right: action buttons -->
                    <div class="fbar-actions">
                        <button
                            class="fbar-btn"
                            type="button"
                            data-action="setExpiration"
                            aria-label="Set expiration date for selected links"
                        >
                            <i class="fa-solid fa-calendar-days" aria-hidden="true"></i>
                            <span class="fbar-btn-label">Set Expiration</span>
                        </button>

                        <button
                            class="fbar-btn"
                            type="button"
                            data-action="activate"
                            aria-label="Activate selected links"
                        >
                            <i class="fa-solid fa-circle-check" aria-hidden="true"></i>
                            <span class="fbar-btn-label">Activate</span>
                        </button>

                        <button
                            class="fbar-btn"
                            type="button"
                            data-action="deactivate"
                            aria-label="Deactivate selected links"
                        >
                            <i class="fa-solid fa-circle-pause" aria-hidden="true"></i>
                            <span class="fbar-btn-label">Deactivate</span>
                        </button>

                        <div class="fbar-action-sep" aria-hidden="true"></div>

                        <button
                            class="fbar-btn fbar-btn--danger"
                            type="button"
                            data-action="delete"
                            aria-label="Delete selected links"
                        >
                            <i class="fa-solid fa-trash" aria-hidden="true"></i>
                            <span class="fbar-btn-label">Delete</span>
                        </button>
                    </div>

                </div>
            </div>
        `;
    }

    // ─── Lifecycle ────────────────────────────────────────────────────────────

    setupEventListeners() {
        // Deselect — mirrors BulkActionsBar: CustomEvent on this.container, bubbles
        const deselectBtn = this.querySelector('#fbDeselectBtn');
        this.attachListener(deselectBtn, 'click', () => {
            this.container.dispatchEvent(
                new CustomEvent('deselect', {detail: {}, bubbles: true})
            );
        });

        // Action buttons — mirrors BulkActionsBar: CustomEvent on this.container, bubbles
        this.querySelectorAll('[data-action]').forEach(btn => {
            this.attachListener(btn, 'click', () => {
                this.container.dispatchEvent(
                    new CustomEvent('bulkAction', {
                        detail: {action: btn.dataset.action},
                        bubbles: true,
                    })
                );
            });
        });
    }

    /**
     * Override destroy() to remove the portal element from document.body.
     * super.destroy() unmounts (removes DOM content) and nulls this.container,
     * so we capture the reference first, then remove.
     */
    async destroy() {
        const portalEl = this.container;
        await super.destroy();      // unmount + clear listeners + null this.container
        portalEl?.remove();         // pull the portal div out of <body>
    }

    // ─── Public API — same surface as BulkActionsBar ──────────────────────────

    /**
     * Animate the bar into view.
     * Idempotent — safe to call multiple times.
     */
    show() {
        if (this.#visible) return;
        this.#visible = true;
        this.querySelector('.fbar-portal')?.classList.add('fbar--visible');
    }

    /**
     * Animate the bar out of view.
     * Idempotent — safe to call multiple times.
     */
    hide() {
        if (!this.#visible) return;
        this.#visible = false;
        this.querySelector('.fbar-portal')?.classList.remove('fbar--visible');
    }

    /**
     * Update the visible selection counter without re-rendering the whole bar.
     * @param {number} count
     */
    updateSelectionCount(count) {
        this.#count = count;

        const countEl = this.querySelector('.fbar-count');
        const labelEl = this.querySelector('.fbar-count-label');
        const wrapEl = this.querySelector('.fbar-count-wrap');

        if (countEl) countEl.textContent = count;
        if (labelEl) labelEl.textContent = `link${count !== 1 ? 's' : ''} selected`;

        // Pulse the count wrap so the user sees the number change
        if (wrapEl) {
            wrapEl.classList.remove('fbar-count--pulse');
            // Force reflow to restart the animation
            void wrapEl.offsetWidth;
            wrapEl.classList.add('fbar-count--pulse');
        }
    }
}