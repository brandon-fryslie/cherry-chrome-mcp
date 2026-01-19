# Holistic Error Handling for Chrome Connection State

## Problem Statement

The MCP server has inconsistent behavior when Chrome is not connected:
- `navigate` properly returns `CONNECTION_REFUSED` errors
- `query_elements` returns 0 elements (silent failure, misleading)
- Debugger tools return "Debugger not enabled" when the real issue is "No connection"

This causes agents to waste tool calls with misleading feedback.

## Root Cause Analysis

### Current Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           Tool Functions                                 │
│  (dom.ts, debugger.ts, chrome.ts)                                       │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  queryElements()    →  getPage()      →  throws if null                 │
│  clickElement()     →  getPage()      →  throws if null                 │
│  navigate()         →  getPage()      →  throws if null                 │
│  getConsoleLogs()   →  explicit check →  errorResponse if null ✓        │
│                                                                          │
│  step()             →  getCDPSession() →  "Debugger not enabled" (WRONG)│
│  execution()        →  getCDPSession() →  "Debugger not enabled" (WRONG)│
│  evaluate()         →  getCDPSession() →  "Debugger not enabled" (WRONG)│
│                                                                          │
├─────────────────────────────────────────────────────────────────────────┤
│                        BrowserManager                                    │
│  (browser.ts)                                                           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  getConnection()    →  returns null (caller must check)                 │
│  getPage()          →  returns null (caller must check)                 │
│  getCDPSession()    →  returns null (TWO reasons: no conn OR no debug)  │
│  enableDebugger()   →  throws if no connection ✓                        │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### The Core Issue: `getCDPSession()` Returns Null for Two Reasons

1. **No connection exists** → Should say: "No Chrome connection. Use chrome() first."
2. **Connection exists but debugger not enabled** → Should say: "Debugger not enabled. Call enable_debug_tools() first."

Current code conflates these two cases into one error message.

## Proposed Solution

### Design Principle: Single Enforcer

Apply the universal law: "Any cross-cutting invariant is enforced at exactly one boundary."

**The boundary:** BrowserManager methods will throw descriptive errors rather than returning null. The error message will be specific and actionable.

### Changes

#### 1. Add Connection State Type

```typescript
// src/types.ts
export type ConnectionRequirement =
  | 'connection-only'      // Just need browser/page
  | 'debugger-enabled'     // Need CDP session + debugger enabled
  | 'debugger-paused';     // Need to be paused at a breakpoint
```

#### 2. Add BrowserManager Validation Methods

```typescript
// src/browser.ts

/**
 * Get connection or throw with clear error message.
 * SINGLE ENFORCER: All tools that need a connection call this.
 */
getConnectionOrThrow(connectionId?: string): Connection {
  const connection = this.getConnection(connectionId);
  if (!connection) {
    const id = connectionId || 'default';
    throw new ChromeNotConnectedError(
      `No Chrome connection '${id}' found.\n\n` +
      `To connect:\n` +
      `  1. Start Chrome with: google-chrome --remote-debugging-port=9222\n` +
      `  2. Call: chrome({ action: "connect" }) or chrome({ action: "launch" })`
    );
  }
  return connection;
}

/**
 * Get page or throw with clear error message.
 * Uses getConnectionOrThrow internally.
 */
getPageOrThrow(connectionId?: string): Page {
  const connection = this.getConnectionOrThrow(connectionId);
  return connection.page;
}

/**
 * Get CDP session or throw with DIFFERENTIATED error messages.
 * Distinguishes between "no connection" vs "debugger not enabled".
 */
getCDPSessionOrThrow(connectionId?: string): CDPSession {
  const connection = this.getConnectionOrThrow(connectionId); // Throws if no connection

  if (!connection.cdpSession || !connection.debuggerEnabled) {
    throw new DebuggerNotEnabledError(
      `Debugger not enabled for connection '${connectionId || 'default'}'.\n\n` +
      `Call enable_debug_tools() first to enable the JavaScript debugger.`
    );
  }
  return connection.cdpSession;
}

/**
 * Verify execution is paused or throw.
 */
requirePaused(connectionId?: string): DebuggerPausedEvent {
  this.getCDPSessionOrThrow(connectionId); // Ensures debugger is enabled first

  const pausedData = this.getPausedData(connectionId);
  if (!pausedData) {
    throw new ExecutionNotPausedError(
      `Execution is not paused.\n\n` +
      `To pause:\n` +
      `  - Set a breakpoint: breakpoint({ action: "set", url: "...", line_number: N })\n` +
      `  - Or call: execution({ action: "pause" })`
    );
  }
  return pausedData;
}
```

#### 3. Define Custom Error Classes

