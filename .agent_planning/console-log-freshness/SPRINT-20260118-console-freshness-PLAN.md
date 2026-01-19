# Console Log Freshness Plan

**Sprint ID:** console-log-freshness-20260118
**Status:** Planning
**Confidence:** HIGH (95%)

## Problem Statement

When querying console logs via `get_console_logs`, agents sometimes receive messages that appear stale or irrelevant to the current page state. This causes confusion and wasted effort when agents:

1. Try to restart dev servers unnecessarily
2. Kill and reopen the browser thinking old errors persist
3. Cannot tell if HMR has rebuilt modules since the last query
4. Cannot distinguish pre-reload messages from post-reload messages

## Root Cause Analysis: Sources of Stale Messages

### Source 1: Console logs never cleared on navigation
**File:** `src/browser.ts:130-137`

When we connect or launch Chrome, we set up console listeners:
```typescript
page.on('console', (msg) => {
  consoleLogs.push({ level: msg.type(), text: msg.text(), timestamp: Date.now() });
});
```

However, **console logs are never cleared on page navigation**. If the user navigates to a new page or reloads, old messages persist in the array.

### Source 2: Console logs cleared only on target switch, not reload
**File:** `src/browser.ts:360-367` (`switchPage` method)

Console logs are cleared only when switching targets:
```typescript
connection.consoleLogs = [];
page.on('console', (msg) => {
  connection.consoleLogs.push({ ... });
});
```

This doesn't help with:
- Same-page reloads (F5)
- SPA navigation
- HMR updates

### Source 3: No page state tracking for freshness context
**File:** `src/browser.ts` and `src/types.ts`

The `Connection` interface has no fields to track:
- Last navigation time
- Last HMR update time
- Current navigation ID/epoch
- Whether the page has reloaded since last query

### Source 4: getConsoleLogs has no freshness indicators
**File:** `src/tools/dom.ts:408-458`

The `getConsoleLogs` function returns messages with no context about:
- Whether navigation occurred since last query
- Whether HMR updates occurred
- Which messages are from the "current" page state

## Solution Design

### Design Principle: Freshness Metadata, Not Filtering

Rather than aggressively filtering messages (which could hide important errors), we will:

1. **Track page state transitions** (navigations, HMR updates)
2. **Tag messages with an epoch** (which page state they belong to)
3. **Include freshness metadata in responses** so agents understand context

### Component 1: Page State Tracking

Add to `Connection` interface in `types.ts`:

```typescript
interface Connection {
  // ... existing fields ...

  /** Navigation epoch - increments on each full navigation/reload */
  navigationEpoch: number;
  /** Timestamp of last navigation */
  lastNavigationTime: number;
  /** HMR update count since last navigation */
  hmrUpdateCount: number;
  /** Timestamp of last HMR update */
  lastHmrTime: number | null;
}
```

Update `ConsoleMessage` interface:

```typescript
interface ConsoleMessage {
  // ... existing fields ...

  /** Navigation epoch when message was captured */
  navigationEpoch: number;
}
```

### Component 2: Navigation Event Listeners

In `BrowserManager.connect()` and `BrowserManager.switchPage()`, add listeners:

```typescript
// Full page navigation (not hash changes)
page.on('framenavigated', async (frame) => {
  if (frame === page.mainFrame()) {
    // Check if this is a real navigation (not hash change)
    const request = frame.request();
    if (request && request.isNavigationRequest()) {
      connection.navigationEpoch++;
      connection.lastNavigationTime = Date.now();
      connection.hmrUpdateCount = 0;
      connection.lastHmrTime = null;

      // Clear pre-navigation messages
      connection.consoleLogs = [];
    }
  }
});

// Alternative: listen for 'load' event for full reloads
page.on('load', () => {
  connection.navigationEpoch++;
  connection.lastNavigationTime = Date.now();
  connection.hmrUpdateCount = 0;
  connection.lastHmrTime = null;
  connection.consoleLogs = [];
});
```

### Component 3: HMR Detection via Console Messages

HMR frameworks log characteristic messages like:
- `[HMR] Waiting for update signal from WDS...`
- `[WDS] Hot Module Replacement enabled`
- `[vite] hot updated: /src/App.tsx`

When capturing console messages, detect HMR patterns:

```typescript
page.on('console', (msg) => {
  const text = msg.text();
  const isHmr = /^\[(HMR|WDS|vite)\]/.test(text);

  if (isHmr && text.includes('updated')) {
    connection.hmrUpdateCount++;
    connection.lastHmrTime = Date.now();
  }

  connection.consoleLogs.push({
    level: msg.type(),
    text: text,
    timestamp: Date.now(),
    navigationEpoch: connection.navigationEpoch,
    isHmrMessage: isHmr,
  });
});
```

### Component 4: Freshness Context in get_console_logs Response

Modify `getConsoleLogs` to include freshness header:

```typescript
export async function getConsoleLogs(args: { ... }): Promise<...> {
  // ... existing filtering logic ...

  const connection = browserManager.getConnection(args.connection_id);
  const output: string[] = [];

  // Freshness header
  output.push('--- PAGE STATE ---');
  output.push(`Navigation epoch: ${connection.navigationEpoch}`);
  output.push(`Last navigation: ${formatTimeSince(connection.lastNavigationTime)}`);

  if (connection.hmrUpdateCount > 0) {
    output.push(`HMR updates since navigation: ${connection.hmrUpdateCount}`);
    output.push(`Last HMR update: ${formatTimeSince(connection.lastHmrTime)}`);
    output.push('[Note: Modules have been rebuilt since last check]');
  }

  output.push('--- CONSOLE MESSAGES ---');

  // Filter to current epoch by default
  const currentEpochLogs = filteredLogs.filter(
    log => log.navigationEpoch === connection.navigationEpoch
  );

  // ... rest of formatting ...
}
```

### Component 5: Query State Tracking

Track when the agent last queried to provide delta information:

```typescript
interface Connection {
  /** Timestamp of last get_console_logs call */
  lastConsoleQuery: number | null;
  /** Navigation epoch at last query */
  lastQueryEpoch: number | null;
}
```

In response:

```typescript
if (connection.lastQueryEpoch !== null) {
  if (connection.lastQueryEpoch < connection.navigationEpoch) {
    output.push('[PAGE RELOADED since your last query]');
  } else if (connection.hmrUpdateCount > 0 && connection.lastHmrTime > connection.lastConsoleQuery) {
    output.push('[HMR UPDATE occurred since your last query]');
  } else {
    output.push('[No navigation or HMR changes since your last query]');
  }
}
```

## Implementation Sequence

### Phase 1: Type Updates
1. Update `Connection` interface with new tracking fields
2. Update `ConsoleMessage` interface with `navigationEpoch`
3. Initialize new fields in `connect()` and `launch()`

### Phase 2: Navigation Tracking
1. Add `page.on('load')` listener in `connect()`
2. Add same listener in `switchPage()`
3. Clear console logs on navigation
4. Increment navigation epoch

### Phase 3: HMR Detection
1. Add HMR pattern detection in console listener
2. Track HMR update counts and timestamps
3. Tag HMR messages for optional filtering

### Phase 4: Response Enhancement
1. Add freshness header to `getConsoleLogs` output
2. Filter to current epoch by default
3. Add delta information vs last query
4. Format timestamps as relative time

### Phase 5: Testing
1. Manual test with page reload
2. Manual test with Vite/webpack HMR
3. Verify agent receives clear freshness context

## Files to Modify

| File | Changes |
|------|---------|
| `src/types.ts` | Add tracking fields to `Connection` and `ConsoleMessage` |
| `src/browser.ts` | Add navigation/HMR listeners, update connect/switchPage |
| `src/tools/dom.ts` | Update `getConsoleLogs` output format |

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| `page.on('load')` not firing on SPA routes | Medium | Medium | Use `framenavigated` as backup |
| HMR patterns vary by framework | Medium | Low | Support common patterns, extensible list |
| Breaking change to response format | Low | Medium | Format is informational, not parsed |

## Success Criteria

1. After a page reload, agent sees `[PAGE RELOADED since your last query]`
2. After HMR update, agent sees `[HMR UPDATE occurred since your last query]`
3. Old messages from pre-reload are filtered out by default
4. Agent never wastes time investigating stale errors
5. Agent never kills browser thinking old errors persist

## Estimated Effort

- Phase 1: ~30 min
- Phase 2: ~45 min
- Phase 3: ~30 min
- Phase 4: ~45 min
- Phase 5: ~30 min
- **Total: ~3 hours**
