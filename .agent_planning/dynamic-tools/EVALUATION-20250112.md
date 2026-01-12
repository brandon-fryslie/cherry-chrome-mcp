# Dynamic MCP Tool Visibility - Evaluation
**Date:** 2025-01-12  
**Topic Directory:** `.agent_planning/dynamic-tools/`

## Executive Summary

The cherry-chrome-mcp server can implement dynamic tool visibility using MCP's `list_changed` notifications. The infrastructure is **nearly ready**: the MCP SDK provides the `sendToolListChanged()` method on the Server class, and the BrowserManager already tracks all necessary state changes. The main work is connecting these pieces and defining visibility rules.

**Token Efficiency Gain:** Hiding contextually-irrelevant tools could save ~5-10% of context window on typical operations by not exposing 23 tools when only 5-8 are relevant at any moment.

---

## Current State Analysis

### 1. Tool Registration (src/index.ts)

**Status:** Static, hardcoded list

- **Lines 57-521:** `ListToolsRequestSchema` handler returns all 23 tools unconditionally
- All tools always visible regardless of connection state
- Tool definitions are hand-written in the handler (no separate definitions or categories)

**Problem:** The handler is a 461-line function that:
- Duplicates all tool definitions inline
- Has no conditional logic based on state
- Returns the same tool list on every request

**What exists:**
```typescript
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools: [ /* all 23 tools */ ] };
});
```

**What's needed:**
```typescript
server.setRequestHandler(ListToolsRequestSchema, async () => {
  const visibleTools = getVisibleTools();  // compute based on state
  return { tools: visibleTools };
});
```

### 2. State Tracking (src/browser.ts)

**Status:** Complete and comprehensive

The `BrowserManager` class tracks all necessary state:

| State | Property | Lines | Type | Purpose |
|-------|----------|-------|------|---------|
| **Connection Count** | `connections: Map<string, Connection>` | 69 | `Map` | Tracks all active connections |
| **Active Connection** | `activeConnectionId: string \| null` | 70 | `string \| null` | Current active connection |
| **Debugger Enabled** | `connection.debuggerEnabled` | 128 | `boolean` | Per-connection debugger state |
| **Paused State** | `connection.pausedData` | 126 | `DebuggerPausedEvent \| null` | When execution is paused at breakpoint |
| **Breakpoints** | `connection.breakpoints` | 127 | `Map<string, BreakpointInfo>` | Active breakpoints per connection |
| **Console Logs** | `connection.consoleLogs` | 129 | `ConsoleMessage[]` | Captured console output |

**Methods that modify state:**
- `connect()` (line 80) - adds connection, sets as active
- `launch()` (line 175) - adds connection after launch
- `disconnect()` (line 268) - removes connection, updates active
- `switchActive()` (line 349) - changes active connection
- `enableDebugger()` (line 398) - sets `debuggerEnabled = true`, creates CDP session
- `switchPage()` (line 529) - resets debugger state when switching pages

**State query methods exist:**
- `hasConnections()` (line 388)
- `listConnections()` (line 363)
- `getActive()` (line 313)
- `isPaused()` (line 481)
- `getCdpSession()` (line 441)

### 3. MCP SDK Capabilities

**Status:** Available and documented

From `/node_modules/@modelcontextprotocol/sdk/dist/esm/server/index.d.ts`:

```typescript
class Server {
  // ... other methods ...
  
  /**
   * Sends a notification to the client that the resource list has changed
   */
  sendResourceListChanged(): Promise<void>;
  
  /**
   * Sends a notification to the client that the tool list has changed
   */
  sendToolListChanged(): Promise<void>;
  
  /**
   * Sends a notification to the client that the prompt list has changed
   */
  sendPromptListChanged(): Promise<void>;
}
```

**Protocol:**
1. Server calls `sendToolListChanged()` to notify client
2. Client receives `notifications/tools/list_changed` notification
3. Client requests updated tool list via `tools/list` request
4. Server handler runs and returns new list based on current state

**Requirement:** MCP specifies that the `capabilities.tools` in server initialization must include:
```json
{
  "capabilities": {
    "tools": {}
  }
}
```
This is already present (line 50-52 in index.ts).

---

## What Exists

### Infrastructure

1. **BrowserManager state tracking** ✓
   - Tracks all connections, debugger state, breakpoints, pause state
   - Provides query methods for all relevant state
   - Has no knowledge of tool visibility rules

2. **Server initialization** ✓
   - MCP SDK Server class instantiated
   - `tools: {}` capability declared
   - StdioServerTransport for communication

