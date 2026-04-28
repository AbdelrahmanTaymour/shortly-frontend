/**
 * DangerZoneCard  –  src/ui/ProfileHeaderCard/Settings/DangerZoneCard.js
 */

import BaseComponent from '../../../base/BaseComponent.js';

const CONFIRM_WORD = 'DELETE';

class DangerZoneCard extends BaseComponent {
    constructor(container, props) {
        super(container, props);
        this._deleting = false;
    }

    render() {
        return `
        <div class="settings-card settings-card--danger" id="dangerZoneCard">
            <div class="settings-card-header">
                <div class="settings-card-icon settings-card-icon--red">
                    <i class="fa-solid fa-skull-crossbones" aria-hidden="true"></i>
                </div>
                <div>
                    <h3 class="settings-card-title danger-title">Danger Zone</h3>
                    <p class="settings-card-desc">
                        These actions are permanent and cannot be undone.
                    </p>
                </div>
            </div>

            <div class="settings-card-body">
                <!-- Warning box -->
                <div class="dz-warning-box">
                    <i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i>
                    <div>
                        <strong>Delete Account</strong>
                        <p>Deleting your account will:</p>
                        <ul class="dz-consequence-list">
                            <li><i class="fa-solid fa-xmark"></i> Permanently remove all your short links</li>
                            <li><i class="fa-solid fa-xmark"></i> Delete all analytics and QR codes</li>
                            <li><i class="fa-solid fa-xmark"></i> Log you out of all devices immediately</li>
                            <li><i class="fa-solid fa-xmark"></i> Make your account unrecoverable</li>
                        </ul>
                    </div>
                </div>

                <!-- Confirmation input -->
                <div class="sf-field dz-confirm-field">
                    <label class="sf-label dz-confirm-label" for="dz-confirm">
                        Type <strong class="dz-confirm-word">${CONFIRM_WORD}</strong> to confirm
                    </label>
                    <input
                        type="text"
                        id="dz-confirm"
                        class="pef-input dz-confirm-input"
                        placeholder="${CONFIRM_WORD}"
                        autocomplete="off"
                        spellcheck="false"
                    >
                </div>

                <div class="sf-feedback hidden" id="dzFeedback" role="alert"></div>

                <div class="sf-actions">
                    <button class="btn btn-danger dz-delete-btn" id="dzDeleteBtn" type="button" disabled>
                        <span class="sf-btn-text">
                            <i class="fa-solid fa-trash" aria-hidden="true"></i>
                            Delete My Account
                        </span>
                        <span class="sf-btn-spinner hidden">
                            <span class="spinner spinner--sm"></span> Deleting…
                        </span>
                    </button>
                </div>
            </div>
        </div>`;
    }

    setupEventListeners() {
        const input = this.querySelector('#dz-confirm');
        const btn = this.querySelector('#dzDeleteBtn');

        if (input && btn) {
            this.attachListener(input, 'input', () => {
                const match = input.value === CONFIRM_WORD;
                btn.disabled = !match;
                input.classList.toggle('dz-confirm-input--valid', match);
            });
        }

        if (btn) {
            this.attachListener(btn, 'click', () => {
                if (this._deleting) return;
                const val = this.querySelector('#dz-confirm')?.value || '';
                if (val !== CONFIRM_WORD) return;
                this.emit('deleteAccount');
            });
        }
    }

    setDeleting(v) {
        this._deleting = v;
        const btn = this.querySelector('#dzDeleteBtn');
        const text = this.querySelector('.sf-btn-text');
        const spinner = this.querySelector('.sf-btn-spinner');
        if (btn) btn.disabled = v;
        text?.classList.toggle('hidden', v);
        spinner?.classList.toggle('hidden', !v);
    }

    _setFeedback(message, type = 'error') {
        const el = this.querySelector('#dzFeedback');
        if (!el) return;
        el.className = `sf-feedback sf-feedback--${type}`;
        el.textContent = message;
        el.classList.remove('hidden');
    }

    setFeedback(message, type) {
        this._setFeedback(message, type);
    }
}

export default DangerZoneCard;