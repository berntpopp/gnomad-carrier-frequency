# Phase 12: PWA - Context

**Gathered:** 2026-01-19
**Status:** Ready for planning

<domain>
## Phase Boundary

User can install the app on their device and use it offline with cached data. The app becomes installable via browser mechanisms, caches the app shell and static assets, provides an offline fallback when network unavailable, and stores previously fetched gene data for offline viewing.

</domain>

<decisions>
## Implementation Decisions

### Offline behavior
- View-only capability when offline — can see previously loaded results but cannot search new genes
- Simple fallback message when offline without cached data: "You're offline. Connect to use the calculator."
- Subtle indicator (small icon/badge) when app is offline
- Show brief "Back online" notification when connection restored

### Install experience
- Never auto-prompt for installation — user must discover install option themselves
- Install option accessible in Settings dialog ("Install App" button)
- No post-install onboarding — app works identically after installation
- Install option always available in settings regardless of user actions

### Caching strategy
- Gene/variant data cached for 24 hours before considered stale
- On app version update: clear app shell cache but preserve gene data cache
- Manual "Clear cache" button available in settings
- LRU (least recently used) eviction when cache storage is full

### App identity
- App name: "gCFCalc" (matches existing branding)
- Icons: Use existing SVG favicon design adapted to PWA icon sizes
- Display mode: Standalone (no browser UI, looks like native app)
- Splash screen: Yes, show logo + app name while loading

### Claude's Discretion
- Service worker implementation approach (Workbox vs custom)
- Exact icon sizes and maskable icon handling
- Splash screen animation/timing
- Offline indicator icon choice and placement
- Cache storage quota management details

</decisions>

<specifics>
## Specific Ideas

- Consistent with existing gCFCalc branding established in Phase 6
- RequiForm palette (#a09588) should carry through to splash screen theme color
- Install option fits naturally with existing settings dialog structure

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 12-pwa*
*Context gathered: 2026-01-19*
