/**
 * LinksPage — Link management page controller.
 */

import BasePage from '../BasePage.js';
import DashboardPageHeader from '../../components/DashboardPageHeader/DashboardPageHeader.js';
import FiltersBar from '../../features/Links/components/FiltersBar/FiltersBar.js';
import LinksList from '../../features/Links/components/LinksList.js';
import FloatingBulkActionsBar from '../../features/Links/components/FloatingBulkActionsBar/FloatingBulkActionsBar.js';
import Pagination from '../../components/primitives/Pagination/Pagination.js';
import CreateLinkModal from '../../features/Links/modals/CreateLinkModal.js';
import EditLinkModal from '../../features/Links/modals/EditLinkModal.js';
import ConfirmModal from '../../features/Links/modals/ConfirmModal/ConfirmModal.js';
import BulkExpirationModal from '../../features/Links/modals/BulkExpirationModal.js';
import LinkEmptyState from "../../features/Links/components/LinkEmptyState/LinkEmptyState.js";

export default class LinksPage extends BasePage {

    #currentPage = 1;
    #pageSize = 20;
    #selectedLinks = new Set();

    #pageHeader = null;
    #filtersBar = null;
    #linksList = null;
    #bulkActions = null;
    #pagination = null;
    #emptyState = null;

    #createModal = null;
    #editModal = null;
    #confirmModal = null;
    #bulkExpirationModal = null;

    // ═══════════════════════════════════════════════════════════════
    // LIFECYCLE
    // ═══════════════════════════════════════════════════════════════

    async mount() {
        await super.mount();

        if (!this.getService('links')) throw new Error('LinksService not found');

        try {
            this.trackStoreSubscription(
                this.store.subscribe('links', (linksState) => {
                    this.#onLinksStateChange(linksState);
                })
            );

            // Mount header FIRST — buttons inside it are wired in #wirePageButtons()
            await this.#mountPageHeader();
            await this.#mountPersistentComponents();
            this.#wireComponentEvents();
            this.#wirePageButtons();
            this.#wireModalContainerEvents();

            await this.getService('links').loadLinks({
                page: this.#currentPage,
                pageSize: this.#pageSize,
            });

            this.highlightActiveNavItem('/Links');

        } catch (error) {
            console.error('[LinksPage] mount error:', error);
            this.renderError(error.message);
        }
    }

    async unmount() {
        await super.unmount();
    }

    // ═══════════════════════════════════════════════════════════════
    // STORE SUBSCRIBER
    // ═══════════════════════════════════════════════════════════════