3. **MCP SDK notification support** ✓
   - `sendToolListChanged()` method available on Server instance
   - SDK handles protocol-level details

4. **Tool definitions** ✓
   - All 23 tools defined and implemented
   - Can reference their implementations

5. **Global browserManager instance** ✓
   - Exported at module level (line 568 in browser.ts)
   - Can be imported to check state in index.ts

---

## What's Missing

### 1. Tool Definition Extraction

**Problem:** Tool definitions are embedded in the `ListToolsRequestSchema` handler as inline objects. This makes it hard to:
- Reference them elsewhere
- Filter them conditionally
- Keep them in sync with implementations

**Solution:** Create a separate tool definitions module

**File:** `src/tools/definitions.ts` (new)
- Export array of all tool definitions: `const ALL_TOOLS: ToolDefinition[]`
- Keep type-safe with schema compatibility
- Update handler to use: `return { tools: ALL_TOOLS };`

### 2. Visibility Rules

**Problem:** No logic to determine which tools should be visible given current state

**Solution:** Create visibility strategy module with clear rules

**File:** `src/tools/visibility.ts` (new)
- Export `getVisibleTools(state: ToolState): ToolDefinition[]`
- Implement visibility rules:

```typescript
export interface ToolState {
  hasConnections: boolean;
  hasActiveConnection: boolean;
  debuggerEnabled: boolean;
  isPaused: boolean;
}

export const VISIBILITY_RULES = {
  // Connection tools always visible
  chrome_connect: () => true,
  chrome_launch: () => true,
  chrome_list_connections: () => true,
  chrome_disconnect: (state) => state.hasConnections,
  chrome_switch_connection: (state) => state.hasConnections > 1,  // only if multiple
  
  // Target management requires connection
  list_targets: (state) => state.hasActiveConnection,
  switch_target: (state) => state.hasActiveConnection,
  
  // DOM tools require active connection
  query_elements: (state) => state.hasActiveConnection,
  click_element: (state) => state.hasActiveConnection,
  fill_element: (state) => state.hasActiveConnection,
  navigate: (state) => state.hasActiveConnection,
  get_console_logs: (state) => state.hasActiveConnection,
  
  // Debugger tools: hidden until debugger_enable is called
  debugger_enable: (state) => state.hasActiveConnection && !state.debuggerEnabled,
  debugger_pause: (state) => state.debuggerEnabled && !state.isPaused,
  debugger_resume: (state) => state.isPaused,
  debugger_step_over: (state) => state.isPaused,
  debugger_step_into: (state) => state.isPaused,
  debugger_step_out: (state) => state.isPaused,
  debugger_get_call_stack: (state) => state.isPaused,
  debugger_set_breakpoint: (state) => state.debuggerEnabled,
  debugger_remove_breakpoint: (state) => state.debuggerEnabled,
  debugger_evaluate_on_call_frame: (state) => state.isPaused,
  debugger_set_pause_on_exceptions: (state) => state.debuggerEnabled,
};
```

### 3. State-to-Notification Bridge

**Problem:** State changes in BrowserManager don't trigger notifications

**Solution:** Hook into BrowserManager to emit notifications

**Options:**
A. **EventEmitter approach:** Add EventEmitter to BrowserManager, emit on state changes
B. **Callback approach:** Pass notification callback to BrowserManager methods
C. **Hybrid approach:** Use both - EventEmitter for clean API, with Server subscribing

**Recommended: Option C (Hybrid)**

**In src/browser.ts:**
```typescript
import { EventEmitter } from 'events';

export class BrowserManager extends EventEmitter {
  // ... existing code ...
  
  async connect(...) {
    // ... existing connection code ...
    this.emit('stateChanged');  // after adding connection
  }
  
  async enableDebugger(...) {
    // ... existing debugger code ...
    this.emit('stateChanged');  // after enabling
  }
  
  async disconnect(...) {
    // ... existing disconnect code ...
    this.emit('stateChanged');  // after removing
  }
  
  // ... other state-changing methods ...
}
```

**In src/index.ts:**
```typescript
import { browserManager } from './browser.js';
import { sendToolListChanged } from '@modelcontextprotocol/sdk/server/index.js';

// After server is created:
browserManager.on('stateChanged', async () => {
  await server.sendToolListChanged();
});
```

### 4. Integration in ListToolsHandler

**File:** `src/index.ts`, lines 57-521

**Problem:** Handler doesn't use visibility rules

**Solution:**
```typescript
import { getVisibleTools, getToolState } from './tools/visibility.js';

server.setRequestHandler(ListToolsRequestSchema, async () => {
  const state = getToolState(browserManager);
  const visibleTools = getVisibleTools(state);
  return { tools: visibleTools };
});
```

