/**
 * LinksList — Renders a list of LinkCard ProfileHeaderCard and orchestrates card interactions.
 *
 * ─── FIXES ───────────────────────────────────────────────────────────────────
 *
 * 1. Import path for LinkCard fixed.
 *    Legacy: `'../../../../../_legacy/src/ui/ProfileHeaderCard/shared/LinkCard.js'`
 *    Fixed:  `'../LinkCard/LinkCard.js'` (sibling in features/Links/ProfileHeaderCard/)
 *
 * 2. emit() → this.container.dispatchEvent() for 'action' and 'selectionChange'.
 *    LinksPage listens via attachListener(linksList.container, 'action', ...).
 *    BaseComponent.emit() dispatches to object-level .on() callbacks, not DOM.
 *
 * 3. addCleanupTask() already correctly used for document event listeners ✓
 *    No change needed — kept as-is.
 *
 * 4. isMounted getter works correctly after BaseComponent refactor ✓
 *    updateLinks() calls if (this.isMounted) which now reads the private #mounted
 *    field via the getter — works as expected.
 */

import BaseComponent from '../../../base/BaseComponent.js';
import {LinkCard} from './LinkCard/LinkCard.js';

const EVT_CLOSE_FILTER = 'Links:closeFilterPopover';
const EVT_CLOSE_DROPDOWNS = 'Links:closeDropdowns';

export default class LinksList extends BaseComponent {
    constructor(container, props = {}) {
        super(container, props);
        this.links = props.links || [];
        this.selectedLinks = props.selectedLinks instanceof Set
            ? props.selectedLinks
            : new Set();
    }

    render() {
        if (!this.links || this.links.length === 0) return '';

        return `
            <div class="links-list">
                ${this.links.map(link =>
            LinkCard(link, this.selectedLinks.has(String(link.id)))
        ).join('')}
            </div>
        `;
    }

    setupEventListeners() {
        // ── Checkboxes ────────────────────────────────────────────────────────
        this.querySelectorAll('[data-action="select"]').forEach(checkbox => {
            this.attachListener(checkbox, 'click', (e) => {
                e.stopPropagation();
                this.#handleCheckboxChange(checkbox);
            });
            this.attachListener(checkbox, 'keydown', (e) => {
                if (e.key === ' ' || e.key === 'Enter') {
                    e.preventDefault();
                    this.#handleCheckboxChange(checkbox);
                }
            });
        });

        // ── Dropdown toggles ──────────────────────────────────────────────────
        this.querySelectorAll('[data-action="toggle-dropdown"]').forEach(btn => {
            this.attachListener(btn, 'click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.#handleToggleDropdown(btn);
            });
        });

        // ── Short URL copy (inline click on the short-URL display) ────────────
        this.querySelectorAll('[data-action="copy-url"]').forEach(el => {
            this.attachListener(el, 'click', (e) => {
                e.stopPropagation();
                this.#dispatchAction('copy', el.dataset.id, el.dataset.url);
            });
        });

