# Implementation Context: Remove Dynamic Tool Loading

**Sprint:** Remove Dynamic Tool Loading
**Generated:** 2026-01-18

## Overview

This refactoring removes the experimental dynamic tool visibility feature and simplifies the codebase by making tool registration static. It also renames the environment variable to better reflect its purpose.

## Key Concepts

### Current Architecture (To Be Removed)

The system currently has a complex state-based tool filtering mechanism:

1. **State Tracking:** BrowserManager tracks connection state, debugger state, and pause state
2. **Callback Mechanism:** When state changes, BrowserManager notifies index.ts
3. **Dynamic Filtering:** `getVisibleSmartTools()` filters the tool list based on state
4. **Tool Visibility:** Different tools appear/disappear as state changes

**Example Flow:**
```
No connection → Only chrome, chrome_list_connections visible
↓ (connect)
Connected → Add DOM tools, target, enable_debug_tools
↓ (enable debugger)
Debug enabled → Add breakpoint, execution, pause_on_exceptions
↓ (hit breakpoint)
Paused → Show only step, execution, evaluate, call_stack
```

### Target Architecture (After Refactoring)

Simplified static tool registration:

1. **Static Arrays:** Two predefined tool arrays (legacy and smart)
2. **Simple Selection:** Choose array based on environment variable
3. **No Filtering:** All tools in selected mode always visible
4. **No Callbacks:** No state change notifications needed

**Flow:**
```
USE_LEGACY_TOOLS=true → Always show all 23 legacy tools
USE_LEGACY_TOOLS=false → Always show all 16 smart tools
```

## File-by-File Implementation Guide

### 1. `src/config.ts`

**Current State:**
```typescript
export const USE_SMART_TOOLS = process.env.USE_SMART_TOOLS === 'true' || process.env.USE_SMART_TOOLS === '1';
```

**Changes:**
1. Rename constant to `USE_LEGACY_TOOLS`
2. Keep same parsing logic (checks for 'true' or '1')
3. Update JSDoc comment to explain:
   - Default is `false` (smart tools)
   - Set to `true` for legacy tools
   - Inverted from previous `USE_SMART_TOOLS`

**Target State:**
```typescript
/**
 * Feature toggle: Use legacy granular tools instead of smart consolidated tools.
 *
 * When false (default): Uses new consolidated smart tools
 *   - chrome (replaces chrome_connect, chrome_launch)
 *   - target (replaces list_targets, switch_target)
 *   - step (replaces debugger_step_over, debugger_step_into, debugger_step_out)
 *   - execution (replaces debugger_resume, debugger_pause)
 *   - breakpoint (replaces debugger_set_breakpoint, debugger_remove_breakpoint)
 *   - enable_debug_tools (replaces debugger_enable with semantic intent)
 *   - call_stack, evaluate, pause_on_exceptions (renamed for consistency)
 *
 * When true: Uses original granular tools for backward compatibility
 *   - chrome_connect, chrome_launch, chrome_disconnect, etc.
 *   - debugger_enable, debugger_step_over, debugger_step_into, etc.
 *
 * Set via environment variable: USE_LEGACY_TOOLS=true
 */
export const USE_LEGACY_TOOLS = process.env.USE_LEGACY_TOOLS === 'true' || process.env.USE_LEGACY_TOOLS === '1';
```

### 2. `src/index.ts`

**Line-by-Line Changes:**

**Line 18:** Import statement
```typescript
// Before
import { USE_SMART_TOOLS } from './config.js';

// After
import { USE_LEGACY_TOOLS } from './config.js';
```

**Lines 33-34:** Remove imports
```typescript
// Before
import {
  // ... other imports ...
  hideTools,
  showTools,
  // ... other imports ...
} from './tools/index.js';

// After
import {
  // ... other imports ...
  // hideTools and showTools removed
  // ... other imports ...
} from './tools/index.js';
```

**Lines 978-1014:** Remove from `smartTools` array
```typescript
// Remove these two tool definitions:
{
  name: 'hide_tools',
  description: '...',
  inputSchema: { ... }
},
{
  name: 'show_tools',
  description: '...',
  inputSchema: { ... }
}
```

**Line 1018:** Invert tool selection logic
```typescript
// Before
const activeTools = USE_SMART_TOOLS ? smartTools : legacyTools;

// After
const activeTools = USE_LEGACY_TOOLS ? legacyTools : smartTools;
```

