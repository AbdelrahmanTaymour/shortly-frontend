/**
 * LinkEmptyState — Generic empty state component.
 *
 * RESPONSIBILITY: Render an empty state message with an optional action button.
 */

import './LinkEmptyState.css';
import BaseComponent from '../../../../base/BaseComponent.js';

export default class LinkEmptyState extends BaseComponent {
    constructor(container, props = {}) {
        super(container, props);
    }

    render() {
        const {
            icon = 'fa-solid fa-link-slash',
            title = 'No Links found!',
            message = 'Create your first short link to get started',
            actionLabel = 'Create your first link',
            actionIcon = 'fa-solid fa-plus',
            showAction = true,
        } = this.props;

        return `
            <div class="empty-state">
                <div class="empty-state-icon" aria-hidden="true">
                    <i class="${this.escapeHtml(icon)}"></i>
                </div>
                <h3>${this.escapeHtml(title)}</h3>
                <p>${this.escapeHtml(message)}</p>
                ${showAction ? `
                    <button class="btn btn-primary" id="emptyStateActionBtn" type="button">
                        <i class="${this.escapeHtml(actionIcon)}" aria-hidden="true"></i>
                        ${this.escapeHtml(actionLabel)}
                    </button>
                ` : ''}
            </div>
        `;
    }

    setupEventListeners() {
        const btn = this.querySelector('#emptyStateActionBtn');
        if (!btn) return;

        this.attachListener(btn, 'click', () => {
            this.container.dispatchEvent(
                new CustomEvent('action', {detail: {}, bubbles: true})
            );
        });
    }
}