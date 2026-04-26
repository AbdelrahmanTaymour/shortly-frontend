/**
 * DashboardLayout — Shell template for all authenticated pages.
 *
 * RESPONSIBILITY: Render the sidebar + header + content shell once per
 *                 authenticated session. Replaced only when the user logs out
 *                 and the landing shell takes over.
 */

/**
 * Returns the full authenticated dashboard shell HTML string.
 * Called once by Application._loadPage() when a protected route is activated.
 * @returns {string}
 */

import './DashboardLayout.css';

export const DashboardLayout = () => `
    <div class="dashboard-container">

        <!-- ── Sidebar ────────────────────────────────────────────────── -->
        <nav class="sidebar" id="sidebar" aria-label="Main navigation">
            <a href="/" class="sidebar-header" data-link aria-label="Shortly — go to home">
                <div class="logo" aria-hidden="true">S</div>
                <div class="logo-text">Shortly</div>
            </a>

            <div class="sidebar-menu" role="list">
                <a href="/home"         class="menu-item" data-link role="listitem">
                    <div class="menu-icon" aria-hidden="true"><i class="fa-solid fa-house"></i></div>
                    <span class="menu-text">Home</span>
                </a>
                <a href="/links"        class="menu-item" data-link role="listitem">
                    <div class="menu-icon" aria-hidden="true"><i class="fa-solid fa-link"></i></div>
                    <span class="menu-text">Links</span>
                </a>
                <a href="/analytics"    class="menu-item" data-link role="listitem">
                    <div class="menu-icon" aria-hidden="true"><i class="fa-solid fa-chart-line"></i></div>
                    <span class="menu-text">Analytics</span>
                </a>
                <a href="/profile"      class="menu-item" data-link role="listitem">
                    <div class="menu-icon" aria-hidden="true"><i class="fa-solid fa-user"></i></div>
                    <span class="menu-text">Profile</span>
                </a>
                <a href="/settings"     class="menu-item" data-link role="listitem">
                    <div class="menu-icon" aria-hidden="true"><i class="fa-solid fa-gear"></i></div>
                    <span class="menu-text">Settings</span>
                </a>
            </div>
        </nav>

        <!-- ── Main area ─────────────────────────────────────────────── -->
        <main class="main-content" id="mainContent">

            <header class="top-header" role="banner">
                <div class="header-left">
                    <!--
                        #toggleSidebar: wired by Application._attachDashboardUI()
                        via addEventListener (not onclick) so it can be properly removed.
                    -->
                    <button
                        class="toggle-sidebar"
                        id="toggleSidebar"
                        aria-label="Toggle sidebar"
                        aria-expanded="true"
                        aria-controls="sidebar"
                        type="button"
                    >
                        <i class="fa-solid fa-sliders" aria-hidden="true"></i>
                    </button>

                    
                </div>

                <div class="header-right">
                    <!--
                        HeaderController renders the user avatar + dropdown inside here.
                        It targets #userMenuBtn and #userDropdown which it injects.
                        Application._attachDashboardUI() adds data-dropdown-toggle
                        to #userMenuBtn for UIEventManager delegation.
                    -->
                    <div id="user-profile-slot" aria-label="User menu"></div>
                </div>
            </header>

            <div class="dashboard-content">
                <!--
                    Router loads page templates here.
                    Application.js targets this element by ID after every navigation.
                    Do NOT rename or remove this ID.
                -->
                <div class="content-container" id="contentContainer"></div>
            </div>

        </main>
    </div>
`;