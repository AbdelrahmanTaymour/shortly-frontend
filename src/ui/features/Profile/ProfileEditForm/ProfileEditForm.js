/**
 * ProfileEditForm
 */

import './ProfileEditForm.css';
import BaseComponent from '../../../base/BaseComponent.js';
import {getCountryOptions} from '../../../../utils/Countries.js';

const TIMEZONES = [
    'UTC', 'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
    'America/Anchorage', 'America/Honolulu', 'America/Toronto', 'America/Vancouver',
    'America/Mexico_City', 'America/Sao_Paulo', 'America/Buenos_Aires',
    'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Europe/Madrid', 'Europe/Rome',
    'Europe/Amsterdam', 'Europe/Moscow', 'Europe/Istanbul',
    'Asia/Dubai', 'Asia/Karachi', 'Asia/Kolkata', 'Asia/Dhaka',
    'Asia/Bangkok', 'Asia/Singapore', 'Asia/Shanghai', 'Asia/Tokyo', 'Asia/Seoul',
    'Australia/Sydney', 'Australia/Melbourne', 'Pacific/Auckland', 'Pacific/Honolulu',
    'Africa/Cairo', 'Africa/Lagos', 'Africa/Johannesburg',
];

class ProfileEditForm extends BaseComponent {
    /**
     * @param {Element} container
     * @param {{ Profile: Object, saving?: boolean }} props
     */
    constructor(container, props) {
        super(container, props);
        this._saving = false;
    }

    // ─── Render ────────────────────────────────────────────────────────────────

    render() {
        const p = this.props.profile || {};

        const tzOptions = TIMEZONES.map(tz =>
            `<option value="${tz}" ${p.timeZone === tz ? 'selected' : ''}>${tz.replace(/_/g, ' ')}</option>`
        ).join('');

        const countryOptions = getCountryOptions().map(c =>
            `<option value="${c.code}" ${p.country === c.code ? 'selected' : ''}>${c.name}</option>`
        ).join('');

        return `
        <div class="pef-form" role="form" aria-label="Edit profile">
            <div class="pef-header">
                <h3 class="pef-title">
                    <i class="fa-solid fa-pen-to-square" aria-hidden="true"></i>
                    Edit Profile
                </h3>
                <p class="pef-subtitle">Update your personal information and preferences.</p>
            </div>

            <div class="pef-fields">
                <!-- Row 1: Name -->
                <div class="pef-field pef-field--full">
                    <label class="pef-label" for="pef-name">Display Name</label>
                    <div class="pef-input-wrap">
                        <i class="fa-solid fa-user pef-input-icon" aria-hidden="true"></i>
                        <input
                            type="text"
                            id="pef-name"
                            class="pef-input"
                            placeholder="Your full name"
                            value="${this.escapeHtml(p.name || '')}"
                            maxlength="100"
                            autocomplete="name"
                        >
                    </div>
                </div>

                <!-- Row 2: Bio -->
                <div class="pef-field pef-field--full">
                    <label class="pef-label" for="pef-bio">
                        Bio
                        <span class="pef-label-hint">(max 300 chars)</span>
                    </label>
                    <textarea
                        id="pef-bio"
                        class="pef-input pef-textarea"
                        placeholder="Tell us a little about yourself..."
                        maxlength="300"
                        rows="3"
                        aria-describedby="pef-bio-count"
                    >${this.escapeHtml(p.bio || '')}</textarea>
                    <span class="pef-char-count" id="pef-bio-count">
                        <span id="pef-bio-chars">${(p.bio || '').length}</span>/300
                    </span>
                </div>

                <!-- Row 3: Phone + Website -->
                <div class="pef-field">
                    <label class="pef-label" for="pef-phone">Phone Number</label>
                    <div class="pef-input-wrap">
                        <i class="fa-solid fa-phone pef-input-icon" aria-hidden="true"></i>
                        <input
                            type="tel"
                            id="pef-phone"
                            class="pef-input"
                            placeholder="+1 (555) 000-0000"
                            value="${this.escapeHtml(p.phoneNumber || '')}"
                            autocomplete="tel"
                        >
                    </div>
                </div>

                <div class="pef-field">
                    <label class="pef-label" for="pef-website">Website</label>
                    <div class="pef-input-wrap">
                        <i class="fa-solid fa-globe pef-input-icon" aria-hidden="true"></i>
                        <input
                            type="url"
                            id="pef-website"
                            class="pef-input"
                            placeholder="https://yourwebsite.com"
                            value="${this.escapeHtml(p.website || '')}"
                            autocomplete="url"
                        >
                    </div>
                </div>

                <!-- Row 4: Company + Location -->
                <div class="pef-field">
                    <label class="pef-label" for="pef-company">Company</label>
                    <div class="pef-input-wrap">
                        <i class="fa-solid fa-building pef-input-icon" aria-hidden="true"></i>
                        <input
                            type="text"
                            id="pef-company"
                            class="pef-input"
                            placeholder="Your company or organization"
                            value="${this.escapeHtml(p.company || '')}"
                            maxlength="100"
                        >
                    </div>
                </div>

                <div class="pef-field">
                    <label class="pef-label" for="pef-location">City / Location</label>
                    <div class="pef-input-wrap">
                        <i class="fa-solid fa-map-pin pef-input-icon" aria-hidden="true"></i>
                        <input
                            type="text"
                            id="pef-location"
                            class="pef-input"
                            placeholder="City, State"
                            value="${this.escapeHtml(p.location || '')}"
                            maxlength="100"
                        >
                    </div>
                </div>

                <!-- Row 5: Country + Timezone -->
                <div class="pef-field">
                    <label class="pef-label" for="pef-country">Country</label>
                    <div class="pef-input-wrap">
                        <i class="fa-solid fa-flag pef-input-icon" aria-hidden="true"></i>
                        <select id="pef-country" class="pef-input pef-select">
                            <option value="">— Select country —</option>
                            ${countryOptions}
                        </select>
                    </div>
                </div>

                <div class="pef-field">
                    <label class="pef-label" for="pef-timezone">Time Zone</label>
                    <div class="pef-input-wrap">
                        <i class="fa-solid fa-clock pef-input-icon" aria-hidden="true"></i>
                        <select id="pef-timezone" class="pef-input pef-select">
                            <option value="">— Select timezone —</option>
                            ${tzOptions}
                        </select>
                    </div>
                </div>

                <!-- Row 6: Profile picture URL -->
                <div class="pef-field pef-field--full">
                    <label class="pef-label" for="pef-avatar">Profile Picture URL</label>
                    <div class="pef-input-wrap">
                        <i class="fa-solid fa-image pef-input-icon" aria-hidden="true"></i>
                        <input
                            type="url"
                            id="pef-avatar"
                            class="pef-input"
                            placeholder="https://example.com/photo.jpg"
                            value="${this.escapeHtml(p.profilePictureUrl || '')}"
                        >
                    </div>
                    <p class="pef-field-hint">Paste a direct image URL. Square images work best.</p>
                </div>
            </div>

            <!-- Actions -->
            <div class="pef-actions">
                <button class="btn btn-ghost pef-cancel-btn" id="pef-cancel" type="button">
                    Cancel
                </button>
                <button class="btn btn-primary pef-save-btn" id="pef-save" type="button">
                    <span class="pef-save-text">
                        <i class="fa-solid fa-floppy-disk" aria-hidden="true"></i>
                        Save Changes
                    </span>
                    <span class="pef-save-spinner hidden">
                        <span class="spinner spinner--sm"></span>
                        Saving…
                    </span>
                </button>
            </div>
        </div>`;
    }

