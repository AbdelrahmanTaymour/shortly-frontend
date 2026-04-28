import BaseComponent from '../../../base/BaseComponent.js';

class UserDropdown extends BaseComponent {
    constructor(container, props = {}) {
        super(container, props);
        this.state = {isOpen: false};
        this.user = props.user || {};
    }

    render() {
        const {username = 'User', email = ''} = this.user;

        return `
            <div class="user-menu" id="profileDropdownContainer">
                <button class="user-avatar" id="userMenuBtn">
                    <i class="fas fa-user-circle"></i>
                </button>
                
                <div class="dropdown-menu ${this.state.isOpen ? 'show' : ''}" 
                    id="userDropdown" 
                    style="display: ${this.state.isOpen ? 'block' : 'none'}">
                    <a href="/home" data-link>
                        <i class="fas fa-tachometer-alt"></i> Dashboard
                    </a>
                    <a href="/settings" data-link>
                        <i class="fas fa-cog"></i> Settings
                    </a>
                    <hr>
                    <a href="#" id="logoutBtn" style="color: #ff4d4d;">
                        <i class="fas fa-sign-out-alt"></i> Logout
                    </a>
                </div>

                <div class="user-info">
                    <span class="user-name">${this.escapeHtml(username)}</span>
                    <span class="user-email">${this.escapeHtml(email)}</span>
                </div>
            </div>
        `;
    }

    setState(newState) {
        this.state = {...this.state, ...newState};
        this.mount();
    }

    setupEventListeners() {
        const btn = this.querySelector('#userMenuBtn');
        const logoutBtn = this.querySelector('#logoutBtn');
        const authService = this.props.authService;

        if (btn) {
            this.attachListener(btn, 'click', (e) => {
                e.stopPropagation();
                this.setState({isOpen: !this.state.isOpen});
            });
        }

        if (logoutBtn && authService) {
            this.attachListener(logoutBtn, 'click', async (e) => {
                e.preventDefault();
                try {
                    await authService.logout();
                } catch (error) {
                    console.error('Logout failed:', error);
                }
            });
        }

        this.attachListener(document, 'click', (e) => {
            if (this.state.isOpen && !e.target.closest('#profileDropdownContainer')) {
                this.setState({isOpen: false});
            }
        });
    }
}

export default UserDropdown;