---

## Implementation Approach

### Phase 1: Foundations (Order of Implementation)

1. **Extract tool definitions** (30 min)
   - Move all tool definition objects to `src/tools/definitions.ts`
   - Export as `ALL_TOOLS: ToolDefinition[]`
   - Update handler to reference them

2. **Create visibility module** (30 min)
   - Create `src/tools/visibility.ts`
   - Define `ToolState` interface
   - Implement `getVisibleTools(state)` and `getToolState(browserManager)`
   - Write visibility rules

3. **Add EventEmitter to BrowserManager** (30 min)
   - Import `EventEmitter` from 'events'
   - Extend BrowserManager to emit 'stateChanged'
   - Add emit calls in 6 key methods:
     - `connect()`, `launch()` (add)
     - `disconnect()` (remove)
     - `switchActive()` (change active)
     - `enableDebugger()` (enable debugger)
     - `switchPage()` (reset debugger)

4. **Wire up notifications** (20 min)
   - Import visibility functions in index.ts
   - Update ListToolsHandler to use visibility
   - Subscribe to browserManager.on('stateChanged')
   - Call server.sendToolListChanged()

5. **Test** (45 min)
   - Build and verify compilation
   - Manual testing with inspector
   - Verify tools appear/disappear on state changes

**Total:** ~2.5 hours of focused implementation

### Phase 2: Refinement (Optional, can defer)

1. Customize visibility rules based on usage patterns
2. Add metrics/logging for visibility changes
3. Consider caching of visible tools (if list_tools calls are frequent)
4. Document rules in README

---

## Dependencies and Risks

### Dependencies

| Component | Dependency | Status |
|-----------|-----------|--------|
| EventEmitter | Node.js built-in | ✓ Already available |
| MCP SDK notification | @modelcontextprotocol/sdk | ✓ Already available |
| State query methods | BrowserManager | ✓ All exist |
| TypeScript | project setup | ✓ Already configured |

**No external dependencies needed.**

### Risks and Mitigations

| Risk | Severity | Mitigation |
|------|----------|-----------|
| **Hidden tool confuses user** | Medium | Clear documentation, tool descriptions explain requirements |
| **Too aggressive hiding** | Medium | Start with conservative rules, iterate on feedback |
| **EventEmitter memory leaks** | Low | Unsubscribe on server shutdown, limit listeners |
| **Client caches old tool list** | Low | MCP protocol handles; client re-queries after notification |
| **Tool state checker has bugs** | Medium | Comprehensive unit tests for getToolState/getVisibleTools |
| **Notification storm** (too many calls) | Low | Debounce if multiple state changes in rapid succession |
| **Breaks existing integrations** | Medium | All tools still work, just hidden; no functional change |

### Mitigation for "Hidden tool confuses user"

Each tool description in hidden state should be clear:
- ✓ **Already good:** "Debugger must be enabled first" (line 332 in index.ts)
- ✓ **Already good:** "Connect to a Chrome instance" (line 63 implies need for connection)
- Recommendation: Add explicit "(requires active connection)" to DOM tool descriptions

---

## Ambiguities Requiring Resolution

### 1. Multiple Connections - When Should Multiple Connection Tools Be Visible?

**Current assumption:** `chrome_switch_connection` only visible if 2+ connections exist

**Alternative:** Always show it, with handler returning error if < 2 connections

**Decision needed:** UX preference - do we want to minimize tool list or accept error messages?

**Recommendation:** Hide it when < 2 connections (minimizes clutter)

---

### 2. Debugger Re-enable After Disconnect

**Current assumption:** If debugger was enabled and connection switches or page switches, debugger becomes hidden

**Scenario:** User enables debugger, switches to different connection (which never had debugger enabled), then wants to use debugger on new connection

**Questions:**
- Should debugger tools be visible for new connection even though not enabled?
- Or should they only become visible after `debugger_enable` is called on new connection?

**Recommendation:** Visible only after enabling on that connection (clean state separation, prevents errors)

---

### 3. Paused State Visibility - Too Granular?

**Current assumption:** Some tools only visible when paused (step_over, step_into, etc.)

**Alternative:** These tools visible whenever debugger enabled, with handler returning error if not paused

**Trade-off:**
- Current: Cleaner tool list, but requires state knowledge
- Alternative: Simpler rules, but exposes tools in wrong mode

**Recommendation:** Current approach (show only when paused) - UX is better

---

### 4. Debouncing - How Aggressive?

**Current assumption:** No debouncing, notify immediately on each state change

