/**
 * SettingsPage — Settings page controller.
 */

import BasePage from '../BasePage.js';
import DashboardPageHeader from '../../components/DashboardPageHeader/DashboardPageHeader.js';
import ChangePasswordForm from '../../features/Settings/components/ChangePasswordForm.js';
import ChangeEmailForm from '../../features/Settings/components/ChangeEmailForm.js';
import EmailVerificationCard from '../../features/Settings/EmailVerificationCard/EmailVerificationCard.js';
import SecurityStatusCard from '../../features/Settings/SecurityStatusCard/SecurityStatusCard.js';
import DangerZoneCard from '../../features/Settings/DangerZoneCard/DangerZoneCard.js';

export default class SettingsPage extends BasePage {

    // ─── Private state ────────────────────────────────────────────────────────
    #activeSection = 'account';

    // ─── Component refs ───────────────────────────────────────────────────────
    #pageHeader = null;
    #changePasswordForm = null;
    #changeEmailForm = null;
    #emailVerifyCard = null;
    #securityStatusCard = null;
    #dangerZoneCard = null;

    // ═══════════════════════════════════════════════════════════════
    // LIFECYCLE
    // ═══════════════════════════════════════════════════════════════

    async mount() {
        // FIX 1: super.mount() FIRST — sets isPageMounted = true.
        await super.mount();

        const settingsService = this.getService('settings');
        if (!settingsService) throw new Error('SettingsService not registered');

        // FIX 4: Subscribe BEFORE loading data so the first dispatch fires
        // into the subscriber rather than being missed.
        this.trackStoreSubscription(
            this.store.subscribe('settings', (settingsState) => {
                this.#onSettingsStateChange(settingsState);
            })
        );

        // Mount the page header immediately — static content, no data needed.
        await this.#mountPageHeader();

        try {
            this.#showSkeleton(true);

            // FIX 2: userId read from the store, not from the service property.
            const {currentUser} = this.store.getState('auth');
            const userId = currentUser?.id ?? currentUser?.sub ?? null;

            // Load security status; other sections need no initial data load.
            // Failure is non-fatal — the card renders an error state gracefully.
            if (userId) {
                await settingsService.getSecurityStatus(userId).catch(err => {
                    console.warn('[SettingsPage] Security status unavailable:', err.message);
                });
            }

            await this.#mountAllComponents();
            this.#wireNavEvents();
            this.#activateSection(this.#activeSection);
            this.highlightActiveNavItem('/Settings');

            this.#showSkeleton(false);
            this.#showContent(true);

        } catch (err) {
            console.error('[SettingsPage] mount error:', err);
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

    /**
     * Reacts to every change in the Settings store slice.
     * Currently used to update SecurityStatusCard after a refresh.
     * @param {{ securityStatus: Object|null }} state
     */
    #onSettingsStateChange({securityStatus}) {
        if (!this.isMounted()) return;

        // Pass refreshed security status to the card if it is already mounted
        if (this.#securityStatusCard?.isMounted) {
            this.#securityStatusCard.update?.({status: securityStatus});
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // COMPONENT MOUNTING
    // ═══════════════════════════════════════════════════════════════

    async #mountPageHeader() {
        const el = this.querySelector('#settingsPageHeaderMount');
        if (!el) return;

        this.#pageHeader = new DashboardPageHeader(el, {
            icon: 'fa-gear',
            title: 'Settings',
            subtitle: 'Manage your account Settings and security preferences.',
        });
        await this.#pageHeader.mount();
        this.registerComponent(this.#pageHeader); // FIX 5
    }

    async #mountAllComponents() {
        await this.#mountChangePasswordForm();
        await this.#mountChangeEmailForm();
        await this.#mountEmailVerifyCard();
        await this.#mountSecurityStatusCard();
        await this.#mountDangerZoneCard();
    }

    async #mountChangePasswordForm() {
        const el = this.querySelector('#sChangePasswordContainer');
        if (!el) return;

        this.#changePasswordForm = new ChangePasswordForm(el, {});
        await this.#changePasswordForm.mount();
        this.registerComponent(this.#changePasswordForm); // FIX 5

        // FIX 9: handler extracted to named private method
        this.#changePasswordForm.on('submit', (payload) => this.#handlePasswordSubmit(payload));
    }