    // ─── Events ────────────────────────────────────────────────────────────────

    setupEventListeners() {
        // Bio character counter
        const bio = this.querySelector('#pef-bio');
        const count = this.querySelector('#pef-bio-chars');
        if (bio && count) {
            this.attachListener(bio, 'input', () => {
                count.textContent = bio.value.length;
            });
        }

        // Save
        const saveBtn = this.querySelector('#pef-save');
        if (saveBtn) this.attachListener(saveBtn, 'click', () => this._handleSave());

        // Cancel
        const cancelBtn = this.querySelector('#pef-cancel');
        if (cancelBtn) this.attachListener(cancelBtn, 'click', () => this.emit('cancel'));
    }

    // ─── Collect & validate ────────────────────────────────────────────────────

    _collectData() {
        const val = id => (this.querySelector(id)?.value?.trim() || null);
        return {
            name: val('#pef-name'),
            bio: val('#pef-bio'),
            phoneNumber: val('#pef-phone'),
            website: val('#pef-website'),
            company: val('#pef-company'),
            location: val('#pef-location'),
            country: val('#pef-country'),
            timeZone: val('#pef-timezone'),
            profilePictureUrl: val('#pef-avatar'),
        };
    }

    _validate(data) {
        if (data.website && !/^https?:\/\/.+/.test(data.website)) {
            return 'Website must start with http:// or https://';
        }
        if (data.profilePictureUrl && !/^https?:\/\/.+/.test(data.profilePictureUrl)) {
            return 'Profile picture URL must start with http:// or https://';
        }
        return null;
    }

    _handleSave() {
        if (this._saving) return;
        const data = this._collectData();
        const error = this._validate(data);
        if (error) {
            this._showInlineError(error);
            return;
        }
        this._clearInlineError();
        this.emit('save', {data});
    }

    // ─── Loading state ────────────────────────────────────────────────────────

    setSaving(isSaving) {
        this._saving = isSaving;
        const saveBtn = this.querySelector('#pef-save');
        const text = this.querySelector('.pef-save-text');
        const spinner = this.querySelector('.pef-save-spinner');
        if (!saveBtn) return;

        saveBtn.disabled = isSaving;
        text?.classList.toggle('hidden', isSaving);
        spinner?.classList.toggle('hidden', !isSaving);
    }

    _showInlineError(message) {
        let el = this.querySelector('.pef-inline-error');
        if (!el) {
            el = document.createElement('p');
            el.className = 'pef-inline-error alert alert--error';
            this.querySelector('.pef-actions')?.before(el);
        }
        el.textContent = message;
    }

    _clearInlineError() {
        this.querySelector('.pef-inline-error')?.remove();
    }

    /**
     * Populate the form with fresh Profile data (called after a successful save).
     * @param {Object} profile
     */
    populate(profile) {
        const set = (id, val) => {
            const el = this.querySelector(id);
            if (el) el.value = val || '';
        };
        set('#pef-name', profile.name);
        set('#pef-bio', profile.bio);
        set('#pef-phone', profile.phoneNumber);
        set('#pef-website', profile.website);
        set('#pef-company', profile.company);
        set('#pef-location', profile.location);
        set('#pef-country', profile.country);
        set('#pef-timezone', profile.timeZone);
        set('#pef-avatar', profile.profilePictureUrl);

        const count = this.querySelector('#pef-bio-chars');
        if (count) count.textContent = (profile.bio || '').length;
    }
}

export default ProfileEditForm;