# Shortly Frontend — Architecture Diagrams

> These diagrams are companions to `ARCHITECTURE.md`. Read that document first for full written explanations of each layer and rule.

---

## Diagram Index

1. [Full Layer Stack](https://claude.ai/chat/e2b1ab9c-74b7-47ad-ab4f-561a71f40e58#1-full-layer-stack)
2. [Dependency Rule (What Can Import What)](https://claude.ai/chat/e2b1ab9c-74b7-47ad-ab4f-561a71f40e58#2-dependency-rule-what-can-import-what)
3. [Unidirectional Data Flow](https://claude.ai/chat/e2b1ab9c-74b7-47ad-ab4f-561a71f40e58#3-unidirectional-data-flow)
4. [Store — Publish / Subscribe Model](https://claude.ai/chat/e2b1ab9c-74b7-47ad-ab4f-561a71f40e58#4-store--publish--subscribe-model)
5. [Three-Channel Communication Model](https://claude.ai/chat/e2b1ab9c-74b7-47ad-ab4f-561a71f40e58#5-three-channel-communication-model)
6. [Component Classification Tree](https://claude.ai/chat/e2b1ab9c-74b7-47ad-ab4f-561a71f40e58#6-component-classification-tree)
7. [Component Lifecycle](https://claude.ai/chat/e2b1ab9c-74b7-47ad-ab4f-561a71f40e58#7-component-lifecycle)
8. [Page Lifecycle](https://claude.ai/chat/e2b1ab9c-74b7-47ad-ab4f-561a71f40e58#8-page-lifecycle)
9. [Service Architecture (AuthService & LinksService)](https://claude.ai/chat/e2b1ab9c-74b7-47ad-ab4f-561a71f40e58#9-service-architecture-authservice--linksservice)
10. [Dependency Injection Flow (main.js → Page)](https://claude.ai/chat/e2b1ab9c-74b7-47ad-ab4f-561a71f40e58#10-dependency-injection-flow-mainjs--page)
11. [Error Handling Flow](https://claude.ai/chat/e2b1ab9c-74b7-47ad-ab4f-561a71f40e58#11-error-handling-flow)
12. [Full File Organization Tree](https://claude.ai/chat/e2b1ab9c-74b7-47ad-ab4f-561a71f40e58#12-full-file-organization-tree)
13. [Forbidden vs. Allowed Import Map](https://claude.ai/chat/e2b1ab9c-74b7-47ad-ab4f-561a71f40e58#13-forbidden-vs-allowed-import-map)
14. [State Ownership Map](https://claude.ai/chat/e2b1ab9c-74b7-47ad-ab4f-561a71f40e58#14-state-ownership-map)
15. [CSS Co-location Strategy](https://claude.ai/chat/e2b1ab9c-74b7-47ad-ab4f-561a71f40e58#15-css-co-location-strategy)

---

## 1. Full Layer Stack

```
  Higher layers depend on lower layers. Lower layers NEVER import higher layers.
  The APP layer is horizontal — it can be used by any layer but depends on none.

  ┌──────────────────────────────────────────────────────────────────────────┐
  │                       PAGES  &  FEATURES                                 │
  │            src/ui/pages/   ·   src/ui/features/                          │
  │                                                                           │
  │  Pages: Route-level orchestrators. Mount/unmount feature components.     │
  │  Features: Domain-aware stateful components (LinkCard, LinksTable…).     │
  │                                                                           │
  │  ✓ Subscribe to Store slices         ✓ Use primitive components          │
  │  ✗ No HTTP calls                     ✗ No cross-feature imports          │
  └──────────────────────────────┬───────────────────────────────────────────┘
                                 │ reads / dispatches
                                 ▼
  ┌──────────────────────────────────────────────────────────────────────────┐
  │                           STORE                                           │
  │                        src/store/                                         │
  │                                                                           │
  │  Slices: auth · links · analytics · ui                                   │
  │  Pattern: Observable state — dispatch(updater) → notify(subscribers)     │
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
  │  ApiClient · AuthApi · LinksApi · AnalyticsApi · ProfileApi · SettingsApi│
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
  │  dom.js · formatting.js · validation.js · storage.js · ui-logic.js       │
  │                                                                           │
  │  ✓ Pure functions, zero side effects  ✓ No internal src/ imports         │
  │  ✓ Usable by any layer                ✗ No state, no API calls           │
  └──────────────────────────────────────────────────────────────────────────┘

  ┌──────────────────────────────────────────────────────────────────────────┐
  │  APP  (horizontal — available to all, depends on none)                   │
  │  src/app/   Application · Router · EventBus · DependencyContainer        │
  └──────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Dependency Rule (What Can Import What)

```
  LAYER              CAN IMPORT FROM →
  ─────────────────────────────────────────────────────────────────────────
  Pages/Features  →  Services ✓  Store ✓  Components ✓  Utils ✓  App ✓
  Store           →  (nothing — it is imported, not an importer)
  Services        →  Infrastructure ✓  Store ✓  Utils ✓  App ✓
  Infrastructure  →  Utils ✓  Config ✓
  Utils           →  (nothing — pure functions only)
  App             →  Config ✓  (wired at boot, no runtime imports)

  ─────────────────────────────────────────────────────────────────────────
  STRICTLY FORBIDDEN
  ─────────────────────────────────────────────────────────────────────────
  Infrastructure  →  Services           ✗  Would create a circular dependency
  Services        →  UI (any layer)     ✗  Services must not know the DOM exists
  Primitive       →  Features           ✗  Primitives have zero domain knowledge
  Feature A       →  Feature B          ✗  Features share state via Store only
  Utils           →  Anything in src/   ✗  Utils are copy-paste portable
```

---

## 3. Unidirectional Data Flow

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
                    │  Receives the event.     │
                    │  Calls a service method. │
                    └────────────┬────────────┘
                                 │  service.deleteLink(id)
                                 ▼
                    ┌─────────────────────────┐
                    │      Service             │
                    │                          │
                    │  Executes business logic.│
                    │  Calls infrastructure.   │
                    └────────────┬────────────┘
                                 │  linksApi.deleteLink(id)
                                 ▼
                    ┌─────────────────────────┐
                    │   Infrastructure (HTTP)  │
                    │                          │
                    │  Makes HTTP request.     │
                    │  Transforms response.    │
                    └────────────┬────────────┘
                                 │  HTTP DELETE /api/links/123
                                 ▼
                    ┌─────────────────────────┐
                    │     Backend API          │
                    └────────────┬────────────┘
                                 │  { success: true }
                                 ▼
                    ┌─────────────────────────┐
                    │   Infrastructure (HTTP)  │
                    │  Returns plain JS object │
                    └────────────┬────────────┘
                                 │  returns { success: true }
                                 ▼
                    ┌─────────────────────────┐
                    │      Service             │
                    │                          │
                    │  store.dispatch('links', │
                    │    prev => removeItem)   │  ← State mutation
                    │  eventBus.emit(          │
                    │    'link:deleted', {id}) │  ← Event notification
                    └────────────┬────────────┘
                                 │  store notifies all subscribers
                                 ▼
                    ┌─────────────────────────┐
                    │  Feature Components      │
                    │  (LinksTable, LinksList) │
                    │                          │
                    │  Subscriber callback     │
                    │  fires. Component        │
                    │  re-renders with new     │
                    │  store state.            │
                    └────────────┬────────────┘
                                 │
                                 ▼
                    ┌─────────────────────────┐
                    │   Updated UI on screen   │
                    └─────────────────────────┘
```

---

## 4. Store — Publish / Subscribe Model

```
  ┌──────────────────────────────────────────────────────────────────────────┐
  │                            STORE                                          │
  │                                                                           │
  │   ┌──────────────┐   ┌──────────────┐   ┌──────────────┐  ┌───────────┐ │
  │   │  auth slice  │   │ links slice  │   │analytics slice│  │ ui slice  │ │
  │   │              │   │              │   │               │  │           │ │
  │   │  currentUser │   │  links[]     │   │  overviewData │  │  loading  │ │
  │   │  token       │   │  pagination  │   │  dateRange    │  │  modalId  │ │
  │   │  isAuth      │   │  filters     │   │  comparison   │  │  toasts[] │ │
  │   └──────┬───────┘   └──────┬───────┘   └──────┬────────┘  └─────┬────┘ │
  │          │                  │                   │                 │      │
  └──────────┼──────────────────┼───────────────────┼─────────────────┼──────┘
             │  notify          │  notify           │  notify         │  notify
             ▼                  ▼                   ▼                 ▼

      AuthService          LinksTable          AnalyticsPage      Toast
      UserDropdown         LinksPage           UserOverviewCards      Modal

  ──────────────────────────────────────────────────────────────────────────

  WHO WRITES                     WHO READS
  ─────────────────────────────  ────────────────────────────────────────────
  AuthService     → auth         Pages & Features (via store.subscribe)
  LinksService    → links        store.getState() for one-time reads
  AnalyticsService → analytics
  SettingsService → ui (loading)
  ToastService    → ui (toasts)

  ──────────────────────────────────────────────────────────────────────────

  GOLDEN RULE:  Services WRITE.  Components READ.  Never the reverse.
```

---

## 5. Three-Channel Communication Model

```
  There are exactly THREE approved ways for application parts to communicate.

  ┌────────────────────────────────────────────────────────────────────────┐
  │  CHANNEL 1 — PROPS DOWN  (Parent → Child)                              │
  │                                                                         │
  │  LinksPage  ─────────────────────────────────────────► LinksTable      │
  │              new LinksTable(el, { links, onEdit, onDelete })            │
  │                                                                         │
  │  Rule: A child never reaches upward. Data is always pushed down.       │
  └────────────────────────────────────────────────────────────────────────┘

  ┌────────────────────────────────────────────────────────────────────────┐
  │  CHANNEL 2 — EVENTS UP  (Child → EventBus → Parent/Service)            │
  │                                                                         │
  │  LinkCard  ──── eventBus.emit('link:deleteRequested', {id}) ──────────►│
  │                                                                         │
  │  LinksPage ◄─── eventBus.on('link:deleteRequested', handler) ──────────│
  │                                                                         │
  │  Rule: Children emit events. They NEVER import or call parent classes. │
  └────────────────────────────────────────────────────────────────────────┘

  ┌────────────────────────────────────────────────────────────────────────┐
  │  CHANNEL 3 — STORE  (Cross-feature / Cross-page state)                 │
  │                                                                         │
  │  LinksService ──── store.dispatch('links', updater) ───────────────────│
  │                              │                                          │
  │                              ▼  (store notifies all subscribers)        │
  │  LinksTable   ◄─── store.subscribe('links', callback) ─────────────────│
  │  HomePage     ◄─── store.subscribe('links', callback) ─────────────────│
  │                                                                         │
  │  Rule: Features NEVER import each other. They share state via Store.   │
  └────────────────────────────────────────────────────────────────────────┘

  ──────────────────────────────────────────────────────────────────────────
  ANTI-PATTERNS  (cause tight coupling and bugs — reject in code review)
  ──────────────────────────────────────────────────────────────────────────

  ✗  linkCard.parentPage.refreshList()     ← Child reaching up to parent
  ✗  import LinksPage from '../LinksPage'  ← Cross-page import
  ✗  import { GeoPanel } from '../../analytics'  ← Cross-feature import
  ✗  this.linksApi.getLinks()  (inside a component)  ← Component calling HTTP
```

---

## 6. Component Classification Tree

```
  src/ui/
  │
  ├── components/          ← STATELESS, DOMAIN-AGNOSTIC
  │   │                       These components do NOT know what a "link" is.
  │   │
  │   ├── primitives/      ← Zero domain knowledge, zero state
  │   │   ├── Button       accepts: label, variant, disabled, type
  │   │   ├── Input        accepts: value, placeholder, type, onInput
  │   │   ├── Dropdown     accepts: options[], selectedValue, onChange
  │   │   ├── Table        accepts: columns[], rows[], onSort
  │   │   ├── Pagination   accepts: page, totalPages, onChange
  │   │   ├── LoadingSpinner accepts: size, label
  │   │   └── LinkEmptyState   accepts: title, message, action?
  │   │
  │   ├── feedback/        ← Minimal state (open/closed only)
  │   │   ├── Toast        driven by ui store slice
  │   │   ├── Alert        accepts: type, message, dismissible
  │   │   └── Modal        accepts: isOpen, onClose, children (shell only)
  │   │
  │   ├── charts/          ← Presentation wrappers, no domain logic
  │   │   └── ClicksTimelineChart  accepts: dataPoints[], labels[]
  │   │
  │   └── navigation/
  │       ├── UserDropdown accepts: user object, onLogout
  │       └── Header       driven by auth store slice
  │
  └── features/            ← STATEFUL, DOMAIN-AWARE
      │                       These components KNOW the Shortly domain.
      │
      ├── links/
      │   ├── LinkCard           knows: Link entity, isExpired, shortUrl
      │   ├── LinksTable         subscribes to: links store slice
      │   ├── LinksList          subscribes to: links store slice
      │   ├── RecentLinkCard     knows: Link entity, click counts
      │   ├── FiltersBar         reads/writes: links.filters in store
      │   ├── BulkActionsBar     knows: selection state, bulk operations
      │   ├── LinkForm           knows: Link creation/edit payload shape
      │   ├── CreateLinkModal    composes: LinkForm inside Modal shell
      │   ├── EditLinkModal      composes: LinkForm inside Modal shell
      │   ├── BulkExpirationModal knows: bulk expiration domain rules
      │   └── ConfirmModal       generic confirm — reusable across features
      │
      ├── analytics/
      │   ├── UserOverviewCards      subscribes to: analytics store slice
      │   ├── ClicksChart        subscribes to: analytics.clicksTimeline
      │   ├── TrafficPanel       subscribes to: analytics.trafficSources
      │   ├── DevicesPanel       subscribes to: analytics.deviceBreakdown
      │   ├── GeoPanel           subscribes to: analytics.geoBreakdown
      │   ├── EngagementPanel    subscribes to: analytics.engagement
      │   ├── TopUrlsPanel      subscribes to: analytics.topLinks
      │   ├── ComparisonBanner   subscribes to: analytics.comparison
      │   └── StatsDateFilter    writes to: analytics.dateRange in store
      │
      ├── auth/
      │   └── AuthForm           knows: login vs register mode, validation rules
      │
      ├── profile/
      │   ├── ProfileHeaderCard  subscribes to: auth.currentUser
      │   ├── ProfileEditForm    knows: Profile entity shape
      │   └── QuotaStatusCard    subscribes to: auth.quota
      │
      └── settings/
          ├── ChangeEmailForm    knows: email-change flow (verify → confirm)
          ├── ChangePasswordForm knows: password strength rules
          ├── SecurityStatusCard subscribes to: auth store slice
          ├── EmailVerificationCard knows: email verification state machine
          └── DangerZoneCard    knows: account deletion confirmation flow
```

---

## 7. Component Lifecycle

```
  ┌──────────────────────────────────┐
  │        new MyComponent(          │
  │          container, props,       │
  │          { store, eventBus }     │
  │        )                         │
  │        constructor()             │
  │        • Store props             │
  │        • Do NOT touch DOM yet    │
  └─────────────────┬────────────────┘
                    │
                    ▼
  ┌──────────────────────────────────┐
  │  render()                        │
  │  • Returns HTML string           │
  │  • Pure — no side effects        │
  │  • No DOM queries here           │
  └─────────────────┬────────────────┘
                    │
                    ▼
  ┌──────────────────────────────────┐
  │  mount()                         │
  │  • Inserts HTML into container   │
  │  • Calls setupEventListeners()   │
  │  • Subscribes to store slices    │  ← Save unsubscribe fn!
  │  • Sets isMounted = true         │
  └─────────────────┬────────────────┘
                    │
                    ▼
         ┌──────────────────────┐
         │  [Component is live] │
         │  User interacts      │
         └──────────┬───────────┘
                    │
                    ▼
  ┌──────────────────────────────────┐
  │  update(newProps)  [optional]    │
  │  • Merge new props               │
  │  • Re-render changed regions     │
  │  • Re-attach affected listeners  │
  └─────────────────┬────────────────┘
                    │
                    ▼
  ┌──────────────────────────────────┐
  │  unmount()                       │
  │  • Call #unsubscribe() (store)   │  ← REQUIRED — memory leak prevention
  │  • Remove all event listeners    │  ← REQUIRED
  │  • Remove from DOM               │
  │  • Sets isMounted = false        │
  └─────────────────┬────────────────┘
                    │
                    ▼
  ┌──────────────────────────────────┐
  │  destroy()                       │
  │  • Null out all references       │
  │  • Final GC-friendly cleanup     │
  └──────────────────────────────────┘

  ─────────────────────────────────────────────────────────────────
  MEMORY LEAK CHECKLIST  (validate in every PR that adds a component)
  ─────────────────────────────────────────────────────────────────
  □  Every store.subscribe() return value stored in a #private field
  □  Every stored unsubscribe called in unmount()
  □  Every eventBus.on() has a matching eventBus.off() in unmount()
  □  Every setTimeout/setInterval cleared in unmount()
```

---

## 8. Page Lifecycle

```
  Router matches URL
         │
         ▼
  ┌──────────────────────────────────┐
  │  new LinksPage(container, {      │
  │    services,                     │
  │    store,                        │
  │    eventBus,                     │
  │    router                        │
  │  })                              │
  └─────────────────┬────────────────┘
                    │
                    ▼
  ┌──────────────────────────────────┐
  │  mount()                         │
  │  • Subscribe to store slices     │
  │  • Instantiate feature components│
  │  • Register eventBus listeners   │
  │  • Call service.loadXxx() ───────┼──── triggers async data load
  └─────────────────┬────────────────┘     store.dispatch() → subscribers re-render
                    │
                    ▼
         ┌──────────────────────┐
         │  [Page is live]      │
         │                      │
         │  User actions call   │
         │  service methods.    │
         │                      │
         │  Store updates       │
         │  trigger component   │
         │  re-renders.         │
         └──────────┬───────────┘
                    │
                    │  (User navigates away — Router fires)
                    ▼
  ┌──────────────────────────────────┐
  │  unmount()                       │
  │  • Unsubscribe all store slices  │
  │  • eventBus.off() all listeners  │
  │  • Call destroy() on all         │
  │    child components              │
  │  • Clear container innerHTML     │
  └─────────────────┬────────────────┘
                    │
                    ▼
  ┌──────────────────────────────────┐
  │  destroy()                       │
  │  • Null service references       │
  │  • Final cleanup                 │
  └──────────────────────────────────┘

  ─────────────────────────────────────────────────────────────────
  PAGE SIZE RULE
  A page file that exceeds ~100 lines is a code smell.
  Likely cause: business logic or rendering logic has leaked into
  the page. Extract it into a feature component or a service.
  ─────────────────────────────────────────────────────────────────
```

---

## 9. Service Architecture (AuthService & LinksService)

```
  ┌────────────────────────────────────────────────────────┐
  │  AuthService                                            │
  │                                                         │
  │  Constructor: AuthService(authApi, store, eventBus,    │
  │               tokenManager)                             │
  │                                                         │
  │  Writes to store slice: 'auth'                          │
  │  ┌─────────────────────────────────────────────────┐   │
  │  │  auth slice state:                              │   │
  │  │  { currentUser, token, isAuthenticated }        │   │
  │  └─────────────────────────────────────────────────┘   │
  │                                                         │
  │  Methods:                                               │
  │  register(payload)   → dispatches 'auth' · emits 'auth:loggedIn'   │
  │  login(payload)      → dispatches 'auth' · emits 'auth:loggedIn'   │
  │  logout()            → dispatches 'auth' · emits 'auth:loggedOut'  │
  │  checkAuth()         → dispatches 'auth' (on boot)                 │
  │  updateProfile(data) → dispatches 'auth' · emits 'auth:profileUpdated' │
  │                                                         │
  │  Synchronous reads (from store):                        │
  │  isAuthenticated()  getCurrentUser()  getToken()        │
  └────────────────────────────────────────────────────────┘


  ┌────────────────────────────────────────────────────────┐
  │  LinksService                                           │
  │                                                         │
  │  Constructor: LinksService(linksApi, store, eventBus)  │
  │                                                         │
  │  Writes to store slice: 'links'                         │
  │  ┌─────────────────────────────────────────────────┐   │
  │  │  links slice state:                             │   │
  │  │  { links[], pagination, filters, cache }        │   │
  │  └─────────────────────────────────────────────────┘   │
  │                                                         │
  │  Methods:                                               │
  │  loadLinks(options)       → dispatches 'links' · emits 'links:loaded'    │
  │  createLink(payload)      → dispatches 'links' · emits 'link:created'    │
  │  updateLink(id, payload)  → dispatches 'links' · emits 'link:updated'    │
  │  deleteLink(id)           → dispatches 'links' · emits 'link:deleted'    │
  │  bulkDelete(ids[])        → dispatches 'links' · emits 'link:bulkDeleted'│
  │  getLinkStats(id, params) → returns stats (no store write)               │
  │                                                         │
  │  Synchronous reads (from store):                        │
  │  getLinks()  getPagination()  getFilters()              │
  └────────────────────────────────────────────────────────┘
```

---

## 10. Dependency Injection Flow (main.js → Page)

```
  main.js  (entry point — wiring only, no business logic)
  │
  ├─ 1. Instantiate infrastructure
  │      const apiClient    = new ApiClient(API_BASE_URL);
  │      const authApi      = new AuthApi(apiClient);
  │      const linksApi     = new LinksApi(apiClient);
  │      const analyticsApi = new AnalyticsApi(apiClient);
  │      const profileApi   = new ProfileApi(apiClient);
  │      const settingsApi  = new SettingsApi(apiClient);
  │
  ├─ 2. Instantiate app primitives
  │      const eventBus     = new EventBus();
  │      const store        = createStore();       // composed slices
  │
  ├─ 3. Instantiate services (inject infrastructure + store + eventBus)
  │      const tokenManager     = new TokenManager();
  │      const authService      = new AuthService(authApi, store, eventBus, tokenManager);
  │      const linksService     = new LinksService(linksApi, store, eventBus);
  │      const analyticsService = new AnalyticsService(analyticsApi, store, eventBus);
  │      const profileService   = new ProfileService(profileApi, store, eventBus);
  │      const settingsService  = new SettingsService(settingsApi, store, eventBus);
  │      const toastService     = new ToastService(eventBus);
  │
  ├─ 4. Register services in DependencyContainer
  │      container.register('auth',      authService);
  │      container.register('links',     linksService);
  │      container.register('analytics', analyticsService);
  │      container.register('profile',   profileService);
  │      container.register('settings',  settingsService);
  │      container.register('toast',     toastService);
  │
  ├─ 5. Instantiate Router
  │      const router = new Router(routeConfig, container, store, eventBus);
  │
  ├─ 6. Boot application
  │      const app = new Application(router, authService, eventBus);
  │      await app.init();
  │
  └─ Later — Router activates a route:
         │
         └─ new LinksPage(containerEl, {
                services: container,
                store,
                eventBus,
                router
            });
            │
            └─ page.getService('links')  →  LinksService instance
```

---

## 11. Error Handling Flow

```
  User action triggers service call
           │
           ▼
  Service calls infrastructure (linksApi.deleteLink)
           │
           ▼
  HTTP error occurs (404, 500, network timeout)
           │
           ▼
  ApiClient throws ApiError({ status, message, endpoint })
           │
           ▼
  Service catches the ApiError
     │
     ├─ store.dispatch('ui', prev =>        ← Sets loading flag to false
     │    ({ ...prev, loading: { ...prev.loading, [key]: false } }))
     │
     ├─ eventBus.emit('error:api', {        ← Broadcasts for any global listener
     │    status, message, endpoint })
     │
     └─ re-throws the error                 ← Page must handle it
           │
           ▼
  Page catches the re-thrown error
     │
     ├─ Logs to console (dev) / error tracker (prod)
     │
     └─ eventBus.emit('toast:show', {       ← Triggers Toast component
          message: 'Friendly error text',
          type: 'error'
        })
           │
           ▼
  ToastService listener fires
     │
     └─ store.dispatch('ui', prev =>        ← Adds toast to queue
          appendToast(prev, toastPayload))
           │
           ▼
  Toast component subscriber fires → renders error toast to user
```

---

## 12. Full File Organization Tree

```
  src/
  │
  ├── app/                        ← Bootstrap & wiring (runs once)
  │   ├── Application.js          App lifecycle: init, boot, teardown
  │   ├── DependencyContainer.js  IoC container: register/get services
  │   ├── EventBus.js             Pub/sub hub: on, off, emit, once
  │   └── Router.js               URL routing: match, load, activate page
  │
  ├── config/
  │   ├── api.config.js           Base URL, endpoint paths, timeouts
  │   ├── app.config.js           Feature flags, app-level constants
  │   └── routes.config.js        Route path → Page class map
  │
  ├── infrastructure/
  │   └── http/
  │       ├── ApiClient.js        fetch wrapper, auth headers, retry logic
  │       ├── AuthApi.js          /auth/* endpoints
  │       ├── LinksApi.js         /links/* endpoints
  │       ├── AnalyticsApi.js     /analytics/* endpoints
  │       ├── ProfileApi.js       /profile/* endpoints
  │       └── SettingsApi.js      /settings/* endpoints
  │
  ├── services/                   Business logic — no DOM, no HTTP
  │   ├── AuthService.js
  │   ├── LinksService.js
  │   ├── AnalyticsService.js
  │   ├── ProfileService.js
  │   ├── SettingsService.js
  │   ├── ToastService.js
  │   └── TokenManager.js
  │
  ├── store/
  │   ├── Store.js                Observable state engine (~40 lines)
  │   ├── slices/
  │   │   ├── auth.slice.js       { currentUser, token, isAuthenticated }
  │   │   ├── links.slice.js      { links[], pagination, filters }
  │   │   ├── analytics.slice.js  { data, dateRange, comparison }
  │   │   └── ui.slice.js         { loading{}, openModalId, toasts[] }
  │   └── index.js                Composes and exports singleton store
  │
  ├── ui/
  │   │
  │   ├── base/
  │   │   └── BaseComponent.js    mount · render · update · unmount · destroy
  │   │
  │   ├── layouts/
  │   │   ├── DashboardLayout.js  Authenticated shell
  │   │   └── LandingLayout.js    Public shell
  │   │
  │   ├── components/             STATELESS, domain-agnostic
  │   │   ├── primitives/         Button · Input · Dropdown · Table · Pagination
  │   │   │                       LoadingSpinner · LinkEmptyState
  │   │   ├── feedback/           Toast · Alert · Modal (shell)
  │   │   ├── charts/             ClicksTimelineChart · ChartLoader
  │   │   └── navigation/         UserDropdown · Header
  │   │
  │   ├── features/               STATEFUL, domain-aware
  │   │   ├── links/              LinkCard · LinksTable · LinksList · FiltersBar
  │   │   │                       BulkActionsBar · LinkForm
  │   │   │                       CreateLinkModal · EditLinkModal
  │   │   │                       BulkExpirationModal · ConfirmModal
  │   │   ├── analytics/          UserOverviewCards · ClicksChart · TrafficPanel
  │   │   │                       DevicesPanel · GeoPanel · EngagementPanel
  │   │   │                       TopUrlsPanel · ComparisonBanner · StatsDateFilter
  │   │   ├── auth/               AuthForm
  │   │   ├── profile/            ProfileHeaderCard · ProfileEditForm · QuotaStatusCard
  │   │   └── settings/           ChangeEmailForm · ChangePasswordForm
  │   │                           SecurityStatusCard · EmailVerificationCard · DangerZoneCard
  │   │
  │   └── pages/                  Route-level orchestrators only
  │       ├── BasePage.js
  │       ├── LandingPage/        LandingPage.js + .html + .css
  │       ├── LoginPage/
  │       ├── RegisterPage/
  │       ├── ForgotPasswordPage/
  │       ├── HomePage/           HomePage.js + .html + HomeTemplate.js + .css
  │       ├── LinksPage/
  │       ├── LinkStatsPage/
  │       ├── AnalyticsPage/
  │       ├── ProfilePage/
  │       └── SettingsPage/
  │
  ├── utils/                      Pure stateless helpers
  │   ├── dom.js
  │   ├── formatting.js
  │   ├── storage.js
  │   ├── validation.js
  │   ├── ui-logic.js
  │   └── uiEventManager.js
  │
  └── main.js                     Wiring only — no logic

  styles/                         Global styles only — no component CSS here
  ├── core/   reset.css · variables.css · typography.css
  ├── layout/ container.css · grid.css
  └── main.css  (imports only — zero rules defined here)

  __mocks__/                      Dev/test only — never ships to production
  └── seedData.js
```

---

## 13. Forbidden vs. Allowed Import Map

```
  Read as: "ROW may import from COLUMN"

                        app  config  infra  services  store  components  features  pages  utils
                        ─────────────────────────────────────────────────────────────────────────
  app                │   –     ✓      –       –        –       –           –        –      ✓
  config             │   –     –      –       –        –       –           –        –      –
  infrastructure     │   –     ✓      –       –        –       –           –        –      ✓
  services           │   ✓     ✓      ✓       –        ✓       –           –        –      ✓
  store              │   –     –      –       –        –       –           –        –      –
  components/prim    │   ✓     –      –       –        –       –           –        –      ✓
  components/feat    │   ✓     –      –       –        –       –           –        –      –
  features           │   ✓     –      –       –        ✓       ✓           –        –      ✓
  pages              │   ✓     –      –       ✓        ✓       ✓           ✓        –      ✓
  utils              │   –     –      –       –        –       –           –        –      –

  ✓ = allowed   – = forbidden

  ─────────────────────────────────────────────────────────────────────────
  MOST COMMONLY VIOLATED RULES (top code-review catches)
  ─────────────────────────────────────────────────────────────────────────
  • A component importing a service directly          → use eventBus instead
  • A service importing a UI component                → emit an event instead
  • A feature importing from another feature folder   → share via store instead
  • Infrastructure importing from services            → circular dependency
  • A page directly calling infrastructure            → must go through service
```

---

## 14. State Ownership Map

```
  STORE SLICE       OWNED BY          WRITTEN BY           READ BY
  ────────────────────────────────────────────────────────────────────────────
  auth              AuthService       AuthService           UserDropdown
                                      TokenManager          Header
                                                            ProfileHeaderCard
                                                            SecurityStatusCard
                                                            QuotaStatusCard
                                                            All pages (auth guard)

  links             LinksService      LinksService          LinksTable
                                                            LinksList
                                                            RecentLinkCard
                                                            FiltersBar
                                                            BulkActionsBar
                                                            HomePage (recent links)

  analytics         AnalyticsService  AnalyticsService      UserOverviewCards
                                                            ClicksChart
                                                            TrafficPanel
                                                            DevicesPanel
                                                            GeoPanel
                                                            EngagementPanel
                                                            TopUrlsPanel
                                                            ComparisonBanner

  ui                Multiple           ToastService          Toast
                    services           Any service           Modal
                                       (loading flags)       LoadingSpinner
                                                            All pages (loading state)

  ─────────────────────────────────────────────────────────────────────────
  GOLDEN RULE: No component stores business data.
  Components may only store transient UI state: open/closed, hovered,
  focused, tab index. Everything else lives in the store.
  ─────────────────────────────────────────────────────────────────────────
```

---

## 15. CSS Co-location Strategy

```
  BEFORE (legacy — parallel tree, easy to orphan styles)
  ─────────────────────────────────────────────────────────────────────────
  css/
  └── pages/
      └── links.css          ← How far is this from the component that uses it?

  src/ui/features/links/
  └── components/
      └── LinkCard/
          └── LinkCard.js    ← Developer must remember css/pages/links.css exists


  AFTER (co-located — CSS lives and dies with its component)
  ─────────────────────────────────────────────────────────────────────────
  src/ui/features/links/
  └── components/
      └── LinkCard/
          ├── LinkCard.js    ← Behaviour
          └── LinkCard.css   ← Styles — deleted automatically with the folder

  styles/                    ← GLOBAL ONLY: no component styles allowed here
  ├── core/
  │   ├── reset.css          Has no component owner → lives here
  │   ├── variables.css      CSS custom properties (design tokens) → lives here
  │   └── typography.css     Base scale → lives here
  ├── layout/
  │   ├── container.css      Layout primitives → lives here
  │   └── grid.css
  └── main.css               @import declarations only — zero rules written here


  CO-LOCATION DECISION RULE
  ─────────────────────────────────────────────────────────────────────────
  Ask: "If I delete this component, should these styles disappear too?"
    YES  →  Co-locate CSS next to the component's .js file
    NO   →  It belongs in styles/core/ or styles/layout/
```

---

_For full written explanations, code examples, and how-to guides for every pattern shown in these diagrams, see `ARCHITECTURE.md`._