**Lines 1029-1078:** Delete entire function
```typescript
// DELETE THIS ENTIRE FUNCTION
function getVisibleSmartTools(): Tool[] {
  if (!USE_SMART_TOOLS) {
    return activeTools;
  }

  const hasConnection = browserManager.hasConnections();
  const debugEnabled = browserManager.isDebuggerEnabled();
  const isPaused = browserManager.isPaused();

  const visibleTools = activeTools.filter(tool => {
    // ... filtering logic ...
  });

  return visibleTools;
}
```

**Lines 1081-1089:** Simplify handler
```typescript
// Before
server.setRequestHandler(ListToolsRequestSchema, async () => {
  if (!USE_SMART_TOOLS) {
    return { tools: activeTools };
  }

  // P1: Use state-based filtering for smart tools
  const visibleTools = getVisibleSmartTools();
  return { tools: visibleTools };
});

// After
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools: activeTools };
});
```

**Lines 1096, 1167:** Invert conditionals (both switch statement entries)
```typescript
// Before
if (USE_SMART_TOOLS) {
  // Smart tools routing
} else {
  // Legacy tools routing
}

// After
if (USE_LEGACY_TOOLS) {
  // Legacy tools routing
} else {
  // Smart tools routing
}
```

**Lines 1158-1162:** Remove from smart tools switch
```typescript
// DELETE THESE CASES
case 'hide_tools':
  return await hideTools(args as Parameters<typeof hideTools>[0]);

case 'show_tools':
  return await showTools(args as Parameters<typeof showTools>[0]);
```

**Lines 1284-1299:** Remove callback registration
```typescript
// DELETE THIS ENTIRE BLOCK
if (USE_SMART_TOOLS) {
  browserManager.setToolListChangedCallback(() => {
    console.error('[DEBUG] Tool list changed, sending notification...');

    const notification = {
      jsonrpc: '2.0',
      method: 'notifications/tools/list_changed'
    };
    console.log(JSON.stringify(notification));

    server.sendToolListChanged().catch(err =>
      console.error('Failed to notify tool list change:', err)
    );
  });
}
```

**Line 1301:** Update mode display
```typescript
// Before
const mode = USE_SMART_TOOLS ? 'SMART TOOLS' : 'LEGACY TOOLS';
console.error(`Cherry Chrome MCP Server running on stdio [MODE: ${mode}]`);
console.error(`Set USE_SMART_TOOLS=true to enable consolidated smart tools`);

// After
const mode = USE_LEGACY_TOOLS ? 'LEGACY TOOLS' : 'SMART TOOLS';
console.error(`Cherry Chrome MCP Server running on stdio [MODE: ${mode}]`);
console.error(`Set USE_LEGACY_TOOLS=true to use original granular tools`);
```

### 3. `src/browser.ts`

**Lines 71-72:** Remove properties
```typescript
// DELETE THESE LINES
private hiddenTools: Set<string> = new Set();
private toolListChangedCallback: (() => void) | null = null;
```

**Lines 74-89:** Remove methods
```typescript
// DELETE THESE METHODS
setToolListChangedCallback(callback: () => void): void {
  this.toolListChangedCallback = callback;
}

private notifyToolListChanged(): void {
  if (this.toolListChangedCallback) {
    this.toolListChangedCallback();
  }
}
```

**Additional Cleanup:** Search for and remove any other related methods:
- `isToolHidden(toolName: string): boolean`
- `hideTools(...)`
- `showTools(...)`
- Any calls to `this.notifyToolListChanged()`

**Search command:**
```bash
grep -n "notifyToolListChanged\|hiddenTools\|isToolHidden\|setToolListChanged" src/browser.ts
```

### 4. `src/tools/chrome.ts` (or wherever hide/show are implemented)

**Actions:**
1. Find `hideTools` implementation and delete it
2. Find `showTools` implementation and delete it
3. Remove any exports of these functions

**Search command:**
```bash
grep -n "export.*hideTools\|export.*showTools" src/tools/*.ts
```

### 5. `src/tools/index.ts`

**Actions:**
Remove exports (if they exist):
```typescript
// DELETE THESE LINES (if present)
export { hideTools, showTools } from './chrome.js';
```

## Edge Cases to Handle

### 1. Manual Tool Hiding Feature

