# Implementation Context: code-quality
Generated: 2026-01-26-144000
Plan: SPRINT-20260126-144000-code-quality-PLAN.md

## File Locations

**Primary file to modify:**
- `/Users/bmf/code/cherry-chrome-mcp/src/index.ts`

**Reference files (read-only):**
- `/Users/bmf/code/cherry-chrome-mcp/src/toolRegistry.ts` - ToolHandler interface definition
- `/Users/bmf/code/cherry-chrome-mcp/src/types.ts` - ToolResult type

## P2-1: Handler Helper Function

### Location
- File: `src/index.ts`
- Current implementation: Lines 925-1166 (createToolHandlers function)
- Helper placement: Line 912 (after findTool, before createToolHandlers)

### Existing Pattern to Replace
```typescript
// Lines 930-935: Current pattern (33 instances like this)
handlers.set('query_elements', {
  name: 'query_elements',
  definition: findTool(tools, 'query_elements'),
  invoke: async (args: unknown) =>
    queryElements(args as Parameters<typeof queryElements>[0]),
});
```

### Target Implementation

```typescript
// Add at line 912 (after findTool function)
/**
 * Register a tool handler with automatic name deduplication.
 * Reduces triple-name pattern to single name usage.
 */
function addHandler<F extends (...args: any[]) => Promise<ToolResult>>(
  handlers: Map<string, ToolHandler>,
  name: string,
  tools: Tool[],
  fn: F
): void {
  handlers.set(name, {
    name,
    definition: findTool(tools, name),
    invoke: async (args: unknown) => fn(args as Parameters<F>[0]),
  });
}
```

### Replacement Pattern

**Before (6 lines each):**
```typescript
handlers.set('query_elements', {
  name: 'query_elements',
  definition: findTool(tools, 'query_elements'),
  invoke: async (args: unknown) =>
    queryElements(args as Parameters<typeof queryElements>[0]),
});
```

**After (1 line each):**
```typescript
addHandler(handlers, 'query_elements', tools, queryElements);
```

### All 33 Handlers to Convert

**Shared DOM tools (6):** Lines 930-970
- query_elements -> queryElements
- click_element -> clickElement
- fill_element -> fillElement
- navigate -> navigate
- get_console_logs -> getConsoleLogs
- inspect_element -> inspectElement

**Shared connection tools (3):** Lines 972-991
- chrome_list_connections -> chromeListConnections (NOTE: no args, special case)
- chrome_switch_connection -> chromeSwitchConnection
- chrome_disconnect -> chromeDisconnect

**Legacy-specific tools (15):** Lines 994-1098
- chrome_connect -> chromeConnect
- chrome_launch -> chromeLaunch
- list_targets -> listTargets
- switch_target -> switchTarget
- debugger_enable -> debuggerEnable
- debugger_set_breakpoint -> debuggerSetBreakpoint
- debugger_get_call_stack -> debuggerGetCallStack
- debugger_evaluate_on_call_frame -> debuggerEvaluateOnCallFrame
- debugger_step_over -> debuggerStepOver
- debugger_step_into -> debuggerStepInto
- debugger_step_out -> debuggerStepOut
- debugger_resume -> debuggerResume
- debugger_pause -> debuggerPause
- debugger_remove_breakpoint -> debuggerRemoveBreakpoint
- debugger_set_pause_on_exceptions -> debuggerSetPauseOnExceptions

**Smart-specific tools (9):** Lines 1101-1162
- connect -> connect
- target -> target
- enable_debug_tools -> enableDebugTools
- breakpoint -> breakpoint
- step -> step
- execution -> execution
- call_stack -> callStack
- evaluate -> evaluate
- pause_on_exceptions -> pauseOnExceptions

### Special Case: chrome_list_connections

This handler takes no arguments:
```typescript
// Current (line 976)
invoke: async (args: unknown) => chromeListConnections(),
```

The helper will still work because `Parameters<F>[0]` on a zero-arg function is `undefined`, and the function ignores it:
```typescript
addHandler(handlers, 'chrome_list_connections', tools, chromeListConnections);
// Works: chromeListConnections(undefined) is equivalent to chromeListConnections()
```

