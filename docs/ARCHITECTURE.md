# Shortly Frontend — Complete Architecture Reference

> **Version:** 4.0 (Production Reference)
> **Stack:** Vanilla JS · Webpack · No framework dependencies
> **Audience:** All contributors — junior to senior — and technical reviewers

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Guiding Principles](#2-guiding-principles)
3. [Full Architecture Layer Stack](#3-full-architecture-layer-stack)
4. [Dependency Rules](#4-dependency-rules)
5. [Folder Structure](#5-folder-structure)
6. [Layer-by-Layer Breakdown](#6-layer-by-layer-breakdown)
   - 6.1 [Bootstrap — `src/app/`](#61-bootstrap--srcapp)
   - 6.2 [Configuration — `src/config/`](#62-configuration--srcconfig)
   - 6.3 [Infrastructure — `src/infrastructure/`](#63-infrastructure--srcinfrastructure)
   - 6.4 [Services — `src/services/`](#64-services--srcservices)
   - 6.5 [Store — `src/store/`](#65-store--srcstore)
   - 6.6 [UI — `src/ui/`](#66-ui--srcui)
   - 6.7 [Utilities — `src/utils/`](#67-utilities--srcutils)
   - 6.8 [Global Styles — `styles/`](#68-global-styles--styles)
7. [Component Architecture](#7-component-architecture)
8. [State Management](#8-state-management)
9. [API & Data Layer](#9-api--data-layer)
10. [Styling Architecture](#10-styling-architecture)
11. [Routing & Navigation](#11-routing--navigation)
12. [Data Flow Diagrams](#12-data-flow-diagrams)
13. [Performance Optimization](#13-performance-optimization)
14. [Scalability Guidelines](#14-scalability-guidelines)
15. [Best Practices & Conventions](#15-best-practices--conventions)
16. [Developer Onboarding Guide](#16-developer-onboarding-guide)
17. [GitHub Commit & Repository Strategy](#17-github-commit--repository-strategy)

---

## 1. System Overview

Shortly is a URL shortening Single Page Application (SPA) built entirely in Vanilla JavaScript without framework dependencies. Users can create, manage, and analyse short links through a rich authenticated dashboard.

### Architecture Style

Shortly is a **layered, feature-based SPA** that draws from Clean Architecture principles:

- **Layered** — The codebase is divided into strict horizontal layers (Infrastructure → Services → Store → UI). Each layer has a single responsibility and a defined boundary.
- **Feature-based** — Inside the UI layer, code is grouped by product domain (Links, Analytics, Profile, Settings) rather than by technical type. This means every feature is self-contained and can be understood in isolation.
- **Dependency inversion** — Higher-level modules (UI, Services) never depend on lower-level modules directly. They depend on abstractions injected at boot time.

### Technology Decisions

| Decision | Choice | Reason |
|---|---|---|
| Language | Vanilla JS (ES2022+) | Zero runtime overhead, full control, no framework churn |
| Bundler | Webpack | Mature ecosystem, fine-grained code splitting control |
| State | Custom Observable Store | Lightweight, predictable, no external dependencies |
| CSS | Co-located per component + global tokens | Maximum locality, zero orphaned styles |
| Charts | ApexCharts (lazy-loaded) | Rich analytics UI, loaded only when needed |

---

## 2. Guiding Principles

Every architectural decision in Shortly traces back to one question: **"Where do I look when something breaks?"** The answer must always be a single, unambiguous file.

### 2.1 Single Responsibility
Each file has exactly one reason to change. `LinksService.js` changes when link business rules change. `LinksApi.js` changes when the HTTP contract changes. They are never the same file.

### 2.2 Dependency Always Flows Inward
Outer layers (UI, Pages) depend on inner layers (Services, Store). Inner layers never import from outer layers. This makes the core completely testable in isolation.

### 2.3 Explicit Dependencies
Every class declares everything it needs through its constructor. Nothing reads from `window`, nothing relies on import order, nothing is magically available.

```js
// ❌ WRONG — hidden global dependency
class LinksService {
  constructor() {
    this.api = window.linksApi; // Where does this come from?
  }
}

// ✅ CORRECT — explicit, injectable, testable
class LinksService {
  constructor(linksApi, store, eventBus) {
    this.linksApi = linksApi;
    this.store     = store;
    this.eventBus  = eventBus;
  }
}
```

### 2.4 Co-location Over Convention
A component's CSS, HTML, and logic live together in the same folder. Deleting a feature means deleting one folder — not hunting for orphan files across multiple directories.

### 2.5 Unidirectional Data Flow
Data moves in one direction only:

```
Services write to Store → Components read from Store → User actions call Services
```

No component ever writes directly to another component's state.

### 2.6 Explicit Lifecycle
Every component and page has an explicit `mount() → update() → unmount() → destroy()` lifecycle. Listeners attached in `mount()` are always removed in `unmount()`. Memory leaks are a code-review failure, not a runtime debugging problem.

---

## 3. Full Architecture Layer Stack

```
  Higher layers depend on lower layers. Lower layers NEVER import higher layers.
  The APP layer is horizontal — available to all layers, depends on none.

  ┌──────────────────────────────────────────────────────────────────────────┐
  │                       PAGES  &  FEATURES                                 │
  │            src/ui/pages/   ·   src/ui/features/                          │
  │                                                                           │
  │  Pages:    Route-level orchestrators. Mount/unmount feature components.  │
  │  Features: Domain-aware stateful components (LinkCard, AuthForm…).       │
  │                                                                           │
  │  ✓ Subscribe to Store slices         ✓ Use primitive components          │
  │  ✗ No HTTP calls directly            ✗ No cross-feature imports          │
  └──────────────────────────────┬───────────────────────────────────────────┘
                                 │ reads / dispatches
                                 ▼
  ┌──────────────────────────────────────────────────────────────────────────┐
  │                           STORE                                           │
  │                        src/store/                                         │
  │                                                                           │
  │  Slices: auth · links · analytics · profile · settings                   │
  │  Pattern: Observable — dispatch(updater) → notify(subscribers)           │
  │                                                                           │
  │  ✓ Immutable reads (structuredClone)  ✓ Automatic subscriber notification│
  │  ✗ No business logic                  ✗ No HTTP calls                    │
  └──────────────────────────────┬───────────────────────────────────────────┘
                                 │ writes to
                                 ▲
  ┌──────────────────────────────────────────────────────────────────────────┐
  │                         SERVICES                                          │
  │                       src/services/                                       │
  │                                                                           │
  │  AuthService · LinksService · AnalyticsService · ProfileService           │
  │  SettingsService · ToastService · TokenManager                            │
  │                                                                           │
  │  ✓ Business logic & domain rules      ✓ Calls Infrastructure             │
  │  ✓ Writes to Store                    ✓ Emits EventBus events             │
  │  ✗ No DOM access                      ✗ No UI imports                    │
  └──────────────────────────────┬───────────────────────────────────────────┘
                                 │ calls
                                 ▼
  ┌──────────────────────────────────────────────────────────────────────────┐
  │                       INFRASTRUCTURE                                      │
  │                  src/infrastructure/http/                                 │
  │                                                                           │
  │  ApiClient · AuthApi · LinksApi · AnalyticsApi · ProfileApi              │
  │  SettingsApi · ApiError                                                   │
  │                                                                           │
  │  ✓ HTTP transport, headers, retries   ✓ Transforms raw API responses     │
  │  ✗ No business logic                  ✗ No state management              │
  └──────────────────────────────┬───────────────────────────────────────────┘
                                 │ uses
                                 ▼
  ┌──────────────────────────────────────────────────────────────────────────┐
  │                           UTILS                                           │
  │                         src/utils/                                        │
  │                                                                           │
  │  dom · formatting · validation · storage · ui-logic · uiEventManager     │
  │  ChartLoader · Countries · SafeLogger                                     │
  │                                                                           │
  │  ✓ Pure functions, zero side effects  ✓ No internal src/ imports         │
  │  ✓ Usable by any layer                ✗ No state, no API calls           │
  └──────────────────────────────────────────────────────────────────────────┘

  ┌──────────────────────────────────────────────────────────────────────────┐
  │  APP  (horizontal — available to all, depends on none)                   │
  │  src/app/   Application · Router · EventBus                              │
  └──────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Dependency Rules

### What Can Import What

```
  LAYER              CAN IMPORT FROM →
  ─────────────────────────────────────────────────────────────────────────
  Pages/Features  →  Services ✓  Store ✓  Components ✓  Utils ✓  App ✓
  Store           →  (nothing — it is imported by others, never imports)
  Services        →  Infrastructure ✓  Store ✓  Utils ✓  App ✓
  Infrastructure  →  Utils ✓  Config ✓
  Utils           →  (nothing — pure functions only)
  App             →  Config ✓  (wired at boot, no runtime imports)

  ─────────────────────────────────────────────────────────────────────────
  STRICTLY FORBIDDEN
  ─────────────────────────────────────────────────────────────────────────
  Infrastructure  →  Services           ✗  Creates a circular dependency
  Services        →  UI (any layer)     ✗  Services must not know the DOM exists
  Primitive comp  →  Features           ✗  Primitives have zero domain knowledge
  Feature A       →  Feature B          ✗  Features share state via Store only
  Utils           →  Anything in src/   ✗  Utils must be copy-paste portable
```

### Import Matrix

```
                       app  config  infra  services  store  components  features  pages  utils
                       ─────────────────────────────────────────────────────────────────────────
  app                │   –     ✓      –       –        –       –           –        –      ✓
  config             │   –     –      –       –        –       –           –        –      –
  infrastructure     │   –     ✓      –       –        –       –           –        –      ✓
  services           │   ✓     ✓      ✓       –        ✓       –           –        –      ✓
  store              │   –     –      –       –        –       –           –        –      –
  components/prim    │   ✓     –      –       –        –       –           –        –      ✓
  features           │   ✓     –      –       –        ✓       ✓           –        –      ✓
  pages              │   ✓     –      –       ✓        ✓       ✓           ✓        –      ✓
  utils              │   –     –      –       –        –       –           –        –      –

  ✓ = allowed   – = forbidden
```

---

## 5. Folder Structure

```
Shortly_Frontend/
│
├── dist/                             # Webpack build output (never edit manually)
│   ├── css/
│   │   └── main.[hash].css
│   ├── js/
│   │   ├── main.[hash].js
│   │   ├── vendor-apexcharts.[hash].js
│   │   └── vendors.[hash].js
│   └── index.html
│
├── docs/                             # Project documentation
│   ├── ARCHITECTURE.md               # This file
│   ├── ARCHITECTURE_DIAGRAMS.md      # Visual ASCII diagram companion
│   ├── MOCK_LAYER.md                 # Mock API layer documentation
│   └── verify-architecture.sh        # Architecture lint script
│
├── src/                              # All application source code
│   │
│   ├── app/                          # Bootstrap & wiring (runs once at startup)
│   │   ├── Application.js            # App lifecycle orchestrator
│   │   ├── EventBus.js               # Global pub/sub communication hub
│   │   └── Router.js                 # URL-to-page mapping, history management
│   │
│   ├── config/                       # Static, environment-level configuration only
│   │   ├── api.config.js             # Base URL, timeouts, endpoint constants
│   │   ├── app.config.js             # Feature flags, app-level constants
│   │   └── routes.config.js          # Route definitions (path → Page class)
│   │
│   ├── infrastructure/               # All I/O lives here. No business logic.
│   │   └── http/
│   │       ├── ApiClient.js          # Base HTTP client: headers, interceptors, retries
│   │       ├── ApiError.js           # Typed error class for HTTP failures
│   │       ├── AuthApi.js            # /auth/* endpoints
│   │       ├── LinksApi.js           # /links/* endpoints
│   │       ├── AnalyticsApi.js       # /analytics/* endpoints
│   │       ├── ProfileApi.js         # /profile/* endpoints
│   │       └── SettingsApi.js        # /settings/* endpoints
│   │
│   ├── services/                     # Business logic only. No DOM, no HTTP.
│   │   ├── AuthService.js
│   │   ├── LinksService.js
│   │   ├── AnalyticsService.js
│   │   ├── ProfileService.js
│   │   ├── SettingsService.js
│   │   ├── ToastService.js
│   │   └── TokenManager.js
│   │
│   ├── store/                        # Single source of truth for application state
│   │   ├── Store.js                  # Observable state engine
│   │   ├── index.js                  # Composes and exports the singleton store
│   │   └── slices/
│   │       ├── auth.slice.js         # User identity, token, auth status
│   │       ├── links.slice.js        # Links list, pagination, filters, cache
│   │       ├── analytics.slice.js    # Analytics data, date ranges
│   │       ├── profile.slice.js      # Profile data, quota
│   │       └── settings.slice.js     # Settings state
│   │
│   ├── ui/
│   │   │
│   │   ├── base/
│   │   │   └── BaseComponent.js      # Component lifecycle contract
│   │   │
│   │   ├── components/               # STATELESS, domain-agnostic UI primitives
│   │   │   │
│   │   │   ├── DashboardPageHeader/  # Shared authenticated page header chrome
│   │   │   │   ├── DashboardPageHeader.css
│   │   │   │   └── DashboardPageHeader.js
│   │   │   │
│   │   │   ├── feedback/             # User-facing notifications
│   │   │   │   ├── Alert/
│   │   │   │   │   ├── Alert.css
│   │   │   │   │   └── Alerts.js
│   │   │   │   └── Toast/
│   │   │   │       ├── Toast.css
│   │   │   │       └── Toast.js
│   │   │   │
│   │   │   ├── navigation/
│   │   │   │   ├── Header/           # Public landing page header
│   │   │   │   │   ├── Header.css
│   │   │   │   │   └── HeaderController.js
│   │   │   │   └── UserDropdown/     # Authenticated user avatar + menu
│   │   │   │       ├── UserDropdown.css
│   │   │   │       └── UserDropdown.js
│   │   │   │
│   │   │   └── primitives/           # Zero domain knowledge
│   │   │       ├── Button/
│   │   │       │   ├── Button.css
│   │   │       │   └── Button.js
│   │   │       ├── Input/
│   │   │       │   ├── Input.css
│   │   │       │   └── Input.js
│   │   │       ├── LoadingSpinner/
│   │   │       │   └── LoadingSpinner.css
│   │   │       ├── Pagination/
│   │   │       │   ├── Pagination.css
│   │   │       │   └── Pagination.js
│   │   │       └── Table/
│   │   │           └── Table.js
│   │   │
│   │   ├── features/                 # STATEFUL, domain-aware feature modules
│   │   │   │
│   │   │   ├── Analytics/
│   │   │   │   ├── ClicksChart/
│   │   │   │   │   ├── ClicksChart.css
│   │   │   │   │   └── ClicksChart.js
│   │   │   │   ├── EngagementPanel/
│   │   │   │   │   ├── EngagementPanel.css
│   │   │   │   │   └── EngagementPanel.js
│   │   │   │   ├── StatsDateFilter/
│   │   │   │   │   ├── StatsDateFilter.css
│   │   │   │   │   └── StatsDateFilter.js
│   │   │   │   ├── TopUrlsPanel/
│   │   │   │   │   ├── TopUrlsPanel.css
│   │   │   │   │   └── TopUrlsPanel.js
│   │   │   │   ├── UserOverviewCards/
│   │   │   │   │   ├── UserOverviewCards.css
│   │   │   │   │   └── UserOverviewCards.js
│   │   │   │   └── components/       # Lightweight panels without own CSS
│   │   │   │       ├── DevicesPanel.js
│   │   │   │       ├── GeoPanel.js
│   │   │   │       ├── StatsOverviewCards.js
│   │   │   │       └── TrafficPanel.js
│   │   │   │
│   │   │   ├── Auth/
│   │   │   │   └── AuthForm/
│   │   │   │       ├── AuthForm.css
│   │   │   │       └── AuthForm.js
│   │   │   │
│   │   │   ├── Home/
│   │   │   │   └── components/
│   │   │   │       └── StatCard.js
│   │   │   │
│   │   │   ├── Links/
│   │   │   │   ├── components/
│   │   │   │   │   ├── FiltersBar/
│   │   │   │   │   │   ├── FiltersBar.css
│   │   │   │   │   │   └── FiltersBar.js
│   │   │   │   │   ├── FloatingBulkActionsBar/
│   │   │   │   │   │   ├── FloatingBulkActionsBar.css
│   │   │   │   │   │   └── FloatingBulkActionsBar.js
│   │   │   │   │   ├── LinkCard/
│   │   │   │   │   │   ├── LinkCard.css
│   │   │   │   │   │   └── LinkCard.js
│   │   │   │   │   ├── LinkEmptyState/
│   │   │   │   │   │   ├── LinkEmptyState.css
│   │   │   │   │   │   └── LinkEmptyState.js
│   │   │   │   │   ├── LinksList.js
│   │   │   │   │   └── RecentLinkCard.js
│   │   │   │   ├── forms/
│   │   │   │   │   └── LinkForm.css  # Shared form field tokens for link forms
│   │   │   │   └── modals/
│   │   │   │       ├── ConfirmModal/
│   │   │   │       │   ├── ConfirmModal.css
│   │   │   │       │   └── ConfirmModal.js
│   │   │   │       ├── BulkExpirationModal.js
│   │   │   │       ├── CreateLinkModal.js
│   │   │   │       └── EditLinkModal.js
│   │   │   │
│   │   │   ├── Profile/
│   │   │   │   ├── ProfileEditForm/
│   │   │   │   │   ├── ProfileEditForm.css
│   │   │   │   │   └── ProfileEditForm.js
│   │   │   │   ├── ProfileHeaderCard/
│   │   │   │   │   ├── ProfileHeaderCard.css
│   │   │   │   │   └── ProfileHeaderCard.js
│   │   │   │   └── QuotaStatusCard/
│   │   │   │       ├── QuotaStatusCard.css
│   │   │   │       └── QuotaStatusCard.js
│   │   │   │
│   │   │   └── Settings/
│   │   │       ├── components/       # Form components without own folders
│   │   │       │   ├── ChangeEmailForm.js
│   │   │       │   └── ChangePasswordForm.js
│   │   │       ├── DangerZoneCard/
│   │   │       │   ├── DangerZoneCard.css
│   │   │       │   └── DangerZoneCard.js
│   │   │       ├── EmailVerificationCard/
│   │   │       │   ├── EmailVerificationCard.css
│   │   │       │   └── EmailVerificationCard.js
│   │   │       ├── SecurityStatusCard/
│   │   │       │   ├── SecurityStatusCard.css
│   │   │       │   └── SecurityStatusCard.js
│   │   │       └── SettingsForm/
│   │   │           └── SettingsForm.css  # Shared .sf-* field styles
│   │   │
│   │   ├── layouts/                  # Page shell wrappers
│   │   │   ├── Dashboard/
│   │   │   │   ├── DashboardLayout.css
│   │   │   │   └── DashboardLayout.js
│   │   │   └── LandingLayout.js
│   │   │
│   │   └── pages/                    # Route-level view orchestrators only
│   │       ├── BasePage.js
│   │       ├── AnalyticsPage/
│   │       │   ├── AnalyticsPage.css
│   │       │   ├── AnalyticsPage.html
│   │       │   └── AnalyticsPage.js
│   │       ├── AuthPages/            # Grouped: Login, Register, ForgotPassword
│   │       │   ├── AuthPages.css     # Shared styles for all auth pages
│   │       │   ├── ForgotPasswordPage/
│   │       │   │   ├── ForgotPasswordPage.html
│   │       │   │   └── ForgotPasswordPage.js
│   │       │   ├── LoginPage/
│   │       │   │   ├── LoginPage.html
│   │       │   │   └── LoginPage.js
│   │       │   └── RegisterPage/
│   │       │       ├── RegisterPage.html
│   │       │       └── RegisterPage.js
│   │       ├── HomePage/
│   │       │   ├── HomePage.css
│   │       │   ├── HomePage.html
│   │       │   └── HomePage.js
│   │       ├── LandingPage/
│   │       │   ├── LandingPage.css
│   │       │   ├── LandingPage.html
│   │       │   └── LandingPage.js
│   │       ├── LinksPage/
│   │       │   ├── LinksPage.css
│   │       │   ├── LinksPage.html
│   │       │   └── LinksPage.js
│   │       ├── LinkStatsPage/
│   │       │   ├── LinkStatsPage.css
│   │       │   ├── LinkStatsPage.html
│   │       │   └── LinkStatsPage.js
│   │       ├── ProfilePage/
│   │       │   ├── ProfilePage.css
│   │       │   ├── ProfilePage.html
│   │       │   └── ProfilePage.js
│   │       └── SettingsPage/
│   │           ├── SettingsPage.css
│   │           ├── SettingsPage.html
│   │           └── SettingsPage.js
│   │
│   ├── utils/                        # Pure, stateless helper functions
│   │   ├── ChartLoader.js            # Lazy-loads ApexCharts on demand
│   │   ├── Countries.js              # Country code/name lookup table
│   │   ├── dom.js                    # DOM query helpers
│   │   ├── formatting.js             # Date, number, URL formatters
│   │   ├── SafeLogger.js             # Environment-aware console wrapper
│   │   ├── storage.js                # localStorage/sessionStorage abstractions
│   │   ├── ui-logic.js               # Shared non-DOM UI calculations
│   │   ├── uiEventManager.js         # Delegated DOM event manager
│   │   └── validation.js             # Form validation rules
│   │
│   └── main.js                       # Application entry point — wiring only
│
├── styles/                           # Global styles ONLY — no component CSS here
│   ├── core/
│   │   ├── reset.css                 # Browser normalization
│   │   ├── variables.css             # CSS custom properties (design tokens)
│   │   └── typography.css            # Base font, scale, line-height
│   ├── fontawesome/                  # Icon font assets
│   ├── layout/
│   │   ├── animates.css              # Global keyframe animations
│   │   ├── cards.css                 # Shared card shell styles
│   │   ├── container.css             # Page width & centering utilities
│   │   ├── forms.css                 # Generic form layout primitives
│   │   ├── grid.css                  # Display & position utility classes
│   │   └── Model.css                 # Global modal overlay shell
│   └── main.css                      # Import-only entry point — zero rules
│
├── .env                              # Local overrides (gitignored)
├── .env.development                  # Development environment values
├── .env.production                   # Production environment values
├── index.html                        # Webpack HTML template
├── package.json
├── package-lock.json
└── webpack.config.js
```

---

## 6. Layer-by-Layer Breakdown

### 6.1 Bootstrap — `src/app/`

The bootstrap layer runs **once** at application startup. Its job is to wire all dependencies together and start the application — it contains zero business logic.

| File | Responsibility |
|---|---|
| `Application.js` | Orchestrates the startup sequence. Instantiates all services, passes them into the Router, and calls `router.start()`. |
| `Router.js` | Maps URL paths to Page classes. Listens to `popstate` and link clicks. Calls `page.mount()` on navigation and `page.unmount()` on departure. Caches HTML templates after first fetch. |
| `EventBus.js` | Global pub/sub hub. Services emit domain events (`link:created`, `auth:logout`). Pages and components subscribe. Neither side knows the other exists. |

**Rules:**
- `app/` may import from `config/` and `utils/` only
- `app/` must never contain business logic
- `app/` must never import from `ui/`, `services/`, or `store/`

### 6.2 Configuration — `src/config/`

Static, read-only configuration values. These files contain no logic — only constants.

| File | Contains |
|---|---|
| `api.config.js` | `BASE_URL`, request timeout, endpoint path constants |
| `app.config.js` | Feature flags, pagination defaults, app-level constants |
| `routes.config.js` | Route map: `{ path, PageClass, requiresAuth, layout }` |

**Rule:** If a value could change between environments, it belongs in `.env.*`, not here.

### 6.3 Infrastructure — `src/infrastructure/`

All I/O lives here. The infrastructure layer is the only place allowed to make HTTP requests.

**`ApiClient.js`** — The base HTTP client. All `*Api.js` files extend or delegate to this class. Responsibilities:
- Attaches `Authorization: Bearer <token>` headers automatically
- Implements retry logic with exponential back-off
- Normalises HTTP errors into `ApiError` instances
- Returns plain JS objects — never `Response` instances

**`ApiError.js`** — A typed error class that carries `status`, `code`, and `message` fields. Services catch this and decide what to do (show a toast, redirect to login, etc.).

**Domain API files** (`AuthApi.js`, `LinksApi.js`, etc.):
- Each file owns exactly one API domain
- Methods return plain JS objects — all transformation happens here
- No business logic — if you find yourself writing `if (data.isExpired)`, move it to the service

```js
// ✅ CORRECT — Infrastructure transforms raw HTTP → plain object
class LinksApi {
  async getLinks(params) {
    const raw = await this.client.get('/links', { params });
    return {
      items: raw.data,
      total: raw.meta.total,
      page:  raw.meta.page,
    };
  }
}
```

### 6.4 Services — `src/services/`

The business logic layer. Services are pure JavaScript classes — they have no awareness of the DOM, no knowledge of React/Vue/any UI, and they never import from `ui/`.

**What services do:**
- Implement domain rules and validation
- Call infrastructure to fetch/persist data
- Dispatch state updates via `store.dispatch()`
- Emit domain events via `eventBus.emit()`
- Cache frequently accessed data

**Service index:**

| Service | Responsibility |
|---|---|
| `AuthService` | Login, logout, token refresh, registration, password reset |
| `LinksService` | CRUD for short links, bulk operations, expiration management |
| `AnalyticsService` | Fetches click data, geographic breakdowns, device/traffic analytics |
| `ProfileService` | Reads and updates user profile data |
| `SettingsService` | Email/password changes, account deletion |
| `ToastService` | Writes to the `ui` store slice to trigger toast notifications |
| `TokenManager` | Handles JWT storage, refresh timing, and expiry detection |

```js
// Example: LinksService.deleteLink
async deleteLink(id) {
  await this.linksApi.deleteLink(id);            // 1. Call infrastructure
  this.store.dispatch('links', prev => ({        // 2. Write to store
    ...prev,
    links: prev.links.filter(l => l.id !== id),
  }));
  this.eventBus.emit('link:deleted', { id });    // 3. Emit domain event
}
```

### 6.5 Store — `src/store/`

The store is the single source of truth for all application state. It is a lightweight observable pattern — approximately 40 lines of core logic.

**`Store.js`** provides three methods:

```js
store.dispatch('links', updater);        // Write: calls updater(currentState), saves result, notifies subscribers
store.getState('links');                 // Read: returns a deep clone (structuredClone) — never a reference
const unsub = store.subscribe('links', callback); // Subscribe: returns an unsubscribe function
```

**Store slices:**

| Slice | Owns | Written by | Read by |
|---|---|---|---|
| `auth` | User identity, token, auth status | `AuthService`, `TokenManager` | Header, UserDropdown, all pages (auth guard) |
| `links` | Links list, pagination, filters | `LinksService` | LinksPage, HomePage (recent links) |
| `analytics` | Click data, breakdowns, date range | `AnalyticsService` | All analytics feature components |
| `profile` | User profile, quota data | `ProfileService` | ProfilePage, ProfileHeaderCard, QuotaStatusCard |
| `settings` | Settings panel state | `SettingsService` | SettingsPage |

**Critical rule:** No component ever stores business data in instance variables. Components hold only transient UI state: `isOpen`, `isHovered`, `activeTab`. Everything else lives in the store.

### 6.6 UI — `src/ui/`

The UI layer is the largest layer and is subdivided into five zones:

#### `base/`
`BaseComponent.js` defines the lifecycle contract that all components and pages extend:

```js
class BaseComponent {
  constructor(props) { this.props = props; }
  mount()   {}  // Attach to DOM, add listeners, subscribe to store
  update()  {}  // Re-render on state change
  unmount() {}  // Remove listeners, unsubscribe from store
  destroy() {}  // Free all resources
}
```

#### `components/` — Domain-agnostic UI primitives

These components **know nothing about Shortly's business domain**. They accept generic props and emit DOM events upward. They never import from `services/` or `store/`.

Sub-categories:

- **`primitives/`** — Atoms: Button, Input, LoadingSpinner, Pagination, Table. These are the lowest level UI building blocks.
- **`feedback/`** — Alert and Toast notification components.
- **`navigation/`** — Header (public landing nav), UserDropdown (authenticated user menu).
- **`DashboardPageHeader/`** — The reusable chrome bar that appears at the top of every authenticated page (title, breadcrumbs, action button slot).

#### `features/` — Domain-aware stateful modules

Features know about Shortly's domain (links, analytics, users). They subscribe to store slices, call services via `eventBus`, and render domain-specific data.

**Feature isolation rule:** Feature A may never import from Feature B. If two features need to share data, they read from the same store slice.

Feature directories:

| Feature | Components | Notes |
|---|---|---|
| `Analytics/` | ClicksChart, EngagementPanel, StatsDateFilter, TopUrlsPanel, UserOverviewCards, + 4 panel components | Subscribes to `analytics` slice |
| `Auth/` | AuthForm | Handles login/register/forgot password forms |
| `Home/` | StatCard | KPI cards on the dashboard home |
| `Links/` | FiltersBar, FloatingBulkActionsBar, LinkCard, LinkEmptyState, LinksList, RecentLinkCard, + modals | Subscribes to `links` slice |
| `Profile/` | ProfileEditForm, ProfileHeaderCard, QuotaStatusCard | Subscribes to `profile` and `auth` slices |
| `Settings/` | ChangeEmailForm, ChangePasswordForm, DangerZoneCard, EmailVerificationCard, SecurityStatusCard, SettingsForm | Subscribes to `auth` and `settings` slices |

#### `layouts/`

Layout shells define the structural chrome shared across multiple pages.

- **`Dashboard/DashboardLayout.js`** — The authenticated shell: fixed sidebar, sticky top header, content area, mobile hamburger. All dashboard pages live inside this shell.
- **`LandingLayout.js`** — The public shell: transparent-to-scrolled header, full-width hero area, footer.

#### `pages/`

Pages are route-level orchestrators. They are thin by design — their only job is to:
1. Receive a route activation from the Router
2. Mount the correct feature components into the correct DOM slots
3. Trigger data loading by calling services
4. Unmount all children when the route changes

**Pages must never contain business logic.** If a page grows beyond ~100 lines, extract the logic into a feature component or service.

**`AuthPages/`** is a special group — `LoginPage`, `RegisterPage`, and `ForgotPasswordPage` share layout and styling (`AuthPages.css`) so they live under a common parent folder.

### 6.7 Utilities — `src/utils/`

Pure, stateless helper functions usable by any layer. Zero dependencies on any other `src/` module.

| Utility | Purpose |
|---|---|
| `ChartLoader.js` | Dynamically `import()`s ApexCharts only when a chart component mounts. The library never appears in the main bundle. |
| `Countries.js` | Static lookup table mapping ISO country codes to display names. Used by GeoPanel. |
| `dom.js` | `qs()`, `qsa()`, `on()`, `off()` — thin wrappers around native DOM APIs for concise query syntax. |
| `formatting.js` | Date, number, URL, duration formatters. All are pure functions with deterministic output. |
| `SafeLogger.js` | Wraps `console.*` — silences output in production, adds `[Shortly]` prefix in development. |
| `storage.js` | Typed wrappers around `localStorage` and `sessionStorage` with JSON serialisation and error handling. |
| `ui-logic.js` | Calculations that inform UI state but produce no side effects (e.g., computing pagination ranges, truncating strings). |
| `uiEventManager.js` | Provides `add(element, event, handler)` and `removeAll()` — tracks all listeners added during a component's life so `unmount()` can cleanly remove every one with a single call. |
| `validation.js` | Form field validation rules (`isEmail`, `isStrongPassword`, `isValidUrl`). Returns `{ valid, message }`. |

### 6.8 Global Styles — `styles/`

Global styles hold design tokens and structural styles that survive the deletion of any individual component.

| File | Contains | Rule |
|---|---|---|
| `core/reset.css` | Browser normalisation | Global — no component owner |
| `core/variables.css` | All CSS custom properties (`--primary-gradient`, `--radius-md`, etc.) | Global — design tokens |
| `core/typography.css` | Body font, heading scale, base line-height | Global — page-level |
| `layout/animates.css` | Shared `@keyframes` used across multiple components | Global — no single owner |
| `layout/cards.css` | The glassmorphism card shell used everywhere | Global — structural |
| `layout/container.css` | `.container`, `.centered-container`, spacing utilities | Global — layout primitive |
| `layout/forms.css` | Generic form layout wrappers (`form-base`, `form-group`) | Global — structural |
| `layout/grid.css` | Display utilities (`.flex`, `.hidden`, `.grid`) | Global — utility classes |
| `layout/Model.css` | Modal overlay and animation shell | Global — shared across all modal use cases |
| `main.css` | `@import` declarations only — **zero CSS rules defined here** | Entry point |

**The co-location rule:** If deleting a component should also delete its styles, those styles belong next to the component's `.js` file — not here.

---

## 7. Component Architecture

### Smart vs. Dumb Components

| Trait | Dumb (Primitive) | Smart (Feature) |
|---|---|---|
| Location | `src/ui/components/` | `src/ui/features/` |
| Domain knowledge | None | Yes — knows about links, users, etc. |
| Store access | Never | Yes — subscribes to relevant slices |
| Service calls | Never | Via EventBus or injected dependency |
| Reusability | Across the entire app | Within its own feature domain |
| Props | Generic (`label`, `variant`, `disabled`) | Domain-typed (`link`, `analytics`) |

### Component Communication Patterns

There are three ways components communicate. Use the right one for the right situation.

```
  ┌─────────────────────────────────────────────────────────────────────────┐
  │  CHANNEL 1: Props / Callbacks (parent → child, child → parent)          │
  │  Use when: direct parent/child relationship                              │
  │                                                                          │
  │  parent.js                         child.js                             │
  │  ─────────                         ────────                             │
  │  child.render({ label, onClick })  emit('click', payload)               │
  │                                                                          │
  │  ✓ Simple, explicit, traceable     ✗ Does not scale past 2 levels       │
  └─────────────────────────────────────────────────────────────────────────┘

  ┌─────────────────────────────────────────────────────────────────────────┐
  │  CHANNEL 2: EventBus (decoupled cross-layer communication)              │
  │  Use when: a feature component needs to trigger a service action        │
  │                                                                          │
  │  LinkCard.js                       LinksService.js                      │
  │  ─────────                         ───────────────                      │
  │  eventBus.emit('link:delete', id)  eventBus.on('link:delete', ...)      │
  │                                                                          │
  │  ✓ No direct import dependency     ✗ Harder to trace (search for event) │
  └─────────────────────────────────────────────────────────────────────────┘

  ┌─────────────────────────────────────────────────────────────────────────┐
  │  CHANNEL 3: Store (shared state between unrelated components)           │
  │  Use when: two components need the same data but have no relationship   │
  │                                                                          │
  │  LinksService.js                   RecentLinkCard.js (HomePage)         │
  │  ─────────────                     ─────────────────────────────        │
  │  store.dispatch('links', updater)  store.subscribe('links', render)     │
  │                                                                          │
  │  ✓ Single source of truth          ✗ Overkill for simple parent/child   │
  └─────────────────────────────────────────────────────────────────────────┘
```

### Component Lifecycle

```
  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
  │   Created    │────▶│   mounted    │────▶│   Updated    │────▶│  Unmounted   │
  │              │     │              │     │              │     │              │
  │ constructor  │     │ mount()      │     │ update()     │     │ unmount()    │
  │ sets props   │     │ renders HTML │     │ re-renders   │     │ removes all  │
  │              │     │ adds listeners     │ on store     │     │ listeners &  │
  │              │     │ subscribes   │     │ change       │     │ subscriptions│
  └──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
                                                                        │
                                                                        ▼
                                                                  ┌──────────────┐
                                                                  │  Destroyed   │
                                                                  │              │
                                                                  │ destroy()    │
                                                                  │ frees all    │
                                                                  │ resources    │
                                                                  └──────────────┘
```

**Memory leak prevention pattern:**

```js
class LinksTable extends BaseComponent {
  #unsubscribeStore = null;
  #unsubscribeEvents = [];

  mount() {
    this.#unsubscribeStore = this.store.subscribe('links', state => this.update(state));
    this.#unsubscribeEvents.push(
      this.eventBus.on('link:deleted', ({ id }) => this.removeRow(id))
    );
  }

  unmount() {
    this.#unsubscribeStore?.();              // Remove store subscription
    this.#unsubscribeEvents.forEach(fn => fn()); // Remove all event listeners
    this.#unsubscribeEvents = [];
  }
}
```

---

## 8. State Management

### Pattern: Observable Slices

The store is a custom, framework-free observable. It is intentionally minimal — the entire core is ~40 lines.

```
  dispatch(slice, updater)
       │
       ├── 1. Calls updater(currentState)
       ├── 2. Replaces the slice with the new state
       └── 3. Calls all subscribers with (newState, prevState)

  getState(slice)
       └── Returns structuredClone(state[slice]) — always a copy, never a reference

  subscribe(slice, callback)
       └── Returns an unsubscribe function — always store the return value
```

### State Ownership Map

```
  SLICE         WRITTEN BY                  READ BY
  ─────────────────────────────────────────────────────────────────────────
  auth          AuthService                 UserDropdown, Header,
                TokenManager                ProfileHeaderCard,
                                            SecurityStatusCard,
                                            QuotaStatusCard,
                                            All pages (auth guard)

  links         LinksService                LinkCard, LinksList,
                                            FloatingBulkActionsBar,
                                            FiltersBar, RecentLinkCard,
                                            HomePage (recent links)

  analytics     AnalyticsService            UserOverviewCards, ClicksChart,
                                            TrafficPanel, DevicesPanel,
                                            GeoPanel, EngagementPanel,
                                            TopUrlsPanel, StatsDateFilter

  profile       ProfileService              ProfilePage, ProfileHeaderCard,
                                            QuotaStatusCard

  settings      SettingsService             SettingsPage and all settings cards
```

### Anti-Patterns

```js
// ❌ Component storing business data in instance state
class LinkCard extends BaseComponent {
  constructor() {
    this.links = []; // WRONG — this belongs in the store
  }
}

// ❌ Two components syncing directly
linksList.on('update', data => otherComponent.setData(data)); // WRONG

// ❌ Service reading from the DOM to decide what to dispatch
class LinksService {
  async refresh() {
    const page = document.querySelector('.pagination').dataset.page; // WRONG
  }
}

// ✅ Correct — read from store, write to store
class LinksService {
  async refresh() {
    const { currentPage } = this.store.getState('links');
    const data = await this.linksApi.getLinks({ page: currentPage });
    this.store.dispatch('links', prev => ({ ...prev, ...data }));
  }
}
```

---

## 9. API & Data Layer

### Request Flow

```
  Page/Feature Component
       │
       │  eventBus.emit('links:refresh') or direct service call
       ▼
  Service (e.g., LinksService)
       │
       │  this.linksApi.getLinks(params)
       ▼
  *Api class (e.g., LinksApi)
       │
       │  this.client.get('/links', { params })
       ▼
  ApiClient
       │  ├── Attaches Authorization header
       │  ├── Applies timeout
       │  └── fetch(url, options)
       ▼
  Network / Backend API
       │
       ▼
  ApiClient (response path)
       │  ├── Checks status code
       │  ├── On error → throws ApiError(status, code, message)
       │  └── On success → returns raw JSON
       ▼
  *Api class (transforms response)
       │  └── Maps raw JSON → plain domain object
       ▼
  Service (handles business logic)
       │  ├── Dispatches to store
       │  └── Emits domain events
       ▼
  Store → notifies all subscribers → components re-render
```

### Error Handling Strategy

Errors are handled at the **service layer**, not in components.

```js
// ✅ Services catch and classify errors
class AuthService {
  async login(email, password) {
    try {
      const { token, user } = await this.authApi.login(email, password);
      this.store.dispatch('auth', prev => ({ ...prev, user, token, isAuthenticated: true }));
      this.eventBus.emit('auth:login:success');
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 401) {
          this.eventBus.emit('auth:login:invalid-credentials');
        } else if (err.status === 429) {
          this.toastService.error('Too many attempts. Please wait.');
        } else {
          this.toastService.error('Login failed. Please try again.');
        }
      }
      throw err; // Re-throw so the caller can update UI state if needed
    }
  }
}
```

**Rules:**
- Never `console.error` directly from a service — use `SafeLogger` or emit an event
- Never show error UI from inside a service — emit an event, let the component decide
- Never swallow errors silently — at minimum, log them via `SafeLogger`
- `ApiError` always carries `status`, `code`, and `message` — use `status` for routing decisions

---

## 10. Styling Architecture

### Strategy: Global Tokens + Co-located Component Styles

```
  styles/                  ← Global design system — shared tokens & structural shell
  └── core/variables.css   ← Single source for all design tokens

  src/ui/features/Links/LinkCard/
  ├── LinkCard.js
  └── LinkCard.css          ← All styles specific to this component live here
```

### Design Token System

All colours, gradients, shadows, radii, transitions, and z-index values are CSS custom properties defined in `styles/core/variables.css`. Component CSS uses these tokens, never raw values.

```css
/* ✅ Correct — uses token */
.link-card { border-radius: var(--radius-md); }

/* ❌ Wrong — hardcoded value */
.link-card { border-radius: 12px; }
```

### The Co-location Decision Rule

> **"If I delete this component, should these styles disappear too?"**
> - **YES** → CSS belongs next to the `.js` file
> - **NO** → CSS belongs in `styles/core/` or `styles/layout/`

### Global Layout Files (in `styles/layout/`)

| File | Contains | Why Global |
|---|---|---|
| `animates.css` | Shared `@keyframes` (fadeIn, slideUp, shimmer) | Used by many unrelated components |
| `cards.css` | `.card` glassmorphism shell | Every domain uses this pattern |
| `container.css` | `.container`, `.centered-container` | Page-level layout, not component-specific |
| `forms.css` | `.form-base`, `.form-group` layout wrappers | Shared across auth, profile, settings |
| `grid.css` | `.flex`, `.hidden`, `.grid` utilities | Domain-agnostic display helpers |
| `Model.css` | `.modal-overlay`, `.modal-container` | One modal shell serves all domains |

### Naming Convention

Component CSS uses lowercase kebab-case BEM-inspired naming with component-specific prefixes to avoid collisions:

```css
/* LinkCard component */
.link-card { }
.link-card__title { }
.link-card__meta { }
.link-card--selected { }

/* ProfileEditForm — uses .pef- prefix */
.pef-form { }
.pef-field { }
.pef-label { }

/* Settings cards — uses .sf- prefix for shared fields */
.sf-field { }
.sf-label { }
```

---

## 11. Routing & Navigation

### Route Configuration

All routes are defined in `src/config/routes.config.js` as a flat array:

```js
export const routes = [
  { path: '/',             PageClass: LandingPage,       requiresAuth: false, layout: 'landing'   },
  { path: '/login',        PageClass: LoginPage,         requiresAuth: false, layout: 'landing'   },
  { path: '/register',     PageClass: RegisterPage,      requiresAuth: false, layout: 'landing'   },
  { path: '/forgot',       PageClass: ForgotPasswordPage,requiresAuth: false, layout: 'landing'   },
  { path: '/home',         PageClass: HomePage,          requiresAuth: true,  layout: 'dashboard' },
  { path: '/links',        PageClass: LinksPage,         requiresAuth: true,  layout: 'dashboard' },
  { path: '/links/:id',    PageClass: LinkStatsPage,     requiresAuth: true,  layout: 'dashboard' },
  { path: '/analytics',    PageClass: AnalyticsPage,     requiresAuth: true,  layout: 'dashboard' },
  { path: '/profile',      PageClass: ProfilePage,       requiresAuth: true,  layout: 'dashboard' },
  { path: '/settings',     PageClass: SettingsPage,      requiresAuth: true,  layout: 'dashboard' },
];
```

### Navigation Flow

```
  User navigates (link click or browser back/forward)
       │
       ▼
  Router intercepts
       │
       ├── Checks requiresAuth → redirects to /login if not authenticated
       │
       ├── Mounts the correct layout (DashboardLayout or LandingLayout)
       │
       ├── Calls previousPage.unmount()
       │
       └── Calls newPage.mount()
                 │
                 ├── Page calls service.loadData()
                 ├── Page mounts feature components
                 └── Components subscribe to store slices
```

### Template Caching

The Router fetches `.html` template files on first navigation and caches them in memory. Subsequent visits to the same route use the cached template — no repeat network requests.

### Auth Guard

```js
// Simplified router guard logic
if (route.requiresAuth && !store.getState('auth').isAuthenticated) {
  router.navigate('/login');
  return;
}
```

---

## 12. Data Flow Diagrams

### Full Unidirectional Flow

```
  ┌──────────────────────────────────────────────────────────────────────────┐
  │  USER INTERACTION  (click · type · submit · navigate)                    │
  └───────────────────────────────┬──────────────────────────────────────────┘
                                  │
                                  ▼
                    ┌─────────────────────────┐
                    │   Feature Component      │
                    │   or Page Controller     │
                    │                          │
                    │  Receives DOM event.     │
                    │  Calls service or emits. │
                    └────────────┬────────────┘
                                 │ service.deleteLink(id)
                                 ▼
                    ┌─────────────────────────┐
                    │      Service             │
                    │                          │
                    │  Executes business logic.│
                    │  Calls infrastructure.   │
                    └────────────┬────────────┘
                                 │ linksApi.deleteLink(id)
                                 ▼
                    ┌─────────────────────────┐
                    │   Infrastructure (HTTP)  │
                    │                          │
                    │  Makes fetch() request.  │
                    │  Returns plain object.   │
                    └────────────┬────────────┘
                                 │ { success: true }
                                 ▼
                    ┌─────────────────────────┐
                    │      Service             │
                    │                          │
                    │  store.dispatch('links', │
                    │    prev => ({            │
                    │      ...prev,            │
                    │      links: prev.links   │
                    │        .filter(...)      │
                    │    })                    │
                    │  );                      │
                    └────────────┬────────────┘
                                 │ store notifies all subscribers
                                 ▼
                    ┌─────────────────────────┐
                    │  LinksTable Component    │
                    │  (store subscriber)      │
                    │                          │
                    │  Receives new state.     │
                    │  Calls this.update().    │
                    │  Re-renders the list.    │
                    └─────────────────────────┘
```

### EventBus Communication Model

```
  ┌───────────────┐    emit('link:created', data)    ┌──────────────────┐
  │  CreateLink   │  ──────────────────────────────▶ │  ToastService    │
  │  Modal        │                                   │  (.on handler)   │
  └───────────────┘                                   └──────────────────┘
                                                               │
                                                               │ shows success toast
                                                               ▼
  ┌───────────────┐    emit('link:created', data)    ┌──────────────────┐
  │  CreateLink   │  ──────────────────────────────▶ │  LinksTable      │
  │  Modal        │                                   │  (.on handler)   │
  └───────────────┘                                   └──────────────────┘
                                                               │
                                                               │ adds row to list
                                                               ▼
                                                       DOM updates

  → Both handlers receive the same event.
  → Neither the modal nor the toast knows the other exists.
  → Neither the modal nor the service knows what UI components are listening.
```

---

## 13. Performance Optimization

### Chart Lazy Loading

ApexCharts is a large library (~400KB). It is **never included in the main bundle**. `ChartLoader.js` uses dynamic `import()` to load it on demand only when a chart component mounts:

```js
// utils/ChartLoader.js
export async function loadApexCharts() {
  if (window.ApexCharts) return window.ApexCharts;
  const { default: ApexCharts } = await import('apexcharts');
  window.ApexCharts = ApexCharts;
  return ApexCharts;
}

// In ClicksChart.js
async mount() {
  const ApexCharts = await loadApexCharts();
  this.chart = new ApexCharts(this.el, this.options);
  await this.chart.render();
}
```

This guarantees that users who never visit the Analytics page never download the chart library.

### Template Caching

The Router caches HTML templates in memory after the first fetch. This eliminates repeat network requests on navigation and makes subsequent page loads instant.

### Store Subscription Granularity

Subscribe only to the slice your component needs. Never subscribe to the entire store.

```js
// ❌ Wrong — subscribes to everything
store.subscribe('*', state => this.update(state.links));

// ✅ Correct — subscribes only to what this component needs
this.#unsub = store.subscribe('links', state => this.update(state));
```

### Skeleton Loading

All data-fetching components render a skeleton placeholder immediately, before the async call resolves. This prevents layout shift and gives immediate visual feedback.

```js
mount() {
  this.el.innerHTML = this.renderSkeleton(); // Immediate
  this.loadData().then(data => {
    this.el.innerHTML = this.render(data);   // After fetch
  });
}
```

### Memory Leak Prevention

Every `store.subscribe()` and `eventBus.on()` returns an unsubscribe function. These are always stored and called in `unmount()`. This is a code-review requirement — any PR that adds a subscription without a matching cleanup is rejected.

### Webpack Code Splitting

Webpack is configured to split the output into:
- `main.[hash].js` — Application code
- `vendors.[hash].js` — Third-party dependencies (deduplicated)
- `vendor-apexcharts.[hash].js` — ApexCharts (loaded only when needed)

This maximises long-term cache hits — vendor code rarely changes, so browsers serve it from cache on return visits.

---

## 14. Scalability Guidelines

### Adding a New Primitive Component

1. Create `src/ui/components/primitives/MyComponent/`
2. Create `MyComponent.js` extending `BaseComponent`
3. Create `MyComponent.css` in the same folder
4. **Verify it contains zero domain knowledge before committing**
5. Import in the appropriate global `main.css` section

### Adding a New Feature Component

1. Identify the domain: `Analytics`, `Links`, `Profile`, `Settings`, or `Home`
2. Create `src/ui/features/<Domain>/MyComponent/`
3. Create `MyComponent.js` and `MyComponent.css`
4. Subscribe to the relevant store slice in `mount()`; unsubscribe in `unmount()`
5. Never import from another feature's directory

### Adding a New Page

1. Create `src/ui/pages/MyPage/` with `MyPage.js`, `MyPage.html`, and `MyPage.css`
2. Extend `BasePage` and implement `mount()` and `unmount()`
3. Register the route in `src/config/routes.config.js`
4. Keep page files under ~100 lines — if they grow beyond this, extract logic into feature components

### Adding a New API Domain

1. Create `src/infrastructure/http/MyDomainApi.js`
2. Inject `ApiClient` in the constructor
3. Methods must return plain JS objects — no `Response` instances
4. No business logic — transformations only

### Adding a New Store Slice

1. Create `src/store/slices/mydomain.slice.js` with the initial state shape
2. Export and compose it into `src/store/index.js`
3. Services write to it; components subscribe to it

### Adding a New Service

1. Create `src/services/MyDomainService.js`
2. Inject `*Api`, `store`, and `eventBus` in the constructor
3. Never access the DOM
4. Write to the relevant store slice using `store.dispatch()`
5. Wire it in `src/app/Application.js`

### Feature Isolation Checklist

Before committing a new feature, verify:
- [ ] The feature folder contains its own CSS files
- [ ] No imports from other feature directories
- [ ] All subscriptions have matching unsubscribes in `unmount()`
- [ ] Business logic lives in a service, not the component
- [ ] No direct `fetch()` calls — everything goes through `*Api` classes

---

## 15. Best Practices & Conventions

### Naming Conventions

| Artefact | Convention | Example |
|---|---|---|
| Class files | PascalCase | `LinksService.js`, `LinkCard.js` |
| Utility files | camelCase | `formatting.js`, `dom.js` |
| CSS files | PascalCase (matching component) | `LinkCard.css` |
| CSS classes | kebab-case | `.link-card`, `.filter-popover` |
| Store slices | camelCase | `links.slice.js` |
| EventBus events | `domain:action` | `link:created`, `auth:logout` |
| Config constants | SCREAMING_SNAKE_CASE | `BASE_URL`, `REQUEST_TIMEOUT` |

### File Structure Rules

- One class per file
- If a component needs a CSS file, it lives in the same folder
- HTML templates (`.html`) live in the page folder they serve
- Slice files define only the initial state shape — no reducer logic inside them

### Do's and Don'ts

| ✅ Do | ❌ Don't |
|---|---|
| Inject dependencies through the constructor | Read from `window` or use globals |
| Store the return value of `subscribe()` | Subscribe without storing the unsubscribe function |
| Use `SafeLogger` for all debug output | Use `console.log` directly |
| Use CSS custom properties for all visual tokens | Hardcode colour or size values |
| Keep pages under ~100 lines | Put business logic in page files |
| Emit events to trigger cross-layer actions | Import UI modules from services |
| Use `structuredClone` for state reads | Mutate the state object directly |
| Handle all API errors in the service | Let raw HTTP errors bubble to the UI |
| Write pure functions in `utils/` | Add side effects to utility functions |
| Group auth pages under `AuthPages/` | Scatter related pages across unrelated directories |

---

## 16. Developer Onboarding Guide

### Step 1 — Understand the mental model (30 minutes)

Read these three things in order:
1. Section 2 of this document (Guiding Principles)
2. Section 3 (Full Layer Stack diagram)
3. Section 4 (Dependency Rules)

By the end, you should be able to answer: *"If a user clicks Delete on a link, what files are involved and in what order?"*

The answer: `LinkCard.js` (event) → `eventBus` → `LinksService.js` (business logic) → `LinksApi.js` (HTTP) → `store.dispatch('links', ...)` → `LinksTable.js` (re-renders).

### Step 2 — Trace one feature end-to-end (30 minutes)

Open these files in order and read them:
1. `src/config/routes.config.js` — find the `/links` route
2. `src/ui/pages/LinksPage/LinksPage.js` — how does the page mount?
3. `src/ui/features/Links/components/LinkCard/LinkCard.js` — how does one card render?
4. `src/services/LinksService.js` — how does delete work?
5. `src/infrastructure/http/LinksApi.js` — what HTTP call does it make?
6. `src/store/slices/links.slice.js` — what is the initial state shape?

### Step 3 — Run the project locally (10 minutes)

```bash
git clone <repo-url>
cd Shortly_Frontend
npm install
cp .env.development .env
npm run dev
```

The dev server starts at `https://localhost:8080`. The `localhost.pem` and `localhost-key.pem` files in the root are the local SSL certificates (required because the app uses `history.pushState` and `fetch` with auth headers).

### Step 4 — Make your first small change (30 minutes)

Good first tasks:
- Add a new filter option to `FiltersBar` (UI-only change, no service needed)
- Change a label or copy string inside a page template (`.html` file)
- Add a new CSS custom property to `styles/core/variables.css`

### Step 5 — Add a full feature (your first real PR)

Follow the checklists in Section 14 (Scalability Guidelines). When in doubt: **make it work in the smallest possible file, then refactor into the correct layer.**

### Step 6 — Architecture lint

Run the architecture verification script before every PR:

```bash
bash docs/verify-architecture.sh
```

This script checks for common violations: services importing UI modules, features importing from other features, utils importing from `src/`, etc.

---

## 17. GitHub Commit & Repository Strategy

This section defines a professional, chronological commit strategy that demonstrates engineering thinking to any technical reviewer. The goal is to show **how** the system was built — not just that it exists.

### Philosophy

- Every commit represents a meaningful, isolated, deployable change
- Commit messages follow [Conventional Commits](https://www.conventionalcommits.org/)
- No "big bang" commits — each phase is broken into atomic steps
- The repo should be readable in commit order by a senior engineer

---

### Phase 0 — Repository Foundation

**Goal:** Make the repository immediately professional from its first public moment.

**Why first:** A recruiter or engineer who opens the repo will judge it by the README and initial structure before looking at a single line of code.

```
feat: initial repository setup with project documentation

refactor: add .gitignore for node_modules, dist, env files

docs: add README with project overview, tech stack, and setup instructions

docs: add ARCHITECTURE.md with full system design reference

docs: add ARCHITECTURE_DIAGRAMS.md with ASCII layer diagrams

chore: add .env.development and .env.production templates (no secrets)
```

---

### Phase 1 — Build System & Project Scaffold

**Goal:** Configure Webpack, establish the entry point, and create the skeleton folder structure.

**Why here:** Build tooling must exist before any code runs.

```
chore: add package.json with dependencies and npm scripts

chore: configure webpack with entry, output, and CSS/JS loaders

chore: add webpack dev server with HTTPS and HMR support

chore: add .env support via dotenv-webpack

feat: scaffold src/ folder structure (app, config, infrastructure, services, store, ui, utils)

feat: add index.html as webpack HTML template

chore: configure webpack production build with content hashing and code splitting
```

---

### Phase 2 — Design System Foundation

**Goal:** Establish all CSS design tokens and global style primitives before writing a single component.

**Why here:** Every component that follows will use these tokens. Defining them first prevents hardcoded values from appearing in component CSS.

```
feat(styles): add CSS custom properties — colours, gradients, shadows, radii, transitions

feat(styles): add browser reset and base body styles

feat(styles): add typography scale — headings, body, line-height

feat(styles): add layout primitives — container, grid utilities, flex helpers

feat(styles): add global card shell and modal overlay styles

feat(styles): add shared animation keyframes (fadeIn, shimmer, slideUp)

feat(styles): add global form layout wrappers

feat(styles): wire all global stylesheets into styles/main.css via @import
```

---

### Phase 3 — Application Bootstrap

**Goal:** The application can start, route, and render a blank page with the correct shell.

**Why here:** Routing and layout must work before any feature UI is built.

```
feat(app): add EventBus — global pub/sub communication hub

feat(app): add Router — history-based SPA navigation with template caching

feat(app): add Application.js — startup orchestrator and dependency wiring

feat(config): add api.config.js with base URL and endpoint constants

feat(config): add routes.config.js with all route definitions

feat(ui): add BaseComponent with mount/update/unmount/destroy lifecycle

feat(ui): add DashboardLayout — sidebar, top header, content area

feat(ui): add LandingLayout — public header, hero slot, footer

feat(app): wire Application, Router, and layouts in main.js
```

---

### Phase 4 — Infrastructure & API Layer

**Goal:** All HTTP communication paths exist and are tested against the API.

**Why here:** Services depend on API classes. Services must come after infrastructure.

```
feat(infra): add ApiClient with fetch wrapper, auth headers, and retry logic

feat(infra): add ApiError typed class for structured HTTP error handling

feat(infra): add AuthApi — login, register, logout, refresh token endpoints

feat(infra): add LinksApi — CRUD, bulk operations, stats endpoints

feat(infra): add AnalyticsApi — overview, clicks, geo, device, traffic endpoints

feat(infra): add ProfileApi — get/update profile, avatar endpoints

feat(infra): add SettingsApi — change email, password, delete account endpoints
```

---

### Phase 5 — State Management

**Goal:** The observable store is fully operational with all domain slices.

**Why here:** Services write to the store. Store must exist before services are built.

```
feat(store): add Store.js — observable state engine with dispatch, getState, subscribe

feat(store): add auth.slice.js — initial state for user identity and token

feat(store): add links.slice.js — initial state for links, pagination, and filters

feat(store): add analytics.slice.js — initial state for analytics data and date range

feat(store): add profile.slice.js — initial state for user profile and quota

feat(store): add settings.slice.js — initial state for settings panel

feat(store): compose all slices and export singleton store from store/index.js
```

---

### Phase 6 — Business Logic (Services)

**Goal:** All domain business rules are implemented and writing to the store correctly.

**Why here:** Services sit between infrastructure and UI. They must be ready before any feature UI is built.

```
feat(services): add TokenManager — JWT storage, expiry detection, refresh scheduling

feat(services): add AuthService — login, logout, register, password reset flows

feat(services): add LinksService — create, read, update, delete, bulk operations

feat(services): add AnalyticsService — fetch and aggregate analytics data

feat(services): add ProfileService — fetch and update user profile

feat(services): add SettingsService — email/password changes, account deletion

feat(services): add ToastService — writes to ui store slice to trigger notifications

feat(app): wire all services into Application.js with constructor injection
```

---

### Phase 7 — UI Primitives & Shared Components

**Goal:** The design system's component layer is complete. All domain UI will build on these.

**Why here:** Feature components depend on primitives. Primitives must exist first.

```
feat(ui/primitives): add Button component with primary, outline, danger variants

feat(ui/primitives): add Input component with label, error, and password-toggle support

feat(ui/primitives): add Pagination component with ellipsis and disabled states

feat(ui/primitives): add LoadingSpinner CSS and skeleton shimmer utilities

feat(ui/primitives): add Table component for sortable data display

feat(ui/feedback): add Toast component with slide-up animation and type variants

feat(ui/feedback): add Alert component for inline form feedback

feat(ui/navigation): add Header component with scroll-aware backdrop

feat(ui/navigation): add UserDropdown with avatar and signed-in user menu

feat(ui/components): add DashboardPageHeader shared page header chrome
```

---

### Phase 8 — Auth Feature & Auth Pages

**Goal:** Users can register, log in, and access the authenticated app.

**Why here:** Auth is the gate to all dashboard features — it must work before any dashboard UI.

```
feat(features/auth): add AuthForm component — login/register tab switcher with validation

feat(pages/auth): add LoginPage with form mounting and auth redirect logic

feat(pages/auth): add RegisterPage with terms acceptance and password strength meter

feat(pages/auth): add ForgotPasswordPage with email submission and success state

feat(pages/auth): add shared AuthPages.css for common auth page layout

feat(ui/layouts): integrate auth guard into Router for all requiresAuth routes
```

---

### Phase 9 — Landing Page

**Goal:** The public landing page is complete and polished.

```
feat(pages): add LandingPage — hero, URL shortener form, features, pricing, contact, footer

feat(pages): add LandingPage.css with hero animations and responsive layout

feat(ui): integrate LandingLayout with scrolled-header and footer
```

---

### Phase 10 — Links Feature

**Goal:** The core product feature — link management — is fully operational.

```
feat(features/links): add LinkCard with checkbox, favicon, short URL copy, dropdown actions

feat(features/links): add FiltersBar with search, date range popover, and status filter

feat(features/links): add FloatingBulkActionsBar — floating multi-select action portal

feat(features/links): add LinkEmptyState for zero-links display

feat(features/links): add LinksList as the scrollable container for LinkCards

feat(features/links): add CreateLinkModal with URL input, custom slug, and advanced options

feat(features/links): add EditLinkModal reusing LinkForm with pre-filled values

feat(features/links): add ConfirmModal for destructive action confirmation

feat(features/links): add BulkExpirationModal for setting expiry on multiple links

feat(pages): add LinksPage — mounts FiltersBar, FloatingBulkActionsBar, and LinksList

feat(pages): add LinksPage.css with section header and stat card layout
```

---

### Phase 11 — Analytics Feature

**Goal:** The analytics dashboard is complete with charts and breakdowns.

```
feat(features/analytics): add UserOverviewCards — KPI stat cards with accent colours

feat(features/analytics): add StatsDateFilter — preset date range tab strip

feat(features/analytics): add ClicksChart — time-series chart via ApexCharts lazy-load

feat(features/analytics): add EngagementPanel — day-of-week bar chart and peak hour tags

feat(features/analytics): add TopUrlsPanel — ranked list of top performing links

feat(features/analytics): add DevicesPanel, GeoPanel, TrafficPanel panel components

feat(pages): add AnalyticsPage — tab-based layout mounting all analytics feature components

feat(pages): add LinkStatsPage — per-link stats view with summary grid and tab navigation
```

---

### Phase 12 — Home Dashboard

**Goal:** The authenticated home page is complete.

```
feat(features/home): add StatCard component for KPI display

feat(pages): add HomePage — welcome banner, KPI grid, recent links, quick actions panel

feat(pages): add HomePage.css with two-column content grid and responsive breakpoints
```

---

### Phase 13 — Profile Feature

**Goal:** Users can view and edit their profile.

```
feat(features/profile): add ProfileHeaderCard — avatar, name, bio, meta tags

feat(features/profile): add ProfileEditForm — two-column field grid with icon inputs

feat(features/profile): add QuotaStatusCard — animated progress bar with reset date

feat(pages): add ProfilePage — sticky left card, tabbed right panel

feat(pages): add ProfilePage.css with sticky layout and skeleton states
```

---

### Phase 14 — Settings Feature

**Goal:** Users can change their email, password, and manage their account.

```
feat(features/settings): add SettingsForm shared field styles (.sf-* token system)

feat(features/settings): add SecurityStatusCard — login attempts bar and account lock status

feat(features/settings): add EmailVerificationCard — verification status info box

feat(features/settings): add DangerZoneCard — account deletion with confirmation input

feat(features/settings): add ChangeEmailForm and ChangePasswordForm components

feat(pages): add SettingsPage — desktop sidebar nav + mobile tab switcher

feat(pages): add SettingsPage.css with sticky sidebar and responsive collapse
```

---

### Phase 15 — Utilities & Helpers

**Goal:** All utility functions are documented and complete.

```
feat(utils): add dom.js — qs, qsa, on, off DOM helpers

feat(utils): add formatting.js — date, number, URL, duration formatters

feat(utils): add validation.js — isEmail, isStrongPassword, isValidUrl rules

feat(utils): add storage.js — typed localStorage/sessionStorage wrappers

feat(utils): add ui-logic.js — pagination range, text truncation helpers

feat(utils): add uiEventManager.js — tracked event listener registry

feat(utils): add SafeLogger.js — environment-aware console wrapper

feat(utils): add ChartLoader.js — dynamic ApexCharts import with singleton caching

feat(utils): add Countries.js — ISO country code lookup table
```

---

### Phase 16 — Optimisation & Polish

**Goal:** Production-ready performance, error handling, and edge case coverage.

```
perf: configure webpack vendor chunk splitting for ApexCharts

perf: add HTML template caching to Router

fix: ensure all store subscriptions are cleaned up in unmount()

fix: add auth token refresh scheduling in TokenManager

fix: add retry logic with exponential back-off to ApiClient

chore: add verify-architecture.sh lint script

refactor: extract shared .sf-* styles from SettingsPage into SettingsForm/SettingsForm.css

refactor: consolidate duplicate security status styles into SecurityStatusCard.css

test: add unit tests for LinksService.deleteLink

test: add unit tests for Store.dispatch / subscribe / getState contract

test: add unit tests for validation.js rules
```

---

### Phase 17 — Final Cleanup & Release Preparation

```
chore: remove all console.log statements — replace with SafeLogger

chore: add production webpack optimisations (minification, tree shaking)

chore: update README with full setup, commands, and architecture summary link

docs: update ARCHITECTURE.md to reflect final folder structure

chore: add ARCHITECTURE_DIAGRAMS.md with all ASCII flow diagrams

chore: configure .env.production with production API base URL

chore(release): v1.0.0 — Shortly frontend production release
```

---

### Commit Size Guidelines

| Commit type | Ideal size |
|---|---|
| `feat` (new feature) | One component or one service method |
| `fix` (bug fix) | The minimal change that resolves the issue |
| `refactor` | One file or one responsibility extracted |
| `chore` | One configuration change |
| `docs` | One document or one section update |
| `test` | Tests for one unit (one class or one function) |

**When to create a new branch:**
- Feature branches: any feature that takes more than one day
- Hotfix branches: production bug fixes that need to bypass the feature queue
- Refactor branches: architectural changes that touch many files simultaneously

**When not to branch:**
- Single-file documentation updates
- Single-commit chores
- CSS-only tweaks to an existing component

---

### Making the Repository Readable to Reviewers

1. **The README is the front door** — it should answer in 60 seconds: what is this, how do I run it, and where is the architecture documentation?
2. **Commit messages are the changelog** — write them as if a senior engineer is reading the `git log` to understand what you built and why
3. **The first 10 commits set the tone** — they should show thoughtful project setup, not just "initial commit" followed by a 500-file dump
4. **Each phase should be reviewable in isolation** — a reviewer should be able to `git checkout` any phase tag and have a working, coherent state
5. **Phase tags** — tag the end of each major phase: `git tag v0.1-scaffold`, `v0.2-design-system`, `v0.3-auth`, etc. This creates clear review checkpoints.

---

_For visual ASCII representations of all data flows, dependency rules, and lifecycle diagrams, see `ARCHITECTURE_DIAGRAMS.md`._

_For the mock API layer used in development, see `MOCK_LAYER.md`._
