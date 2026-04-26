# Shortly — Mock Data Layer

> **Purpose:** Enable full UI development against realistic local data — no server required.
> **Toggle:** One flag in `.env.development`. Flip it, rebuild, done.

---

## Quick Start

```bash
# 1. Ensure USE_MOCK_API=true in .env.development (it is, by default)
# 2. Start your webpack dev server
npm run dev

# You are now authenticated as "Dev User" with 12 Links and full Analytics.
# No backend, no token, no network required.
```

To switch back to the real server:

```bash
# .env.development
USE_MOCK_API=false
```

Rebuild — every API call goes to the real backend, zero other changes needed.

---

## Architecture Diagram

```
main.js (wiring)
   │
   ├─ createApiLayer(apiClient)          ← MockApiFactory.js
   │      │
   │      ├─ USE_MOCK_API=true  → MockAuthApi, MockLinksApi, ...
   │      └─ USE_MOCK_API=false → AuthApi,     LinksApi,     ...
   │
   ├─ new AuthService(authApi, ...)      ← same constructor either way
   ├─ new LinksService(linksApi, ...)    ← same constructor either way
   └─ new AnalyticsService(...)          ← same constructor either way

Services ──► Store ──► Components
               ▲
         (identical path
          real or mock)
```

**Services, the Store, pages, and components are never aware of mock vs. real.**
The seam is at the infrastructure layer, injected from `main.js`.

---

## File Structure

```
src/
├── __mocks__/
│   ├── data/
│   │   ├── user.mock.js          — MOCK_USER, MOCK_TOKENS, MOCK_QUOTA, MOCK_SECURITY_STATUS
│   │   ├── links.mock.js         — MOCK_LINKS[], buildMockLinksPage() (filter/sort/paginate)
│   │   └── analytics.mock.js     — all overview/timeseries/geo/traffic/device slices
│   ├── api/
│   │   ├── MockAuthApi.js        — same interface as AuthApi
│   │   ├── MockLinksApi.js       — same interface as LinksApi (mutations persist in session)
│   │   ├── MockAnalyticsApi.js   — same interface as AnalyticsApi
│   │   ├── MockProfileApi.js     — same interface as ProfileApi
│   │   └── MockSettingsApi.js    — same interface as SettingsApi
│   └── MockApiFactory.js         — the single decision point: real vs. mock
│
├── main.js                       — imports createApiLayer() instead of individual APIs
├── ui/layouts/DashboardLayout.js — renders the Mock Mode badge when flag is true
│
├── .env.development              — USE_MOCK_API=true
└── .env.production               — USE_MOCK_API=false
```

---

## How Authentication is Mocked

`AuthService.restoreSession()` runs on every page load. It calls:

```
restoreSession()
  └─ checkAuth()
       └─ refreshAccessToken()
            └─ authApi.refreshToken()   ← MockAuthApi returns a fake token
       └─ loadCurrentUser()
            └─ authApi.getCurrentUser() ← MockAuthApi returns MOCK_USER
```

`MockAuthApi.refreshToken()` returns `{ accessToken: 'mock.access.token…', accessTokenExpiry }`.
AuthService proceeds exactly as it would with a real token. The app boots fully authenticated.

**Zero changes to AuthService. Zero changes to the Router auth guard.**

---

## How Link Mutations Work

`MockLinksApi` maintains an **in-memory mutable array** (`_links`) initialised from
`MOCK_LINKS`. Create, update, delete, and bulk operations all mutate this array.
Changes are reflected in subsequent `listUserLinks()` calls within the same session.

Refreshing the page resets to the original `MOCK_LINKS` dataset.

---

## The Mock Mode Badge

A small animated amber badge appears in the dashboard header, to the left of the
user avatar, when `USE_MOCK_API=true`. It is:

- **Compile-time conditional** — Webpack's DefinePlugin replaces the `process.env.USE_MOCK_API === 'true'` check. The badge HTML and its `<style>` block are **completely absent from the production bundle**.
- **Self-contained** — styles are inlined in `DashboardLayout.js` inside the conditional block. No extra CSS file, no extra import.
- **Accessible** — `role="status"` and `aria-label` describe it for screen readers. A `title` tooltip explains it to developers who hover.

---

## Deleting the Mock Layer

When you are ready for production and want to remove mock support entirely:

### Step 1 — Delete the directory
```bash
rm -rf src/__mocks__/
```

### Step 2 — Restore `main.js`
Replace:
```js
import { createApiLayer, IS_MOCK_MODE } from './__mocks__/MockApiFactory.js';
// ...
const { authApi, linksApi, analyticsApi, profileApi, settingsApi }
    = createApiLayer(apiClient);
// ...
new HeaderController(authService, eventBus, { isMockMode: IS_MOCK_MODE });
```
With:
```js
import AuthApi      from './infrastructure/http/AuthApi.js';
import LinksApi     from './infrastructure/http/LinksApi.js';
import AnalyticsApi from './infrastructure/http/AnalyticsApi.js';
import ProfileApi   from './infrastructure/http/ProfileApi.js';
import SettingsApi  from './infrastructure/http/SettingsApi.js';
// ...
const authApi      = new AuthApi(apiClient);
const linksApi     = new LinksApi(apiClient);
const analyticsApi = new AnalyticsApi(apiClient);
const profileApi   = new ProfileApi(apiClient);
const settingsApi  = new SettingsApi(apiClient);
// ...
new HeaderController(authService, eventBus);
```

### Step 3 — Clean up `DashboardLayout.js`
Remove the `${process.env.USE_MOCK_API === 'true' ? \`...\` : ''}` expressions
(the `<style>` block at the top and the badge `<div>` in `.header-right`).

### Step 4 — Clean up environment files
Remove `USE_MOCK_API` from `.env.*` files and from `webpack.config.js` DefinePlugin.

**That's it. No services, store slices, pages, or components need to change.**

---

## Adding New Mock Data

To extend a data shape (e.g., a new field on a link):

1. Add the field to the relevant object in `src/__mocks__/data/*.mock.js`.
2. No other file needs to change — services and components read the data
   through the store's existing shape.

To add a new endpoint mock:

1. Add the method to the relevant `src/__mocks__/api/Mock*Api.js`.
2. Match the method signature of the real `*Api.js` exactly.
3. Done — the service will call it transparently.

---

## Simulated Network Delay

Each mock API method includes a configurable `delay()` call (default 200 ms for
reads, 300–500 ms for writes) to simulate realistic loading states. This ensures
your loading spinners, skeleton screens, and error boundaries are tested during
development rather than being invisible due to instant responses.

To disable delays entirely, set `MOCK_DELAY_MS = 0` in each `Mock*Api.js` file.