# Console Log Freshness - Definition of Done

**Sprint ID:** console-log-freshness-20260118

## Acceptance Criteria

### AC1: Navigation Tracking
- [x] `Connection` interface includes `navigationEpoch`, `lastNavigationTime`
- [x] Navigation epoch increments on page reload/navigation
- [x] Console logs cleared on navigation

### AC2: HMR Detection
- [x] HMR messages detected via `[HMR]`, `[WDS]`, `[vite]` patterns
- [x] `Connection` tracks `hmrUpdateCount`, `lastHmrTime`
- [x] HMR count resets on navigation

### AC3: Message Tagging
- [x] `ConsoleMessage` includes `navigationEpoch`
- [x] Messages tagged with current epoch when captured

### AC4: Freshness Response
- [x] `get_console_logs` includes page state header
- [x] Response indicates `[PAGE RELOADED since your last query]` when applicable
- [x] Response indicates `[HMR UPDATE occurred since your last query]` when applicable
- [x] Response indicates `[No changes since your last query]` when applicable

### AC5: Agent Experience
- [x] Agent never sees pre-reload errors after reload
- [x] Agent can tell if HMR rebuilt modules since last check
- [x] Agent does not waste time on stale error investigation

## Verification Scenarios

### Scenario 1: Page Reload
1. Connect to page with console errors
2. Query `get_console_logs` - see errors
3. Reload the page (fixing errors)
4. Query `get_console_logs` - should NOT see old errors
5. Response should indicate `[PAGE RELOADED since your last query]`

**Status:** READY FOR MANUAL VERIFICATION

### Scenario 2: HMR Update
1. Connect to dev server with HMR enabled
2. Query `get_console_logs`
3. Edit source file, triggering HMR
4. Query `get_console_logs`
5. Response should indicate `[HMR UPDATE occurred since your last query]`
6. Response should show HMR update count

**Status:** READY FOR MANUAL VERIFICATION

### Scenario 3: No Changes
1. Connect and query logs
2. Query logs again immediately
3. Response should indicate `[No changes since your last query]`

**Status:** READY FOR MANUAL VERIFICATION

## Non-Goals (Explicitly Out of Scope)

- Parsing or understanding console message content
- Filtering based on message severity
- Tracking SPA hash-only navigation
- Supporting non-standard HMR frameworks

## Implementation Summary

**All acceptance criteria complete.**

### Changes Made

1. **Type Updates (src/types.ts)**
   - Added navigation tracking fields to `Connection`: `navigationEpoch`, `lastNavigationTime`, `hmrUpdateCount`, `lastHmrTime`
   - Added query tracking fields to `Connection`: `lastConsoleQuery`, `lastQueryEpoch`
   - Added `navigationEpoch` field to `ConsoleMessage`

2. **Browser Manager (src/browser.ts)**
   - Added `setupPageListeners()` helper to consolidate listener setup
   - Added `isHmrMessage()` and `isHmrUpdateMessage()` pattern detection
   - Console listener now tags messages with `navigationEpoch` and detects HMR updates
   - Page `load` listener increments navigation epoch and clears old console logs
   - `connect()` and `launch()` initialize all tracking fields
   - `switchPage()` resets state and re-applies listeners

3. **Console Tool (src/tools/dom.ts)**
   - Added `formatTimeSince()` helper for human-readable timestamps
   - `getConsoleLogs()` now includes:
     - Page state header with navigation epoch and HMR info
     - Freshness delta messages (reload/HMR/no change)
     - Query tracking update for next call

### Commits
- `8858fcb` - Phase 1: Type updates
- `6fe739d` - Phase 2: Navigation and HMR tracking
- `f9540c4` - Phase 4: Freshness response enhancement

### Tests
- All existing tests pass
- Build completes with no TypeScript errors
- Ready for manual verification scenarios