    async #mountChangeEmailForm() {
        const el = this.querySelector('#sChangeEmailContainer');
        if (!el) return;

        // FIX 2: email from store, not from service property
        const {currentUser} = this.store.getState('auth');
        const currentEmail = currentUser?.email ?? '';

        this.#changeEmailForm = new ChangeEmailForm(el, {currentEmail});
        await this.#changeEmailForm.mount();
        this.registerComponent(this.#changeEmailForm); // FIX 5

        this.#changeEmailForm.on('submit', (payload) => this.#handleEmailSubmit(payload));
    }

    async #mountEmailVerifyCard() {
        const el = this.querySelector('#sEmailVerifyContainer');
        if (!el) return;

        // FIX 2: email from store
        const {currentUser} = this.store.getState('auth');
        const email = currentUser?.email ?? '';

        this.#emailVerifyCard = new EmailVerificationCard(el, {email});
        await this.#emailVerifyCard.mount();
        this.registerComponent(this.#emailVerifyCard); // FIX 5

        this.#emailVerifyCard.on('send', () => this.#handleSendVerification());
    }

    async #mountSecurityStatusCard() {
        const el = this.querySelector('#sSecurityStatusContainer');
        if (!el) return;

        // FIX 3: read from store, not from a stale local _securityStatus copy
        const {securityStatus} = this.store.getState('settings');

        this.#securityStatusCard = new SecurityStatusCard(el, {status: securityStatus});
        await this.#securityStatusCard.mount();
        this.registerComponent(this.#securityStatusCard); // FIX 5
    }

    async #mountDangerZoneCard() {
        const el = this.querySelector('#sDangerZoneContainer');
        if (!el) return;

        this.#dangerZoneCard = new DangerZoneCard(el, {});
        await this.#dangerZoneCard.mount();
        this.registerComponent(this.#dangerZoneCard); // FIX 5

        this.#dangerZoneCard.on('deleteAccount', () => this.#handleDeleteAccount());
    }

    // ═══════════════════════════════════════════════════════════════
    // EVENT WIRING
    // ═══════════════════════════════════════════════════════════════

    #wireNavEvents() {
        // Both desktop nav and mobile tabs use [data-section] — one delegate each.
        const sidebar = this.querySelector('#settingsSidebar');
        const mobileTabs = this.querySelector('#settingsMobileTabs');

        const handleNav = (e) => {
            const btn = e.target.closest('[data-section]');
            if (btn?.dataset.section) this.#switchSection(btn.dataset.section);
        };

