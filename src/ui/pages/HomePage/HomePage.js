/**
 * HomePage — Dashboard Home page controller.
 */

import BasePage from '../BasePage.js';
import UserOverviewCards from '../../features/Analytics/UserOverviewCards/UserOverviewCards.js';
import {RecentLinkCard} from '../../features/Links/components/RecentLinkCard.js';
import CreateLinkModal from '../../features/Links/modals/CreateLinkModal.js';
import EditLinkModal from '../../features/Links/modals/EditLinkModal.js';
import ConfirmModal from '../../features/Links/modals/ConfirmModal/ConfirmModal.js';
import LinkEmptyState from "../../features/Links/components/LinkEmptyState/LinkEmptyState";

export default class HomePage extends BasePage {

    // ─── Private page-scoped data ─────────────────────────────────────────────
    /** @type {Object|null} — From analyticsService.getMyOverview({}) */
    #stats = null;
    /** @type {Object[]} — 5 most recent Links from linksService.loadLinks() */
    #recentLinks = [];

    // ─── Component refs ───────────────────────────────────────────────────────
    /** @type {UserOverviewCards|null} — Registered; auto-destroyed by super.unmount() */
    #statsCards = null;
    #emptyState = null;

    // ─── Modal refs — transient; NOT registered; managed manually ────────────
    #createModal = null;
    #editModal = null;
    #confirmModal = null;

    // ═══════════════════════════════════════════════════════════════
    // LIFECYCLE
    // ═══════════════════════════════════════════════════════════════

    async mount() {
        // super.mount() MUST be first — sets isPageMounted = true.
        await super.mount();

        try {
            // 1. Subscribe to Auth store for a reactive welcome title.
            //    Fires immediately with the current user (no flicker).
            this.trackStoreSubscription(
                this.store.subscribe('auth', ({currentUser}) => {
                    this.#updateWelcomeTitle(currentUser);
                })
            );

            // Initial render from the current store state
            const {currentUser} = this.store.getState('auth');
            this.#updateWelcomeTitle(currentUser);
            this.#updateDate();

            // 2. Wire modal containers ONCE — prevents duplicate-submission bug.
            this.#wireModalContainerEvents();

            // 3. Wire page button interactions via event delegation.
            this.#wirePageButtons();

            // 4. Load data in parallel (graceful degradation on partial failure).
            await this.#loadDashboardData();

            // 5. Mount child ProfileHeaderCard for dynamic sections.
            await this.#mountEmptyState();
            await this.#mountStatsCards();
            this.#renderRecentLinks();

            // 6. Subscribe to link lifecycle events for auto-refresh.
            this.trackBusListener(
                this.eventBus.on(this.eventBus.EVENTS.LINK_CREATED, () => this.#refreshRecentLinks())
            );
            this.trackBusListener(
                this.eventBus.on(this.eventBus.EVENTS.LINK_UPDATED, () => this.#refreshRecentLinks())
            );
            this.trackBusListener(
                this.eventBus.on(this.eventBus.EVENTS.LINK_DELETED, () => this.#refreshRecentLinks())
            );

            this.highlightActiveNavItem('/Home');

        } catch (error) {
            console.error('[HomePage] mount error:', error);
            this.renderError(error.message);
        }
    }

    async unmount() {
        this.#createModal?.unmount();
        this.#editModal?.unmount();
        this.#confirmModal?.unmount();
        await super.unmount();
    }

    // ═══════════════════════════════════════════════════════════════
    // DATA LOADING
    // ═══════════════════════════════════════════════════════════════

    async #loadDashboardData() {
        const analyticsService = this.getService('analytics');
        const linksService = this.getService('links');

        const [statsResult, linksResult] = await Promise.allSettled([
            (async () => {
                if (typeof analyticsService?.getMyOverview === 'function') {
                    return analyticsService.getMyOverview({});
                }
                return null;
            })(),
            linksService.loadLinks({page: 1, pageSize: 3}),
        ]);

        this.#stats = statsResult.status === 'fulfilled' ? statsResult.value : null;
        if (statsResult.status === 'rejected') {
            console.warn('[HomePage] Analytics unavailable:', statsResult.reason);
        }

        this.#recentLinks = linksResult.status === 'fulfilled'
            ? (linksResult.value?.links ?? [])
            : [];
        if (linksResult.status === 'rejected') {
            console.warn('[HomePage] Recent Links unavailable:', linksResult.reason);
        }
    }

    /**
     * Quiet in-place refresh of the recent Links section.
     * Does NOT show the global loading overlay — the list updates silently.
     */
    async #refreshRecentLinks() {
        if (!this.isMounted()) return;
        try {
            const result = await this.getService('links').loadLinks({page: 1, pageSize: 3});
            this.#recentLinks = result?.links ?? [];
            this.#renderRecentLinks();
        } catch (err) {
            console.warn('[HomePage] Recent Links refresh failed:', err);
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // RENDERING
    // ═══════════════════════════════════════════════════════════════

    #updateWelcomeTitle(currentUser) {
        const el = this.querySelector('#welcomeTitle');
        if (!el) return;
        const name = currentUser?.name || currentUser?.username || 'there';
        const greeting = this.#getGreeting();
        el.textContent = `${greeting}, ${name}!`;
    }

    #updateDate() {
        const el = this.querySelector('#homeDate');
        if (!el) return;
        el.textContent = new Date().toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    }

    #getGreeting() {
        const h = new Date().getHours();
        if (h < 12) return 'Good morning';
        if (h < 17) return 'Good afternoon';
        return 'Good evening';
    }