    async #onLinksStateChange({links, pagination}) {
        if (!this.isMounted()) return;
        const totalPages = this.#resolveTotalPages(pagination);
        if (this.#linksList) await this.#linksList.updateLinks(links);
        if (this.#pagination) await this.#pagination.setPagination({
            currentPage: pagination.page ?? this.#currentPage,
            totalPages,
            pageSize: this.#pageSize,
        });
        this.#syncVisibility(links);
    }

    // ═══════════════════════════════════════════════════════════════
    // COMPONENT MOUNTING
    // ═══════════════════════════════════════════════════════════════

    /**
     * Mount the generic DashboardPageHeader and inject the "Create link" button
     * into its right slot. The button keeps its ID #createLinkBtn so
     * #wirePageButtons() can find and wire it without change.
     */
    async #mountPageHeader() {
        const el = this.querySelector('#linksPageHeaderMount');
        if (!el) return;

        this.#pageHeader = new DashboardPageHeader(el, {
            icon: 'fa-link',
            title: 'All Links',
            subtitle: 'Manage and monitor your short Links',
        });
        await this.#pageHeader.mount();
        this.registerComponent(this.#pageHeader);

        // Inject the create button into the right slot
        const rightSlot = this.#pageHeader.getRightSlot();
        if (rightSlot) {
            rightSlot.innerHTML = `
                <button
                    class="btn btn-primary"
                    id="createLinkBtn"
                    type="button"
                    aria-label="Create new link">
                    <i class="fa-solid fa-plus" aria-hidden="true"></i>
                    Create link
                </button>`;
        }
    }

    async #mountPersistentComponents() {
        const {links, pagination} = this.store.getState('links');
        const totalPages = this.#resolveTotalPages(pagination);

        this.#filtersBar = new FiltersBar(
            this.querySelector('#filtersBarContainer'),
            {filters: this.store.getState('links').filters}
        );
        await this.#filtersBar.mount();
        this.registerComponent(this.#filtersBar);

        this.#linksList = new LinksList(
            this.querySelector('#linksTableContainer'),
            {links, selectedLinks: this.#selectedLinks}
        );
        await this.#linksList.mount();
        this.registerComponent(this.#linksList);

        // FloatingBulkActionsBar uses a portal div on document.body so that
        // position:fixed works regardless of any ancestor transform/will-change.
        // The component's destroy() removes the portal element from body.
        const floatingBarPortal = document.createElement('div');
        floatingBarPortal.id = 'floatingBulkBarPortal';
        document.body.appendChild(floatingBarPortal);

        this.#bulkActions = new FloatingBulkActionsBar(
            floatingBarPortal,
            {selectedCount: 0}
        );
        await this.#bulkActions.mount();
        this.registerComponent(this.#bulkActions);

        this.#pagination = new Pagination(
            this.querySelector('#paginationContainer'),
            {currentPage: this.#currentPage, totalPages, pageSize: this.#pageSize}
        );
        await this.#pagination.mount();
        this.registerComponent(this.#pagination);

        // Mount the new Empty State component
        this.#emptyState = new LinkEmptyState(
            this.querySelector('#emptyStateContainer'),
            {
                title: 'No links Found!',
                message: 'Create your first short link to get started.',
                actionLabel: 'Create link'
            }
        );
        await this.#emptyState.mount();
        this.registerComponent(this.#emptyState);
    }

    // ═══════════════════════════════════════════════════════════════
    // EVENT WIRING — called ONCE from mount()
    // ═══════════════════════════════════════════════════════════════

    #wireComponentEvents() {
        this.attachListener(this.#filtersBar.container, 'filterChange', (e) => {
            this.#currentPage = 1;
            this.#applyFilters(e.detail.filters);
        });
        this.attachListener(this.#filtersBar.container, 'clearFilters', () => {
            this.#clearFilters();
        });

        this.attachListener(this.#linksList.container, 'action', (e) => {
            const {action, linkId, shortCode} = e.detail;
            this.#handleCardAction(action, linkId, shortCode);
        });
        this.attachListener(this.#linksList.container, 'selectionChange', (e) => {
            this.#selectedLinks = new Set(e.detail.selectedLinks);
            this.#updateBulkBar();
        });

        this.attachListener(this.#bulkActions.container, 'deselect', () => this.#deselectAll());
        this.attachListener(this.#bulkActions.container, 'bulkAction', (e) => this.#handleBulkAction(e.detail.action));

        this.attachListener(this.#pagination.container, 'pageChange', (e) => {
            this.#currentPage = e.detail.page;
            this.#applyFilters();
        });

        // Listen for the Empty State UI button emit
        this.attachListener(this.#emptyState.container, 'action', () => this.#openCreateModal());
    }

    #wirePageButtons() {
        this.attachListener(this.querySelector('#createLinkBtn'), 'click', () => this.#openCreateModal());
    }

    #wireModalContainerEvents() {
        const createEl = this.querySelector('#createLinkModalContainer');
        if (createEl) {
            this.attachListener(createEl, 'link:submit', (e) => this.#handleCreateSubmit(e.detail));
            this.attachListener(createEl, 'modal:close', () => this.#createModal?.unmount());
        }

        const editEl = this.querySelector('#editLinkModalContainer');
        if (editEl) {
            this.attachListener(editEl, 'link:update', (e) => this.#handleEditSubmit(e.detail));
            this.attachListener(editEl, 'modal:close', () => this.#editModal?.unmount());
        }

        // ConfirmModal uses onConfirm/onCancel prop callbacks — no container events.

        const bulkExpEl = this.querySelector('#bulkExpirationModalContainer');
        if (bulkExpEl) {
            this.attachListener(bulkExpEl, 'confirm', (e) => this.#bulkUpdateExpiration(e.detail.expirationDate));
            this.attachListener(bulkExpEl, 'cancel', () => this.#bulkExpirationModal?.unmount());
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // CARD ACTION ROUTER
    // ═══════════════════════════════════════════════════════════════

    #handleCardAction(action, linkId, shortCode) {
        switch (action) {
            case 'stats':
                return this.navigateTo(`/links/${linkId}/stats`);
            case 'edit':
                return this.#openEditModal(linkId);
            case 'copy':
                return this.#copyToClipboard(shortCode);
            case 'delete':
                return this.#openDeleteConfirm(linkId);
            case 'toggle-active':
                return this.#toggleActive(linkId);
            case 'toggle-private':
                return this.#togglePrivate(linkId);
            case 'reset-stats':
                this.showNotification('Reset Stats is not yet implemented.', 'info');
                break;
            default:
                console.warn('[LinksPage] Unknown card action:', action);
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // CREATE MODAL — instance lifecycle only
    // ═══════════════════════════════════════════════════════════════

    #openCreateModal() {
        this.#createModal?.unmount();
        const el = this.querySelector('#createLinkModalContainer');
        if (!el) return;
        this.#createModal = new CreateLinkModal(el, {});
        this.#createModal.mount();
    }

    async #handleCreateSubmit(data) {
        const svc = this.getService('links');
        try {
            if (data.mode === 'bulk') {
                const requests = (data.urls ?? []).map(url => ({
                    originalUrl: url, title: data.title ?? '', description: data.description ?? '',
                    clickLimit: data.clickLimit ?? -1, expiresAt: data.expiresAt ?? null,
                    trackingEnabled: data.tracking ?? true, isPasswordProtected: data.isPasswordProtected ?? false,
                    password: data.password ?? '', isPrivate: data.isPrivate ?? false,
                }));
                await svc.createBulkLinks(requests);
                this.showNotification(`${requests.length} links created successfully!`, 'success');
            } else {
                await svc.createLink({
                    originalUrl: data.originalUrl, customShortCode: data.customAlias ?? null,
                    title: data.title ?? '', description: data.description ?? '',
                    clickLimit: data.clickLimit ?? -1, expiresAt: data.expiresAt ?? null,
                    trackingEnabled: data.tracking ?? true, isPasswordProtected: data.isPasswordProtected ?? false,
                    password: data.password ?? '', isPrivate: data.isPrivate ?? false,
                });
                this.showNotification('Link created successfully!', 'success');
            }
            this.#createModal?.unmount();
            this.#currentPage = 1;
            await this.#applyFilters();
        } catch (error) {
            this.showNotification(`Failed to create link: ${error.message}`, 'error');
            this.#createModal?.resetSubmitButton?.();
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // EDIT MODAL — instance lifecycle only
    // ═══════════════════════════════════════════════════════════════

    async #openEditModal(linkId) {
        try {
            this.showLoading();
            const linkData = await this.getService('links').getLink(linkId);
            this.hideLoading();
            this.#editModal?.unmount();
            const el = this.querySelector('#editLinkModalContainer');
            if (!el) return;
            this.#editModal = new EditLinkModal(el, {linkData});
            await this.#editModal.mount();
        } catch (error) {
            this.hideLoading();
            this.showNotification(`Could not load link: ${error.message}`, 'error');
        }
    }

    async #handleEditSubmit(payload) {
        try {
            await this.getService('links').updateLink(payload.id, payload);
            this.showNotification('Link updated successfully!', 'success');
            this.#editModal?.unmount();
        } catch (error) {
            this.showNotification(`Failed to update link: ${error.message}`, 'error');
            this.#editModal?.resetSubmitButton?.();
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // DELETE
    // ═══════════════════════════════════════════════════════════════

    #openDeleteConfirm(linkId) {
        this.#openConfirmModal({
            title: 'Delete Link',
            message: 'Are you sure? All click data will be permanently lost.',
            confirmLabel: 'Delete',
            confirmIcon: 'fa-solid fa-trash',
            variant: 'danger',
            onConfirm: () => this.#deleteLink(linkId),
        });
    }

    async #deleteLink(linkId) {
        try {
            await this.getService('links').deleteLink(linkId);
            this.showNotification('Link deleted.', 'success');
        } catch (error) {
            this.showNotification(`Failed to delete link: ${error.message}`, 'error');
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // TOGGLE ACTIVE / PRIVATE
    // ═══════════════════════════════════════════════════════════════

    async #toggleActive(linkId) {
        const link = this.store.getState('links').links.find(l => String(l.id) === String(linkId));
        if (!link) return;
        const newState = !(link.isActive ?? link.active ?? true);
        try {
            await this.getService('links').updateLink(linkId, {isActive: newState});
            this.showNotification(`Link ${newState ? 'activated' : 'deactivated'}.`, 'success');
        } catch (error) {
            this.showNotification(`Failed to update link: ${error.message}`, 'error');
        }
    }

    async #togglePrivate(linkId) {
        const link = this.store.getState('links').links.find(l => String(l.id) === String(linkId));
        if (!link) return;
        const newState = !link.isPrivate;
        try {
            await this.getService('links').updateLink(linkId, {isPrivate: newState});
            this.showNotification(`Link is now ${newState ? 'private' : 'public'}.`, 'success');
        } catch (error) {
            this.showNotification(`Failed to update visibility: ${error.message}`, 'error');
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // BULK ACTIONS
    // ═══════════════════════════════════════════════════════════════

    #handleBulkAction(action) {
        switch (action) {
            case 'setExpiration':
                return this.#openBulkExpirationModal();
            case 'activate':
                return this.#bulkActivate();
            case 'deactivate':
                return this.#bulkDeactivate();
            case 'delete':
                return this.#openBulkDeleteConfirm();
            default:
                console.warn('[LinksPage] Unknown bulk action:', action);
        }
    }

    #openBulkDeleteConfirm() {
        const count = this.#selectedLinks.size;
        this.#openConfirmModal({
            title: 'Delete Links',
            message: `Delete ${count} link${count !== 1 ? 's' : ''}? This cannot be undone.`,
            confirmLabel: `Delete ${count} link${count !== 1 ? 's' : ''}`,
            confirmIcon: 'fa-solid fa-trash',
            variant: 'danger',
            onConfirm: () => this.#bulkDelete(),
        });
    }

    async #bulkDelete() {
        const ids = Array.from(this.#selectedLinks);
        try {
            await this.getService('links').bulkDeleteLinks(ids);
            this.showNotification(`${ids.length} link${ids.length !== 1 ? 's' : ''} deleted.`, 'success');
            this.#deselectAll();
        } catch (error) {
            this.showNotification(`Bulk delete failed: ${error.message}`, 'error');
        }
    }

    async #bulkActivate() {
        const ids = Array.from(this.#selectedLinks);
        try {
            await this.getService('links').bulkActivateLinks(ids);
            this.showNotification(`${ids.length} link${ids.length !== 1 ? 's' : ''} activated.`, 'success');
            this.#deselectAll();
        } catch (error) {
            this.showNotification(`Bulk activate failed: ${error.message}`, 'error');
        }
    }

    async #bulkDeactivate() {
        const ids = Array.from(this.#selectedLinks);
        try {
            await this.getService('links').bulkDeactivateLinks(ids);
            this.showNotification(`${ids.length} link${ids.length !== 1 ? 's' : ''} deactivated.`, 'success');
            this.#deselectAll();
        } catch (error) {
            this.showNotification(`Bulk deactivate failed: ${error.message}`, 'error');
        }
    }

    async #openBulkExpirationModal() {
        this.#bulkExpirationModal?.unmount();
        const el = this.querySelector('#bulkExpirationModalContainer');
        if (!el) return;
        this.#bulkExpirationModal = new BulkExpirationModal(el, {selectedCount: this.#selectedLinks.size});
        await this.#bulkExpirationModal.mount();
    }

    async #bulkUpdateExpiration(isoDate) {
        const ids = Array.from(this.#selectedLinks);
        try {
            await this.getService('links').bulkUpdateExpiration(ids, isoDate);
            this.#bulkExpirationModal?.unmount();
            this.showNotification('Expiration date updated.', 'success');
            this.#deselectAll();
        } catch (error) {
            this.showNotification(`Failed to update expiration: ${error.message}`, 'error');
        }
    }

    #openConfirmModal(config) {
        this.#confirmModal?.unmount();
        const el = this.querySelector('#confirmModalContainer');
        if (!el) return;
        this.#confirmModal = new ConfirmModal(el, config);
        this.#confirmModal.mount();
    }

    // ═══════════════════════════════════════════════════════════════
    // CLIPBOARD
    // ═══════════════════════════════════════════════════════════════

    async #copyToClipboard(shortUrl) {
        if (!shortUrl) return;
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
        this.showNotification('Copied to clipboard!', 'success');
    }

    // ═══════════════════════════════════════════════════════════════
    // FILTERS & PAGINATION
    // ═══════════════════════════════════════════════════════════════

    async #applyFilters(newFilters = null) {
        try {
            this.showLoading();
            await this.getService('links').loadLinks({
                page: this.#currentPage,
                pageSize: this.#pageSize,
                ...(newFilters && {filters: newFilters}),
            });
        } catch (error) {
            console.error('[LinksPage] #applyFilters error:', error);
        } finally {
            this.hideLoading();
        }
    }

    async #clearFilters() {
        this.getService('links').clearFilters?.();
        this.#currentPage = 1;
        await this.#applyFilters();
    }

    #resolveTotalPages(pagination) {
        const total = pagination?.total ?? 0;
        return pagination?.totalPages ?? Math.max(1, Math.ceil(total / this.#pageSize));
    }

    // ═══════════════════════════════════════════════════════════════
    // SELECTION MANAGEMENT
    // ═══════════════════════════════════════════════════════════════

    #deselectAll() {
        this.#selectedLinks.clear();
        this.#linksList?.clearSelection();
        this.#updateBulkBar();
    }

    #updateBulkBar() {
        if (!this.#bulkActions) return;
        const count = this.#selectedLinks.size;
        if (count > 0) {
            this.#bulkActions.show();
            this.#bulkActions.updateSelectionCount(count);
        } else {
            this.#bulkActions.hide();
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // UI HELPERS
    // ═══════════════════════════════════════════════════════════════

    #syncVisibility(links = this.store.getState('links').links) {
        const hasLinks = links.length > 0;
        this.querySelector('#linksTableContainer')?.classList.toggle('hidden', !hasLinks);
        this.querySelector('#emptyStateContainer')?.classList.toggle('hidden', hasLinks);
        this.querySelector('#paginationContainer')?.classList.toggle('hidden', !hasLinks);
    }
}