```typescript
// src/errors.ts (NEW FILE)

export class ChromeNotConnectedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ChromeNotConnectedError';
  }
}

export class DebuggerNotEnabledError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DebuggerNotEnabledError';
  }
}

export class ExecutionNotPausedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ExecutionNotPausedError';
  }
}
```

#### 4. Update Tool Functions

**DOM Tools (dom.ts):**

```typescript
// Remove the existing getPage() wrapper function
// Use browserManager.getPageOrThrow() directly

export async function queryElements(args: { ... }) {
  try {
    const page = browserManager.getPageOrThrow(args.connection_id);
    // ... rest of implementation
  } catch (error) {
    return errorResponse(`${error instanceof Error ? error.message : error}`);
  }
}
```

**Debugger Tools (debugger.ts):**

```typescript
export async function step(args: { ... }) {
  try {
    // This will throw ChromeNotConnectedError if no connection
    // OR DebuggerNotEnabledError if debugger not enabled
    const cdpSession = browserManager.getCDPSessionOrThrow(args.connection_id);

    // This will throw ExecutionNotPausedError if not paused
    browserManager.requirePaused(args.connection_id);

    // ... rest of implementation
  } catch (error) {
    return errorResponse(`${error instanceof Error ? error.message : error}`);
  }
}
```

### Error Message Examples

**Before (Confusing):**
```
"Debugger not enabled. Call debugger_enable() first."
```

**After (Clear & Actionable):**

When no Chrome connection:
```
No Chrome connection 'default' found.

To connect:
  1. Start Chrome with: google-chrome --remote-debugging-port=9222
  2. Call: chrome({ action: "connect" }) or chrome({ action: "launch" })
```

When connected but debugger not enabled:
```
Debugger not enabled for connection 'default'.

Call enable_debug_tools() first to enable the JavaScript debugger.
```

When debugger enabled but not paused:
```
Execution is not paused.

To pause:
  - Set a breakpoint: breakpoint({ action: "set", url: "...", line_number: N })
  - Or call: execution({ action: "pause" })
```

## Implementation Plan

### Phase 1: Foundation
1. Create `src/errors.ts` with custom error classes
2. Add `*OrThrow` methods to BrowserManager
3. Update exports in `src/browser.ts`

### Phase 2: DOM Tools
4. Update `queryElements` to use `getPageOrThrow`
5. Update `clickElement` to use `getPageOrThrow`
6. Update `fillElement` to use `getPageOrThrow`
7. Update `navigate` to use `getPageOrThrow`
8. Update `getConsoleLogs` to use `getConnectionOrThrow`

### Phase 3: Debugger Tools (Consolidated)
9. Update `step` to use `getCDPSessionOrThrow` + `requirePaused`
10. Update `execution` to use `getCDPSessionOrThrow`
11. Update `evaluate` to use `getCDPSessionOrThrow`
12. Update `callStack` to use `requirePaused`
13. Update `pauseOnExceptions` to use `getCDPSessionOrThrow`
14. Update `breakpoint` to use `getCDPSessionOrThrow` (for remove) or `getConnectionOrThrow` (for set via enableDebugger)

### Phase 4: Debugger Tools (Legacy)
15. Update `debuggerRemoveBreakpoint` to use `getCDPSessionOrThrow`
16. Update `debuggerGetCallStack` to use `requirePaused`
17. Update `debuggerEvaluateOnCallFrame` to use `getCDPSessionOrThrow`
18. Update `debuggerStepOver/Into/Out` to use `getCDPSessionOrThrow` + `requirePaused`
19. Update `debuggerResume` to use `getCDPSessionOrThrow` + `requirePaused`
20. Update `debuggerPause` to use `getCDPSessionOrThrow`
21. Update `debuggerSetPauseOnExceptions` to use `getCDPSessionOrThrow`

### Phase 5: Validation & Cleanup
22. Remove the local `getPage()` wrapper from `dom.ts`
23. Test all error paths manually with MCP Inspector
24. Verify error messages are clear and actionable

## Files to Modify

| File | Changes |
|------|---------|
| `src/errors.ts` | NEW - Custom error classes |
| `src/browser.ts` | Add `*OrThrow` methods |
| `src/tools/dom.ts` | Use `getPageOrThrow`, remove local `getPage` |
| `src/tools/debugger.ts` | Use `getCDPSessionOrThrow`, `requirePaused` |

## Non-Goals

- Not changing the return type of existing null-returning methods (backwards compatibility)
- Not adding new tools
- Not changing tool signatures

## Success Criteria

1. When Chrome is not connected, ALL tools return a clear error mentioning `chrome()` or `chrome_connect()`
2. When debugger is not enabled, debugger tools mention `enable_debug_tools()`
3. When execution is not paused, stepping tools mention `breakpoint()` or `execution({ action: "pause" })`
4. No tool returns misleading "0 results" or empty data when the real issue is connection state
5. Error messages include actionable next steps
