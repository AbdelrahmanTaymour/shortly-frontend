/**
 * ProfileHeaderCard  –  src/ui/ProfileHeaderCard/Profile/ProfileHeaderCard.js
 *
 * Displays the user's avatar (initials fallback), name, bio, and key metadata.
 * Emits 'editClick' when the user triggers edit mode.
 */

import './ProfileHeaderCard.css';
import BaseComponent from '../../../base/BaseComponent.js';
import {getCountryName} from "../../../../utils/Countries.js";

class ProfileHeaderCard extends BaseComponent {
    /**
     * @param {Element} container
     * @param {{ Profile: Object, user: Object }} props
     */
    constructor(container, props) {
        super(container, props);
    }

    // ─── Helpers ───────────────────────────────────────────────────────────────

    _initials(name, email) {
        if (name?.trim()) {
            return name.trim().split(/\s+/)
                .slice(0, 2)
                .map(w => w[0].toUpperCase())
                .join('');
        }
        if (email) return email[0].toUpperCase();
        return '?';
    }

    _formatDate(iso) {
        if (!iso) return '—';
        return new Date(iso).toLocaleDateString(undefined, {year: 'numeric', month: 'long', day: 'numeric'});
    }

    // ─── Render ────────────────────────────────────────────────────────────────

    render() {
        const {profile = {}, user = {}} = this.props;
        const name = profile.name || user.name || '';
        const email = user.email || '';
        const bio = profile.bio || '';
        const initials = this._initials(name, email);
        const avatarUrl = profile.profilePictureUrl || null;
        const location = [profile.location, getCountryName(profile.country)].filter(Boolean).join(', ');

        return `
        <div class="profile-card">
            <!-- Avatar -->
            <div class="profile-avatar-wrap">
                ${avatarUrl
            ? `<img src="${this.escapeHtml(avatarUrl)}" alt="Profile picture" class="profile-avatar-img" loading="lazy">`
            : `<div class="profile-avatar-initials" aria-label="${this.escapeHtml(initials)}">${this.escapeHtml(initials)}</div>`
        }
                <div class="profile-avatar-badge" title="Verified"></div>
            </div>

            <!-- Identity -->
            <div class="profile-card-identity">
                <h2 class="profile-card-name">${this.escapeHtml(name || 'No name set')}</h2>
                <p class="profile-card-email">
                    <i class="fa-solid fa-envelope" aria-hidden="true"></i>
                    ${this.escapeHtml(email || '—')}
                </p>
                ${bio ? `<p class="profile-card-bio">${this.escapeHtml(bio)}</p>` : '<p class="Profile-card-bio Profile-card-bio--empty">No bio added yet.</p>'}
            </div>

            <!-- Meta tags -->
            <div class="profile-card-meta">
                ${location ? `
                <span class="profile-meta-tag">
                    <i class="fa-solid fa-location-dot" aria-hidden="true"></i>
                    ${this.escapeHtml(location)}
                </span>` : ''}
                ${profile.company ? `
                <span class="profile-meta-tag">
                    <i class="fa-solid fa-building" aria-hidden="true"></i>
                    ${this.escapeHtml(profile.company)}
                </span>` : ''}
                ${profile.website ? `
                <a href="${this.escapeHtml(profile.website)}" target="_blank" rel="noopener noreferrer" class="profile-meta-tag profile-meta-tag--link">
                    <i class="fa-solid fa-link" aria-hidden="true"></i>
                    ${this.escapeHtml(profile.website.replace(/^https?:\/\//, ''))}
                </a>` : ''}
                ${profile.timeZone ? `
                <span class="profile-meta-tag">
                    <i class="fa-solid fa-clock" aria-hidden="true"></i>
                    ${this.escapeHtml(profile.timeZone)}
                </span>` : ''}
            </div>

            <!-- Last updated -->
            ${profile.updatedAt ? `
            <p class="profile-card-updated">
                <i class="fa-regular fa-calendar-check" aria-hidden="true"></i>
                Updated ${this._formatDate(profile.updatedAt)}
            </p>` : ''}

        </div>`;
    }

    /**
     * Update the card in-place with fresh Profile data (no full remount).
     * @param {Object} profile
     * @param {Object} user
     */
    async refresh(profile, user) {
        await this.update({...this.props, profile, user});
    }
}

export default ProfileHeaderCard;