    /**
     * Mount UserOverviewCards into #statsGrid.
     *
     * UserOverviewCards is a BaseComponent — it manages its own DOM and
     * exposes an updateStats() API for in-place patching. Registering it here
     * means super.unmount() → destroyComponents() handles teardown automatically.
     *
     * Props shape: { stats } where stats is the full getMyOverview() response
     * ({ overview, urlPerformance, ... }). UserOverviewCards reads both
     * stats.overview and stats.urlPerformance internally — never pass only
     * the inner overview object or urlPerformance fields will all be undefined.
     */
    async #mountStatsCards() {
        const el = this.querySelector('#statsGrid');
        if (!el) return;

        // Pass the full getMyOverview() response as `stats`.
        // UserOverviewCards internally destructures stats.overview and stats.urlPerformance.
        this.#statsCards = new UserOverviewCards(el, {
            stats: this.#stats ?? {},
        });
        await this.#statsCards.mount();

        // Register so super.unmount() → destroyComponents() cleans it up.
        this.registerComponent(this.#statsCards);
    }

    async #mountEmptyState() {
        const el = this.querySelector('#homeEmptyStateContainer');
        if (!el) return;

        this.#emptyState = new LinkEmptyState(el, {
            title: 'No links Found!',
            message: 'Create your first short link to start tracking clicks.',
            actionLabel: 'Create link',
            icon: 'fa-solid fa-link-slash'
        });

        await this.#emptyState.mount();
        this.registerComponent(this.#emptyState);

        // Standard Architecture Pattern: Child emits event up, Parent handles routing/logic.
        this.attachListener(el, 'action', () => this.#openCreateModal());
    }

    /**
     * Render the recent Links list or the empty state.
     * Shows/hides the section header actions and "View all" footer accordingly.
     */
    #renderRecentLinks() {
        const container = this.querySelector('#recentLinksContainer');
        const emptyContainer = this.querySelector('#homeEmptyStateContainer');
        const headerActions = this.querySelector('#recentLinksHeaderActions');
        const footer = this.querySelector('#viewAllLinksFooter');
        if (!container) return;

        if (!this.#recentLinks.length) {
            if (headerActions) headerActions.style.display = 'none';
            if (footer) footer.style.display = 'none';
            if (container) container.style.display = 'none';
            if (emptyContainer) emptyContainer.style.display = '';
            return;
        }

        if (headerActions) headerActions.style.display = '';
        if (footer) footer.style.display = '';
        if (container) container.style.display = '';
        if (emptyContainer) emptyContainer.style.display = 'none';

        container.innerHTML = `
            <div class="home-link-list">
                ${this.#recentLinks.map(link => RecentLinkCard(link)).join('')}
            </div>`;
    }

    // ═══════════════════════════════════════════════════════════════
    // EVENT WIRING — called ONCE from mount()
    // ═══════════════════════════════════════════════════════════════

    /**
     * Register modal container event listeners exactly once per page lifetime.
     * This prevents the duplicate-submission bug: if attachListener() were called
     * inside #openCreateModal(), N handlers would accumulate after N opens.
     */
    #wireModalContainerEvents() {
        const createEl = this.querySelector('#homeCreateModalContainer');
        if (createEl) {
            this.attachListener(createEl, 'link:submit', e => this.#handleCreateSubmit(e.detail));
            this.attachListener(createEl, 'modal:close', () => this.#createModal?.unmount());
        }

        const editEl = this.querySelector('#homeEditModalContainer');
        if (editEl) {
            this.attachListener(editEl, 'link:update', e => this.#handleEditSubmit(e.detail));
            this.attachListener(editEl, 'modal:close', () => this.#editModal?.unmount());
        }
        // ConfirmModal uses onConfirm/onCancel prop callbacks — no container events needed.
    }

    /**
     * One delegated click handler covers the entire page.
     * Survives DOM re-renders inside #recentLinksContainer (empty state ↔ list).
     */
    #wirePageButtons() {
        this.attachListener(this.container, 'click', (e) => {
            const btn = e.target.closest('[id], [data-action]');
            if (!btn || btn.tagName !== 'BUTTON') return;

            const {action, id, url} = btn.dataset;
            const btnId = btn.id;

            // ── Page-level buttons ─────────────────────────────────────────────
            switch (btnId) {
                case 'createNewLinkBtn':
                case 'createNewLinkBtnHeader':
                case 'bulkCreationBtn':
                    return this.#openCreateModal();
                case 'refreshLinksBtn':
                    return this.#handleRefresh(btn);
                case 'viewAllLinksBtn':
                case 'manageLinksBtn':
                    return this.navigateTo('/links');
                case 'downloadAnalyticsBtn':
                    return this.navigateTo('/analytics');
                case 'organizationBtn':
                    return this.navigateTo('/organization');
            }

            // ── Link card action buttons ───────────────────────────────────────
            switch (action) {
                case 'copy':
                    return this.#copyToClipboard(url, btn);
                case 'stats':
                    return this.navigateTo(`/links/${id}/stats`);
                case 'edit':
                    return this.#openEditModal(id);
                case 'delete':
                    return this.#openDeleteConfirm(id);
            }
        });
    }

    // ═══════════════════════════════════════════════════════════════
    // MODAL LIFECYCLE — instance management only, NO listener registration
    // ═══════════════════════════════════════════════════════════════

    #openCreateModal() {
        this.#createModal?.unmount();
        const el = this.querySelector('#homeCreateModalContainer');
        if (!el) return;
        this.#createModal = new CreateLinkModal(el, {});
        this.#createModal.mount();
    }

    async #handleCreateSubmit(data) {
        const svc = this.getService('links');
        try {
            if (data.mode === 'bulk') {
                const requests = (data.urls ?? []).map(url => ({
                    originalUrl: url,
                    title: data.title ?? '',
                    clickLimit: data.clickLimit ?? -1,
                    expiresAt: data.expiresAt ?? null,
                    trackingEnabled: data.tracking ?? true,
                    isPasswordProtected: data.isPasswordProtected ?? false,
                    password: data.password ?? '',
                    isPrivate: data.isPrivate ?? false,
                }));
                await svc.createBulkLinks(requests);
                this.showNotification(`${requests.length} links created!`, 'success');
            } else {
                await svc.createLink({
                    originalUrl: data.originalUrl,
                    customShortCode: data.customAlias ?? null,
                    title: data.title ?? '',
                    description: data.description ?? '',
                    clickLimit: data.clickLimit ?? -1,
                    expiresAt: data.expiresAt ?? null,
                    trackingEnabled: data.tracking ?? true,
                    isPasswordProtected: data.isPasswordProtected ?? false,
                    password: data.password ?? '',
                    isPrivate: data.isPrivate ?? false,
                });
                this.showNotification('Link created!', 'success');
            }
            this.#createModal?.unmount();
        } catch (err) {
            this.showNotification(`Failed to create link: ${err.message}`, 'error');
            this.#createModal?.resetSubmitButton?.();
        }
    }

    #openEditModal(linkId) {
        const linkData = this.#recentLinks.find(l => String(l.id) === String(linkId));
        if (!linkData) {
            this.showNotification('Could not find link data.', 'error');
            return;
        }
        this.#editModal?.unmount();
        const el = this.querySelector('#homeEditModalContainer');
        if (!el) return;
        this.#editModal = new EditLinkModal(el, {linkData});
        this.#editModal.mount();
    }

    async #handleEditSubmit(payload) {
        try {
            await this.getService('links').updateLink(payload.id, payload);
            this.showNotification('Link updated!', 'success');
            this.#editModal?.unmount();
        } catch (err) {
            this.showNotification(`Failed to update: ${err.message}`, 'error');
            this.#editModal?.resetSubmitButton?.();
        }
    }

    #openDeleteConfirm(linkId) {
        const link = this.#recentLinks.find(l => String(l.id) === String(linkId));
        if (!link) return;

        this.#confirmModal?.unmount();
        const el = this.querySelector('#homeConfirmModalContainer');
        if (!el) return;
        this.#confirmModal = new ConfirmModal(el, {
            title: 'Delete Link',
            message: `Delete "${this.escapeHtml(link.title || link.shortCode)}"? This cannot be undone.`,
            confirmLabel: 'Delete',
            confirmIcon: 'fa-solid fa-trash',
            variant: 'danger',
            onConfirm: () => this.#deleteLink(linkId),
        });
        this.#confirmModal.mount();
    }

    async #deleteLink(linkId) {
        try {
            await this.getService('links').deleteLink(linkId);
            this.showNotification('Link deleted.', 'success');
        } catch (err) {
            this.showNotification(`Failed to delete: ${err.message}`, 'error');
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // CLIPBOARD
    // ═══════════════════════════════════════════════════════════════

    async #copyToClipboard(shortUrl, btn) {
        if (!shortUrl || !btn) return;
        if (btn.dataset.isProcessing === 'true') return;
        btn.dataset.isProcessing = 'true';

        try {
            await navigator.clipboard.writeText(shortUrl);
        } catch {
            const ta = Object.assign(document.createElement('textarea'), {
                value: shortUrl, style: 'position:fixed;opacity:0',
            });
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
        }

        const originalHTML = btn.innerHTML;
        btn.innerHTML = '<i class="fa-solid fa-check" aria-hidden="true"></i> Copied!';
        btn.classList.add('btn--copied');

        setTimeout(() => {
            if (btn.isConnected) {
                btn.innerHTML = originalHTML;
                btn.classList.remove('btn--copied');
            }
            btn.dataset.isProcessing = 'false';
        }, 2000);
    }

    // ═══════════════════════════════════════════════════════════════
    // UI HELPERS
    // ═══════════════════════════════════════════════════════════════

    async #handleRefresh(btn) {
        const icon = btn.querySelector('i');
        const wrapper = this.querySelector('#recentLinksContainer');

        if (icon) icon.classList.add('fa-spin');
        if (wrapper) wrapper.style.opacity = '0.5';
        btn.disabled = true;

        try {
            await this.#refreshRecentLinks();
        } finally {
            if (icon) icon.classList.remove('fa-spin');
            if (wrapper) wrapper.style.opacity = '';
            btn.disabled = false;
        }
    }
}