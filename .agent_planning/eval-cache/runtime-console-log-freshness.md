# Runtime Findings: Console Log Freshness

**Scope**: Console log freshness tracking for Chrome automation
**Last Updated**: 2026-01-18
**Confidence**: FRESH

## Verified Runtime Behavior

### Navigation Tracking
- Navigation epoch increments on every page load event
- Console logs are fully cleared on navigation (no stale data)
- lastNavigationTime updated to Date.now() on each navigation
- Initialization sets navigationEpoch to 0, increments from there

### HMR Detection
- Pattern detection works via regex: `/^\[(HMR|WDS|vite)\]/`
- Update detection requires both HMR pattern + `/updat(e|ed|ing)/i`
- HMR counter increments per update message
- HMR state resets completely on navigation (count=0, time=null)

### Message Tagging
- All console messages tagged with navigationEpoch at capture time
- Tagging happens in real-time during console event
- Messages from pre-navigation never mix with post-navigation

### Freshness Delta Logic
- First query ever: No freshness message (lastQueryEpoch is null)
- Page reload detected: `lastQueryEpoch < navigationEpoch`
- HMR update detected: `lastHmrTime > lastConsoleQuery` AND `hmrUpdateCount > 0`
- No changes: Neither condition met
- Query tracking updates AFTER freshness calculation (for next call)

### Edge Cases
- Rapid multiple queries: "No changes" shown correctly
- Query before any navigation: Works (epoch starts at 0)
- HMR without navigation: Count persists, detected correctly
- Navigation after HMR: HMR state reset, new epoch started

## Type Safety
- All tracking fields are non-nullable except lastHmrTime (null before first HMR)
- lastConsoleQuery and lastQueryEpoch nullable (null before first query)
- TypeScript enforces null checks in freshness logic

## Performance Characteristics
- Minimal overhead: Simple counter increments and timestamp captures
- No expensive operations in hot paths
- Regex patterns are simple and fast

## Known Limitations (By Design)
- Does not detect SPA hash navigation (not a full page load)
- Does not distinguish between different types of HMR updates
- Does not track individual module replacements
- Pattern detection may miss custom HMR frameworks