        if (sidebar) this.attachListener(sidebar, 'click', handleNav);
        if (mobileTabs) this.attachListener(mobileTabs, 'click', handleNav);
    }

    // ═══════════════════════════════════════════════════════════════
    // ACTION HANDLERS — FIX 9: named private methods, not inline lambdas
    // ═══════════════════════════════════════════════════════════════

    async #handlePasswordSubmit({currentPassword, newPassword, confirmPassword}) {
        const svc = this.getService('settings');
        if (!svc || !this.#changePasswordForm) return;

        this.#changePasswordForm.setSaving(true);
        try {
            const result = await svc.changePassword(currentPassword, newPassword, confirmPassword);
            this.#changePasswordForm.setFeedback(
                result?.message || (result?.success
                    ? 'Password changed. You will be logged out shortly.'
                    : 'Failed to change password.'),
                result?.success ? 'success' : 'error'
            );
        } catch (err) {
            this.#changePasswordForm.setFeedback(err.message || 'An error occurred.', 'error');
        } finally {
            this.#changePasswordForm.setSaving(false);
        }
    }

    async #handleEmailSubmit({newEmail, password}) {
        const svc = this.getService('settings');
        if (!svc || !this.#changeEmailForm) return;

        this.#changeEmailForm.setSaving(true);
        try {
            const result = await svc.initiateEmailChange(newEmail, password);
            if (result?.success) {
                this.#changeEmailForm.showSuccess();
            } else {
                this.#changeEmailForm.setFeedback(
                    result?.message || 'Failed to initiate email change.',
                    'error'
                );
            }
        } catch (err) {
            this.#changeEmailForm.setFeedback(err.message || 'An error occurred.', 'error');
        } finally {
            this.#changeEmailForm.setSaving(false);
        }
    }

    async #handleSendVerification() {
        const svc = this.getService('settings');
        if (!svc || !this.#emailVerifyCard) return;

        this.#emailVerifyCard.setSending(true);
        try {
            const result = await svc.sendEmailVerification(null);
            if (result?.emailSent) {
                this.#emailVerifyCard.setFeedback(
                    result.message || 'Verification email sent! Check your inbox.',
                    'success'
                );
                this.#emailVerifyCard.startCooldown(60);
            } else {
                this.#emailVerifyCard.setFeedback(
                    result?.message || 'Your email is already verified.',
                    'info'
                );
            }
        } catch (err) {
            // 409 means the email is already verified — not a real error
            if (err.status === 409) {
                this.#emailVerifyCard.setFeedback('Your email address is already verified.', 'info');
            } else {
                this.#emailVerifyCard.setFeedback(
                    err.message || 'Failed to send verification email.',
                    'error'
                );
            }
        } finally {
            this.#emailVerifyCard.setSending(false);
        }
    }

    async #handleDeleteAccount() {
        // Account deletion is a ProfileService concern (manages the user entity).
        // SettingsPage delegates to it; it emits USER_LOGGED_OUT on success,
        // which main.js handles to redirect to the landing page.
        const svc = this.getService('profile');
        if (!svc || !this.#dangerZoneCard) return;

        this.#dangerZoneCard.setDeleting(true);
        try {
            const result = await svc.requestAccountDeletion();
            if (result) {
                this.#dangerZoneCard.setFeedback(
                    'Account deleted. You will be redirected shortly.',
                    'success'
                );
                // USER_LOGGED_OUT emitted by ProfileService → main.js handles redirect
            } else {
                this.#dangerZoneCard.setFeedback('Failed to delete account.', 'error');
                this.#dangerZoneCard.setDeleting(false);
            }
        } catch (err) {
            this.#dangerZoneCard.setFeedback(err.message || 'An error occurred.', 'error');
            this.#dangerZoneCard.setDeleting(false);
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // SECTION MANAGEMENT
    // ═══════════════════════════════════════════════════════════════

    #switchSection(section) {
        if (section === this.#activeSection) return;
        this.#activeSection = section;
        this.#activateSection(section);
    }

    #activateSection(section) {
        const sectionMap = {
            'account': '#settingsSectionAccount',
            'email-verification': '#settingsSectionEmailVerification',
            'security': '#settingsSectionSecurity',
            'danger': '#settingsSectionDanger',
        };

        // Show/hide panels
        Object.entries(sectionMap).forEach(([key, sel]) => {
            const el = this.querySelector(sel);
            el?.classList.toggle('active', key === section);
            el?.classList.toggle('hidden', key !== section);
        });

        // Update nav button ARIA state (both desktop + mobile share [data-section])
        this.querySelectorAll('[data-section]').forEach(btn => {
            const active = btn.dataset.section === section;
            btn.classList.toggle('active', active);
            btn.setAttribute('aria-current', active ? 'page' : 'false');
        });
    }

    // ═══════════════════════════════════════════════════════════════
    // UI HELPERS
    // ═══════════════════════════════════════════════════════════════

    #showSkeleton(visible) {
        this.querySelector('#settingsSkeleton')?.classList.toggle('hidden', !visible);
    }

    #showContent(visible) {
        this.querySelector('#settingsContent')?.classList.toggle('hidden', !visible);
    }

    #showError(message) {
        this.#showSkeleton(false);
        this.#showContent(false);

        const el = this.querySelector('#settingsError');
        if (!el) return;

        el.classList.remove('hidden');
        el.innerHTML = `
            <div class="error-container p-10 text-center">
                <i class="fa-solid fa-circle-exclamation"
                   style="font-size:2.5rem;color:var(--error-color);display:block;margin-bottom:1rem"
                   aria-hidden="true"></i>
                <p style="font-size:1rem;margin-bottom:1rem">
                    Failed to load settings: ${this.escapeHtml(message)}
                </p>
                <button class="btn btn-primary" id="settingsRetryBtn" type="button">
                    <i class="fa-solid fa-rotate-right" aria-hidden="true"></i> Retry
                </button>
            </div>`;

        const retryBtn = el.querySelector('#settingsRetryBtn');
        if (retryBtn) {
            this.attachListener(retryBtn, 'click', async () => {
                el.classList.add('hidden');
                el.innerHTML = '';
                await this.mount();
            });
        }
    }
}