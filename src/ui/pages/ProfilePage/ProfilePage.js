/**
 * ProfilePage — Profile management page controller.
 *
 * Location: src/ui/pages/ProfilePage/ProfilePage.js
 *
 * RESPONSIBILITY: Orchestrate Profile feature ProfileHeaderCard, subscribe to the
 *                 'Profile' store slice, delegate user actions to ProfileService.
 */

import BasePage from '../BasePage.js';
import DashboardPageHeader from '../../components/DashboardPageHeader/DashboardPageHeader.js';
import ProfileHeaderCard from '../../features/Profile/ProfileHeaderCard/ProfileHeaderCard.js';
import ProfileEditForm from '../../features/Profile/ProfileEditForm/ProfileEditForm.js';
import QuotaStatusCard from '../../features/Profile/QuotaStatusCard/QuotaStatusCard.js';
import {normalizeCountryCode} from '../../../utils/Countries.js';

export default class ProfilePage extends BasePage {

    #activeTab = 'edit';

    #pageHeader = null;
    #headerCard = null;
    #editForm = null;
    #quotaCard = null;

    // ═══════════════════════════════════════════════════════════════
    // LIFECYCLE
    // ═══════════════════════════════════════════════════════════════

    async mount() {
        await super.mount();

        const profileService = this.getService('profile');
        if (!profileService) throw new Error('ProfileService not registered');

        // Subscribe BEFORE loading data — component refs are null here but
        // all update calls are ?. guarded, so the first dispatch is safe.
        this.trackStoreSubscription(
            this.store.subscribe('profile', (profileState) => {
                this.#onProfileStateChange(profileState);
            })
        );

        await this.#mountPageHeader();

        try {
            this.#showSkeleton(true);

            await Promise.allSettled([
                profileService.getProfile(true),
                profileService.getQuotaStatus(true),
            ]);

            await this.#mountContentComponents();

            this.#wireTabEvents();
            this.#activateTab(this.#activeTab);
            this.highlightActiveNavItem('/Profile');

            this.#showSkeleton(false);
            this.#showContent(true);

        } catch (err) {
            console.error('[ProfilePage] mount error:', err);
            this.#showSkeleton(false);
            this.#showError(err.message);
        }
    }

    async unmount() {
        await super.unmount();
    }

    // ═══════════════════════════════════════════════════════════════
    // STORE SUBSCRIBER
    // ═══════════════════════════════════════════════════════════════

    #onProfileStateChange({profile, quota}) {
        if (!this.isMounted()) return;