If BrowserManager has a manual hide feature (separate from dynamic visibility):
- Check if `hiddenTools` Set is used for anything other than dynamic filtering
- If it's only for dynamic filtering, safe to remove
- If it's used for manual `hide_tools`/`show_tools`, remove entire feature

### 2. State Query Methods

Check if these methods exist and are used elsewhere:
- `hasConnections()`
- `isDebuggerEnabled()`
- `isPaused()`

These might be needed for tool implementations (not just visibility). Keep them if:
- Used in tool implementations to validate state
- Used in error messages
- Used for logging/debugging

Remove only if solely used for `getVisibleSmartTools()`.

**Verification command:**
```bash
grep -n "hasConnections\|isDebuggerEnabled\|isPaused" src/**/*.ts
```

### 3. Notification Protocol

The manual notification send in the callback:
```typescript
const notification = {
  jsonrpc: '2.0',
  method: 'notifications/tools/list_changed'
};
console.log(JSON.stringify(notification));
```

This is specific to dynamic tool visibility. Safe to remove entirely.

## Testing Strategy

### Unit Testing Approach

1. **Test Legacy Mode:**
   - Start server with `USE_LEGACY_TOOLS=true`
   - Verify `activeTools` equals `legacyTools`
   - Verify all 23 tools present
   - Verify tool routing works

2. **Test Smart Mode:**
   - Start server with `USE_LEGACY_TOOLS=false` (or unset)
   - Verify `activeTools` equals `smartTools`
   - Verify 16 tools present (not 18)
   - Verify tool routing works

3. **Test Static Behavior:**
   - Call `ListTools` before connecting
   - Call `ListTools` after connecting
   - Call `ListTools` after enabling debugger
   - Call `ListTools` while paused
   - **Expect:** Same tool list in all states

### Integration Testing

Use MCP Inspector to manually verify:

```bash
# Test legacy mode
USE_LEGACY_TOOLS=true npx @modelcontextprotocol/inspector node build/src/index.js

# Actions:
# 1. Check tool count (should be 23)
# 2. Launch Chrome
# 3. Check tool count again (should still be 23)
# 4. Enable debugger
# 5. Check tool count again (should still be 23)

# Test smart mode
npx @modelcontextprotocol/inspector node build/src/index.js

# Actions:
# 1. Check tool count (should be 16)
# 2. Launch Chrome
# 3. Check tool count again (should still be 16)
# 4. Enable debugger
# 5. Check tool count again (should still be 16)
```

## Common Pitfalls

### 1. Incomplete Conditional Inversion

**Problem:** Missing a `!USE_LEGACY_TOOLS` that should be `USE_LEGACY_TOOLS`

**Solution:** Search for all instances:
```bash
grep -n "USE_LEGACY_TOOLS" src/index.ts
```

Verify each conditional makes logical sense.

### 2. Leftover References

**Problem:** Forgetting to remove import of `hideTools`/`showTools`

**Solution:** After deleting functions, let TypeScript compiler catch unused imports

### 3. BrowserManager Methods Still Called

**Problem:** Some tool might call `browserManager.notifyToolListChanged()`

**Solution:** Grep for all calls before removing method:
```bash
grep -r "notifyToolListChanged" src/
```

### 4. Test Assertions

**Problem:** Tests might assert specific tool counts (18 for smart)

**Solution:** Update to expect 16 for smart mode

## Rollback Plan

If critical issues found:

1. **Immediate:** Revert the commit
   ```bash
   git revert HEAD
   ```

2. **Temporary workaround:** Add both env vars
   ```typescript
   const USE_SMART_TOOLS = process.env.USE_SMART_TOOLS === 'true';
   const USE_LEGACY_TOOLS = process.env.USE_LEGACY_TOOLS === 'true';

   // Prefer new var, fall back to old var inverted
   const useLegacyTools = USE_LEGACY_TOOLS || !USE_SMART_TOOLS;
   const activeTools = useLegacyTools ? legacyTools : smartTools;
   ```

3. **Fix forward:** Identify specific issue and patch

## Migration Guide for Users

**If you had this:**
```bash
USE_SMART_TOOLS=true
```

**Change to:**
```bash
# Remove the env var entirely (smart is now default)
```

**If you had this:**
```bash
# No env var (legacy tools)
```

**Change to:**
```bash
USE_LEGACY_TOOLS=true
```

**If you were using `hide_tools` or `show_tools`:**
- These tools are removed
- All tools are always visible
- No replacement available (feature removed intentionally)