**Problem:** What if user calls `connect()`, `switchActive()`, `enableDebugger()` in rapid succession? Three notifications = three re-queries.

**Options:**
- No debouncing (simple, potentially noisy)
- 100ms debounce (small delay, groups rapid changes)
- 500ms debounce (more aggressive, might feel sluggish)

**Recommendation:** Start with no debouncing, add if performance becomes issue

---

### 5. Document Visibility Requirements in Tool Descriptions?

**Current state:** Tool descriptions mention some requirements ("must be called before", "use active if not specified")

**Question:** Should we update ALL descriptions to be explicit about visibility requirements?

**Example:**
- Before: "Find elements by CSS selector..."
- After: "Find elements by CSS selector... **(Requires active Chrome connection)**"

**Recommendation:** Yes, update descriptions for clarity and user education

---

## Testing Strategy

### Unit Tests

1. **getToolState(browserManager) → ToolState**
   - Test with no connections
   - Test with active connection
   - Test with debugger enabled
   - Test with execution paused

2. **getVisibleTools(state) → ToolDefinition[]**
   - Test each rule independently
   - Verify correct tools for each state combination
   - Verify exact counts (shouldn't have missed any tools)

3. **EventEmitter integration**
   - Mock BrowserManager
   - Verify 'stateChanged' emits in each method
   - Verify Server.sendToolListChanged() called

### Integration Tests

1. **Full workflow with Inspector**
   - Start server
   - Check initial tool list (connection tools only)
   - Call chrome_launch
   - Verify DOM tools now visible
   - Call debugger_enable
   - Verify debugger tools now visible
   - Pause execution
   - Verify step/resume tools visible
   - Resume execution
   - Verify step tools hidden again

### Snapshot Tests (Optional)

Store expected tool lists for each state combination:
```typescript
{
  "state:no-connections": ["chrome_connect", "chrome_launch"],
  "state:connected-no-debugger": [...],
  "state:debugger-running": [...],
  "state:debugger-paused": [...]
}
```

---

## Success Criteria

1. **Compilation:** TypeScript compiles without errors
2. **Visibility:** Tools correctly appear/disappear based on state
3. **No Regression:** All existing tools still function when visible
4. **Performance:** sendToolListChanged() calls don't impact user experience
5. **Clear Documentation:** Users understand why tools are hidden
6. **Testing:** Unit tests + integration test pass

---

## Estimated Token Impact

**Current state:** All 23 tools visible at startup

**With dynamic visibility:**

| Scenario | Tools Visible | Expected % of 23 | Token Saving |
|----------|---------------|------------------|--------------|
| No connection | 2-3 (connect, launch, list) | 10% | 90% |
| Connected, no debugger | 7-8 (conn + DOM + list) | 35% | 65% |
| Debugger enabled | 18-20 (all except pause/step*) | 85% | 15% |
| Debugger paused | All 23 | 100% | 0% |
| Multiple connections | 8-9 | 35-40% | 60-65% |

**Average savings across typical session:** ~10-15% of tool list overhead

(Tool list is typically 2-5% of total context; saving 10% of that = 0.2-0.5% total context savings)

---

## Files to Create/Modify

### New Files
- `src/tools/definitions.ts` - Extract and export all tool definitions
- `src/tools/visibility.ts` - Visibility rules and state checker
- `tests/visibility.test.ts` - Unit tests (if adding test framework)

### Modified Files
- `src/browser.ts` - Add EventEmitter, emit 'stateChanged'
- `src/index.ts` - Update ListToolsHandler, wire up notifications, subscribe to state changes
- `src/types.ts` - May need to export ToolState type (or keep in visibility.ts)

### Unchanged Files
- All tool implementations (chrome.ts, dom.ts, debugger.ts)
- config.ts, response.ts
- package.json (no new dependencies)

---

## Next Steps (If Approved)

1. **Decision:** Clarify ambiguities above (especially #1-5)
2. **Implementation:** Follow Phase 1 in Implementation Approach section
3. **Code Review:** Have someone review visibility rules for edge cases
4. **Testing:** Run integration tests with MCP Inspector
5. **Iterate:** Gather feedback and refine rules

---

## Conclusion

The cherry-chrome-mcp project has **all the building blocks** for dynamic tool visibility. The state tracking is comprehensive, the MCP SDK support is available, and there are no external dependencies required.

The work is straightforward but requires careful attention to:
1. Visibility rule design (is the rule matrix correct?)
2. State synchronization (do we emit notifications at the right times?)
3. Documentation (users need to understand why tools appear/disappear)

**Recommendation:** Proceed with implementation - this is a high-value, low-risk improvement that enhances UX and saves context.