        if (profile && this.#headerCard?.isMounted) {
            const {currentUser} = this.store.getState('auth');
            this.#headerCard.refresh?.(profile, currentUser || {});
        }
        if (profile && this.#editForm?.isMounted) {
            this.#editForm.populate?.(profile);
        }
        if (quota && this.#quotaCard?.isMounted) {
            this.#quotaCard.update?.({quota});
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // COMPONENT MOUNTING
    // ═══════════════════════════════════════════════════════════════

    async #mountPageHeader() {
        const el = this.querySelector('#profilePageHeaderMount');
        if (!el) return;

        this.#pageHeader = new DashboardPageHeader(el, {
            icon: 'fa-user',
            title: 'My Profile',
            subtitle: 'Manage your personal information and preferences.',
        });
        await this.#pageHeader.mount();
        this.registerComponent(this.#pageHeader);
    }

    async #mountContentComponents() {
        const {profile, quota} = this.store.getState('profile');
        const {currentUser} = this.store.getState('auth');

        await this.#mountHeaderCard(profile, currentUser);
        await this.#mountEditForm(profile);
        await this.#mountQuotaCard(quota);
    }

    async #mountHeaderCard(profile, currentUser) {
        const el = this.querySelector('#profileHeaderCardContainer');
        if (!el) return;

        this.#headerCard = new ProfileHeaderCard(el, {
            profile: profile || {},
            user: currentUser || {},
        });
        await this.#headerCard.mount();
        this.registerComponent(this.#headerCard);

        this.#headerCard.on('editClick', () => {
            this.#switchTab('edit');
            this.querySelector('#profileTabEdit')?.scrollIntoView({
                behavior: 'smooth',
                block: 'start',
            });
        });
    }

    async #mountEditForm(profile) {
        const el = this.querySelector('#profileEditFormContainer');
        if (!el) return;

        this.#editForm = new ProfileEditForm(el, {profile: profile || {}});
        await this.#editForm.mount();
        this.registerComponent(this.#editForm);

        this.#editForm.on('save', ({data}) => this.#handleSave(data));
        this.#editForm.on('cancel', () => this.#handleCancel());
    }

    async #mountQuotaCard(quota) {
        const el = this.querySelector('#profileQuotaContainer');
        if (!el) return;

        this.#quotaCard = new QuotaStatusCard(el, {quota: quota || {}});
        await this.#quotaCard.mount();
        this.registerComponent(this.#quotaCard);
    }

    // ═══════════════════════════════════════════════════════════════
    // EVENT WIRING
    // ═══════════════════════════════════════════════════════════════

    #wireTabEvents() {
        const tabNav = this.querySelector('#profileTabsNav');
        if (!tabNav) return;

        this.attachListener(tabNav, 'click', (e) => {
            const btn = e.target.closest('.profile-tab-btn');
            if (btn?.dataset.tab) this.#switchTab(btn.dataset.tab);
        });

        this.attachListener(tabNav, 'keydown', (e) => {
            if (!['ArrowLeft', 'ArrowRight'].includes(e.key)) return;
            const tabs = Array.from(tabNav.querySelectorAll('.profile-tab-btn'));
            const cur = tabs.findIndex(t => t.classList.contains('active'));
            const next = e.key === 'ArrowRight'
                ? (cur + 1) % tabs.length
                : (cur - 1 + tabs.length) % tabs.length;
            tabs[next]?.click();
            tabs[next]?.focus();
        });
    }

    // ═══════════════════════════════════════════════════════════════
    // SAVE HANDLER — COUNTRY FIX LIVES HERE
    // ═══════════════════════════════════════════════════════════════

    /**
     * Normalise form data before sending to the service.
     *
     * Country normalisation:
     *   The backend requires ISO 3166-1 alpha-2 (2-letter) or alpha-3 (3-letter)
     *   codes in UPPERCASE (e.g., "EG", "US", "GBR").
     *
     *   The form may send:
     *     • Full display name:  "Egypt"  →  normalizeCountryCode("Egypt") = "EG"
     *     • Lowercase code:     "eg"     →  normalizeCountryCode("eg")    = "EG"
     *     • Correct code:       "EG"     →  normalizeCountryCode("EG")    = "EG"
     *
     *   src/utils/countries.js contains the name→code lookup table.
     *
     * @param {Object} data — raw form payload from ProfileEditForm
     * @returns {Object} normalised payload safe to send to ProfileService
     */
    #normalizeProfileData(data) {
        const processed = {...data};

        if (processed.country != null && processed.country !== '') {
            processed.country = normalizeCountryCode(processed.country);
        }

        // Guard: if normalisation couldn't resolve the value (still > 3 chars),
        // remove the field so the existing value is preserved on the server.
        if (processed.country && processed.country.length > 3) {
            console.warn(
                `[ProfilePage] Could not resolve country "${data.country}" to an ISO code. ` +
                'Field removed from payload. Add the name to src/utils/countries.js.'
            );
            delete processed.country;
        }

        return processed;
    }

    /**
     * Handle the form's save event.
     * Normalises the country code, then delegates to ProfileService.
     * On success, ProfileService dispatches an optimistic update → store subscriber
     * fires → ProfileHeaderCard update automatically.
     */
    async #handleSave(data) {
        const profileService = this.getService('profile');
        if (!profileService || !this.#editForm) return;

        this.#editForm.setSaving?.(true);

        try {
            // FIX: normalise country before sending to the API
            const normalizedData = this.#normalizeProfileData(data);

            const result = await profileService.updateProfile(normalizedData);
            if (result) {
                this.showNotification('Profile updated successfully!', 'success');
                // Store subscriber fires automatically → ProfileHeaderCard update
            } else {
                this.showNotification('Failed to update Profile. Please try again.', 'error');
            }
        } catch (err) {
            console.error('[ProfilePage] save error:', err);
            this.showNotification(err.message || 'An error occurred while saving.', 'error');
        } finally {
            this.#editForm.setSaving?.(false);
        }
    }

    #handleCancel() {
        const {profile} = this.store.getState('profile');
        if (this.#editForm && profile) {
            this.#editForm.populate?.(profile);
        }
        this.showNotification('Changes discarded.', 'info');
    }

    // ═══════════════════════════════════════════════════════════════
    // TAB MANAGEMENT
    // ═══════════════════════════════════════════════════════════════

    #switchTab(tab) {
        if (tab === this.#activeTab) return;
        this.#activeTab = tab;
        this.#activateTab(tab);
    }

    #activateTab(tab) {
        const panels = {
            edit: '#profileTabEdit',
            quota: '#profileTabQuota',
        };

        Object.entries(panels).forEach(([key, sel]) => {
            const el = this.querySelector(sel);
            el?.classList.toggle('active', key === tab);
            el?.classList.toggle('hidden', key !== tab);
        });

        this.querySelectorAll('.profile-tab-btn').forEach(btn => {
            const active = btn.dataset.tab === tab;
            btn.classList.toggle('active', active);
            btn.setAttribute('aria-selected', String(active));
            btn.tabIndex = active ? 0 : -1;
        });
    }

    // ═══════════════════════════════════════════════════════════════
    // UI HELPERS
    // ═══════════════════════════════════════════════════════════════

    #showSkeleton(visible) {
        this.querySelector('#profileSkeleton')?.classList.toggle('hidden', !visible);
    }

    #showContent(visible) {
        this.querySelector('#profileContent')?.classList.toggle('hidden', !visible);
    }

    #showError(message) {
        this.#showSkeleton(false);
        this.#showContent(false);

        const el = this.querySelector('#profileError');
        if (!el) return;

        el.classList.remove('hidden');
        el.innerHTML = `
            <div class="error-container p-10 text-center">
                <i class="fa-solid fa-circle-exclamation"
                   style="font-size:2.5rem;color:var(--error-color);display:block;margin-bottom:1rem"
                   aria-hidden="true"></i>
                <p style="font-size:1rem;margin-bottom:1rem">
                    Failed to load profile: ${this.escapeHtml(message)}
                </p>
                <button class="btn btn-primary" id="profileRetryBtn" type="button">
                    <i class="fa-solid fa-rotate-right" aria-hidden="true"></i> Retry
                </button>
            </div>`;

        const retryBtn = el.querySelector('#profileRetryBtn');
        if (retryBtn) {
            this.attachListener(retryBtn, 'click', async () => {
                el.classList.add('hidden');
                el.innerHTML = '';
                await this.mount();
            });
        }
    }
}