        // ── All other action buttons ──────────────────────────────────────────
        this.querySelectorAll('[data-action]').forEach(btn => {
            const action = btn.dataset.action;
            if (['select', 'toggle-dropdown', 'copy-url'].includes(action)) return;

            this.attachListener(btn, 'click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.#closeAllDropdowns();
                this.#dispatchAction(action, btn.dataset.id, btn.dataset.url);
            });
        });

        // ── Close dropdowns when clicking outside the list ────────────────────
        const outsideClick = (e) => {
            if (!this.container?.contains(e.target)) this.#closeAllDropdowns();
        };
        document.addEventListener('click', outsideClick);
        this.addCleanupTask(() => document.removeEventListener('click', outsideClick));

        // ── Close dropdowns when FiltersBar popover opens ─────────────────────
        const closeDropdownsHandler = () => this.#closeAllDropdowns();
        document.addEventListener(EVT_CLOSE_DROPDOWNS, closeDropdownsHandler);
        this.addCleanupTask(() => document.removeEventListener(EVT_CLOSE_DROPDOWNS, closeDropdownsHandler));
    }

    // ─── Private helpers ──────────────────────────────────────────────────────

    #handleCheckboxChange(checkbox) {
        const linkId = String(checkbox.dataset.id);
        const wasChecked = checkbox.getAttribute('aria-checked') === 'true';
        const newState = !wasChecked;

        checkbox.setAttribute('aria-checked', String(newState));
        checkbox.classList.toggle('checked', newState);

        const card = checkbox.closest('.link-card');
        card?.classList.toggle('selected', newState);

        if (newState) this.selectedLinks.add(linkId);
        else this.selectedLinks.delete(linkId);

        this.#emitSelectionChange();
    }

    #handleToggleDropdown(btn) {
        const menu = btn.closest('.link-dropdown')?.querySelector('.link-dropdown-menu');
        if (!menu) return;

        const isOpen = menu.classList.contains('open');
        this.#closeAllDropdowns();

        if (!isOpen) {
            // Tell FiltersBar to close its popover
            document.dispatchEvent(new CustomEvent(EVT_CLOSE_FILTER));

            menu.classList.add('open');
            btn.setAttribute('aria-expanded', 'true');
            menu.style.zIndex = '200';

            // Smart positioning after paint
            requestAnimationFrame(() => {
                const btnRect = btn.getBoundingClientRect();
                const menuRect = menu.getBoundingClientRect();
                const spaceBelow = window.innerHeight - btnRect.bottom;

                if (spaceBelow < menuRect.height + 12) menu.classList.add('drop-up');
                if (menuRect.right > window.innerWidth - 8) {
                    menu.style.right = '0';
                    menu.style.left = 'auto';
                }
                if (menuRect.left < 8) {
                    menu.style.right = 'auto';
                    menu.style.left = '0';
                }
            });
        }
    }

    #closeAllDropdowns() {
        this.querySelectorAll('.link-dropdown-menu.open').forEach(menu => {
            menu.classList.remove('open', 'drop-up');
            menu.style.zIndex = '';
            menu.style.left = '';
            menu.style.right = '';
        });
        this.querySelectorAll("[data-action='toggle-dropdown']").forEach(btn => {
            btn.setAttribute('aria-expanded', 'false');
        });
    }

    /**
     * Dispatch a bubbling DOM CustomEvent for a card action.
     * LinksPage wires: attachListener(linksList.container, 'action', handler)
     */
    #dispatchAction(action, linkId, shortCode) {
        this.container.dispatchEvent(
            new CustomEvent('action', {
                detail: {action, linkId, shortCode},
                bubbles: true,
            })
        );
    }

    /**
     * Dispatch a bubbling DOM CustomEvent for selection changes.
     * LinksPage wires: attachListener(linksList.container, 'selectionChange', handler)
     */
    #emitSelectionChange() {
        this.container.dispatchEvent(
            new CustomEvent('selectionChange', {
                detail: {selectedLinks: Array.from(this.selectedLinks)},
                bubbles: true,
            })
        );
    }

    // ─── Public API ───────────────────────────────────────────────────────────

    clearSelection() {
        this.selectedLinks.clear();
        this.querySelectorAll('[data-action="select"]').forEach(cb => {
            cb.setAttribute('aria-checked', 'false');
            cb.classList.remove('checked');
        });
        this.querySelectorAll('.link-card.selected').forEach(card => {
            card.classList.remove('selected');
        });
        this.#emitSelectionChange();
    }

    getSelectedLinks() {
        return Array.from(this.selectedLinks);
    }

    async updateLinks(newLinks) {
        this.links = newLinks;
        this.selectedLinks.clear();
        // isMounted is now a getter on BaseComponent — works correctly
        if (this.isMounted) {
            await this.unmount();
            await this.mount();
        }
    }
}