---

## P2-2: Type Narrowing

### Location 1: Error with errorInfo (Line 1209)
```typescript
// Current
const info = (error as any).errorInfo as ErrorInfo;

// Target
if (hasErrorInfo(error)) {
  const info = error.errorInfo;
  // ... rest of block
}
```

### Interface Definition (add at line 1175, after ErrorInfo)
```typescript
/**
 * Error object with attached classification metadata.
 */
interface ErrorWithInfo extends Error {
  errorInfo: ErrorInfo;
}

/**
 * Type guard for errors with errorInfo property.
 */
function hasErrorInfo(error: unknown): error is ErrorWithInfo {
  return (
    error !== null &&
    typeof error === 'object' &&
    'errorInfo' in error &&
    error.errorInfo !== null &&
    typeof error.errorInfo === 'object'
  );
}
```

### Location 2: Request params (Line 1295)
```typescript
// Current
const connectionId = (request.params.arguments as any)?.connection_id;

// Target interface (add near line 1175)
interface ToolArguments {
  connection_id?: string;
  [key: string]: unknown;
}

// Target usage
const connectionId = (request.params.arguments as ToolArguments | undefined)?.connection_id;
```

### Location 3: Return value (Line 1312)
```typescript
// Current
} as any;

// Check MCP SDK for proper type
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

// Target (if CallToolResult allows extra properties)
return {
  content: [{ type: 'text', text: errorMessage }],
  isError: true,
  _toolName: toolName,
  _errorType: classified.errorType,
  _recoverable: classified.recoverable,
} satisfies CallToolResult & { _toolName: string; _errorType: string; _recoverable: boolean };
```

If SDK type is too strict, use explicit intersection:
```typescript
type ErrorToolResult = CallToolResult & {
  _toolName: string;
  _errorType: string;
  _recoverable: boolean;
};
// ... return { ... } as ErrorToolResult;
```

---

## P3-1: JSDoc Comments

### Shared DOM Tools Section (before line 930)
```typescript
/**
 * Shared DOM tools (6 tools)
 *
 * Element query, interaction, navigation, and console operations.
 * Available in both legacy and smart modes.
 *
 * Tools: query_elements, click_element, fill_element, navigate,
 *        get_console_logs, inspect_element
 */
```

### Shared Connection Tools Section (before line 972)
```typescript
/**
 * Shared connection tools (3 tools)
 *
 * Chrome instance management operations available in both modes.
 *
 * Tools: chrome_list_connections, chrome_switch_connection, chrome_disconnect
 */
```

### Legacy-Specific Section (before line 994)
```typescript
/**
 * Legacy-specific tools (15 tools)
 *
 * Granular Chrome connection and debugger operations.
 * Only available when USE_LEGACY_TOOLS=true.
 *
 * Connection: chrome_connect, chrome_launch, list_targets, switch_target
 * Debugger: debugger_enable, debugger_set_breakpoint, debugger_get_call_stack,
 *           debugger_evaluate_on_call_frame, debugger_step_over, debugger_step_into,
 *           debugger_step_out, debugger_resume, debugger_pause,
 *           debugger_remove_breakpoint, debugger_set_pause_on_exceptions
 */
```

### Smart-Specific Section (before line 1101)
```typescript
/**
 * Smart-specific tools (9 tools)
 *
 * Consolidated action-based Chrome connection and debugger operations.
 * Only available when USE_LEGACY_TOOLS=false (default).
 *
 * Connection: connect, target
 * Debugger: enable_debug_tools, breakpoint, step, execution,
 *           call_stack, evaluate, pause_on_exceptions
 */
```

---

## Import Additions

May need to add to imports (line 16):
```typescript
import type { Tool, CallToolResult } from '@modelcontextprotocol/sdk/types.js';
```

---

## Test Commands

```bash
# After each change
npm run build && npm test

# Verify no 'as any' remains
grep -c "as any" src/index.ts  # Should be 0

# Verify line reduction
wc -l src/index.ts  # Baseline: ~1329, Target: <1200
```
