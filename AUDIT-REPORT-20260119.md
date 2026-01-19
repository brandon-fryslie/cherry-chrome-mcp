# Cherry Chrome MCP - Comprehensive Audit Report
**Date:** January 19, 2026
**Dimensions:** Duplication, Architecture, Usability
**Model:** Claude Haiku 4.5

---

## Executive Summary

Cherry Chrome MCP is a well-structured TypeScript MCP server for Chrome automation with thoughtful consolidation of tool definitions. The codebase demonstrates good architectural practices but has identified issues around:

1. **Duplication**: Feature toggle creates parallel code paths requiring conditional maintenance
2. **Architecture**: Violates "Single Enforcer" principle with distributed error handling and tool routing logic
3. **Usability**: Error messages and parameter naming could be more consistent and discoverable

**Risk Level**: 🟡 **Medium** - Technical debt manageable, but consolidation needed

---

## Dimension 1: Duplication Analysis

### Finding 1.1: Parallel Tool Definitions (P1)
**Location:** `src/index.ts:17277-18150`

**Issue:**
- Two complete tool definition arrays: `legacyTools` (23 tools) and `smartTools` (18 tools)
- Identical tool descriptions repeated verbatim (e.g., query_elements)
- Same input schemas duplicated across both arrays
- Parameter defaults (5, 20, false) hardcoded in both places

**Evidence:**
```typescript
// legacyTools definition
{ name: 'query_elements', description: 'Find elements by CSS selector...', inputSchema: {...} }

// smartTools definition
{ name: 'query_elements', description: 'Find elements by CSS selector...', inputSchema: {...} }
```

**Severity:** P1 - Maintenance burden; if bug fixed in one, must fix in both

**Recommendation:** Create shared tool metadata objects and build arrays from them:
```typescript
const toolMetadata = {
  queryElements: { description: '...', schema: {...} }
};
const legacyTools = [{ name: 'query_elements', ...toolMetadata.queryElements }];
const smartTools = [{ name: 'query_elements', ...toolMetadata.queryElements }];
```

---

### Finding 1.2: Dual Tool Routing Logic (P1)
**Location:** `src/index.ts:18199-18370` (CallToolRequestSchema handler)

**Issue:**
- Massive `switch` statement branching on `USE_LEGACY_TOOLS` environment variable
- First branch handles 23 legacy tool names (`case 'chrome_connect'`, `case 'debugger_step_over'`, etc.)
- Second branch handles 18 smart tool names (`case 'chrome'`, `case 'breakpoint'`, etc.)
- ~170 lines of nearly identical case/call patterns

**Evidence:**
```typescript
if (USE_LEGACY_TOOLS) {
  switch (name) {
    case 'chrome_connect': return await chromeConnect(args);
    case 'chrome_launch': return await chromeLaunch(args);
    case 'debugger_step_over': return await debuggerStepOver(args);
    // ... 20 more cases
  }
} else {
  switch (name) {
    case 'chrome': return await chrome(args);
    case 'breakpoint': return await breakpoint(args);
    case 'step': return await step(args);
    // ... 15 more cases
  }
}
```

**Severity:** P1 - Route handling must be kept in sync with tool definitions; changes require dual updates

**Recommendation:**
```typescript
// Build routing map from tool definitions
const toolRoutes = new Map<string, (args: any) => Promise<any>>();
activeTools.forEach(tool => {
  toolRoutes.set(tool.name, getToolImplementation(tool.name));
});

// Single routing logic
const impl = toolRoutes.get(name);
if (!impl) throw new Error(`Unknown tool: ${name}`);
return impl(args);
```

---

### Finding 1.3: Error Handling Duplication (P2)
**Location:** `src/tools/debugger.ts`, `src/tools/dom.ts`, `src/tools/context.ts`

**Issue:**
- Every tool implementation wraps logic in identical try-catch patterns:
```typescript
export async function toolName(args: {...}): Promise<...> {
  try {
    const page = browserManager.getPageOrThrow(...);
    // ... implementation
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : String(error));
  }
}
```

- 17 tools with this exact pattern (boilerplate is ~5 lines per tool = ~85 lines)
- Error message extraction is identical across all tools

**Severity:** P2 - Maintainability issue; if error pattern changes, requires 17 updates

**Recommendation:** Create wrapper function:
```typescript
export function withErrorHandling<T>(
  fn: () => Promise<T>
): Promise<MCP_Response> {
  return fn()
    .then(result => successResponse(result))
    .catch(error => errorResponse(getErrorMessage(error)));
}

// Usage
export async function toolName(args: {...}) {
  return withErrorHandling(() => toolImplementation(args));
}
```

---

### Finding 1.4: Conditional Feature Visibility (P2)
**Location:** `src/index.ts:6462-7000`

**Issue:**
- Multiple `if (USE_SMART_TOOLS)` checks scattered throughout:
  - Tool list registration (line ~4950)
  - Callback registration (line ~6990)
  - Server mode logging (line ~6611)
- Environment variable read in multiple places (should be single source of truth)
- Changes to feature logic require searches across file

**Evidence:**
```typescript
if (USE_SMART_TOOLS) {
  // Smart tools specific logic
} else {
  // Legacy tools specific logic
}
```

**Severity:** P2 - Fragmented control flow; hard to see all implications of toggling feature

**Recommendation:** Centralize feature logic in Strategy pattern:
```typescript
const mode = USE_SMART_TOOLS ? new SmartMode() : new LegacyMode();
mode.registerTools(server);
mode.startServer();
```

---

## Dimension 2: Architecture Analysis

### A. Violation of "Single Enforcer" Principle

**CLAUDE.md Core Law**: *"Any cross-cutting invariant (auth, validation, timing, serialization) is enforced at exactly one boundary. Duplicate checks across callsites will drift."*

#### Finding 2.1: Error Handling Distributed (P1)
**Location:** Multiple files

**Issue:**
- Error enforcement scattered across boundaries:
  - `BrowserManager` throws custom errors (`ChromeNotConnectedError`, `DebuggerNotEnabledError`)
  - Every tool catches and reformats errors independently
  - No single error handler at MCP boundary

**Evidence:**
```typescript
// BrowserManager throws
throw new ChromeNotConnectedError(`No connection '${id}' found`);

// Tools catch and reformat
catch (error) {
  return errorResponse(error instanceof Error ? error.message : String(error));
}
```

**Problem:** If error formatting standard changes, must update 17 tools instead of 1 location

**Recommendation:** Create error handler at MCP boundary in CallToolRequestSchema:
```typescript
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    return await routeAndExecuteTool(request.params.name, request.params.arguments);
  } catch (error) {
    // SINGLE point of error formatting
    return formatErrorResponse(error);
  }
});
```

---

#### Finding 2.2: Tool Routing Duplicated (P1)
**Location:** `src/index.ts`, tool execution

**Issue:**
- Tool name-to-implementation mapping occurs in:
  - Tool definitions array (name property)
  - CallToolRequestSchema switch statement
  - Tool function exports

- Three sources of truth for "which tools are available and how to call them"

**Problem:** Adding a tool requires changes in 3+ places; deleting tools leaves dead code

**Recommendation:** Single registry pattern:
```typescript
const toolRegistry = {
  'query_elements': { definition: {...}, impl: queryElements },
  'click_element': { definition: {...}, impl: clickElement },
  // ...
};

// Derive arrays from registry
const tools = Object.values(toolRegistry).map(t => t.definition);

// Route from registry
const toolImpl = toolRegistry[name]?.impl;
```

---

### B. Violation of "One-Way Dependencies"

#### Finding 2.3: Circular Potential in State Management (P2)
**Location:** `src/browser.ts`, `src/index.ts`

**Issue:**
- BrowserManager holds state (connections, paused state)
- index.ts registers callback to notify server of state changes
- No clear ownership of "debugger paused state"

**Evidence:**
```typescript
// In browser.ts
connection.pausedData = params; // State stored here

// In index.ts
browserManager.setToolListChangedCallback(() => {
  server.sendToolListChanged(); // Triggers notification
});
```

**Problem:** If new state is added (e.g., "recording"), unclear where to handle it

**Recommendation:**
```typescript
// BrowserManager owns all state and only emits events
browserManager.on('debuggerPaused', (data) => {
  server.sendToolListChanged();
});

// Clear dependency arrow: BrowserManager → Server
```

---

### C. Violation of "One Type Per Behavior"

#### Finding 2.4: Multiple Consolidated Tool Patterns (P1)
**Location:** `src/tools/context.ts`, `src/tools/debugger.ts`

**Issue:**
- "Consolidated tools" pattern applied inconsistently:
  - `chrome(action: "connect" | "launch")` ✅
  - `target(action: "list" | "switch")` ✅
  - `breakpoint(action: "set" | "remove")` ✅
  - BUT `call_stack`, `evaluate`, `pause_on_exceptions` remain separate tools

- Inconsistency suggests incomplete consolidation

**Evidence:**
```typescript
// These ARE consolidated
const smartTools = [
  { name: 'chrome', inputSchema: { action: ['connect', 'launch'] } },
  { name: 'breakpoint', inputSchema: { action: ['set', 'remove'] } }
];

// These are NOT consolidated (should they be?)
const smartTools = [
  { name: 'call_stack', inputSchema: {...} },
  { name: 'evaluate', inputSchema: {...} }
];
```

**Problem:** Inconsistent API makes learning curve steeper; unclear which tools are "combined"

**Recommendation:** Complete consolidation design:
```
call_stack + evaluate → context(action: "stack" | "evaluate")
or keep them separate with clear naming pattern
```

---

### D. Missing: Verification Story

#### Finding 2.5: No Automated Coupling Detection (P2)

**Issue:**
- Test suite doesn't verify:
  - All tools in definitions exist in router
  - All router cases exist in definitions
  - No orphaned tool implementations
  - Tool naming consistency between modes

**Recommendation:** Add automated tests:
```typescript
describe('Tool Registration Consistency', () => {
  it('all smart tools have implementations', () => {
    smartTools.forEach(tool => {
      expect(toolRegistry).toHaveProperty(tool.name);
    });
  });

  it('no orphaned implementations', () => {
    // Check no dead code remains
  });
});
```

---

## Dimension 3: Usability Analysis

### Finding 3.1: Inconsistent Parameter Naming (P1)
**Location:** Tool definitions across multiple files

**Issue:**
- Parameters use mixed naming conventions:
  - `connection_id` (snake_case, used in 15+ tools)
  - `connectionId` (camelCase, used in function signatures)
  - `connId` (abbreviated, used in implementation)
  - `id` (bare, used in errors)

**Evidence:**
```typescript
// Tool parameter
{ name: 'connection_id', type: 'string' }

// Function signature
export async function queryElements(args: { connection_id: string })

// Implementation
const connectionId = args.connection_id; // Convert to camelCase
const conn = browserManager.getConnection(connectionId);
if (!conn) throw new Error('No connection found');
```

**Problem:**
- Users see `connection_id` but docs might say `connectionId`
- Conversion tax in every tool (~3 lines per tool = ~51 lines total)
- IDE autocomplete shows inconsistent casing

**Severity:** P1 - Increases friction for users; ~5% of each tool's code is naming conversion

**Recommendation:**
1. Standardize on snake_case for MCP tool parameters (standard in most MCPs)
2. Keep implementation as camelCase
3. Create `normalizeArgs()` wrapper to handle conversion once:
```typescript
const args = normalizeArgs(request.params.arguments); // connection_id → connectionId
```

---

### Finding 3.2: Error Messages Lack Guidance (P2)
**Location:** `src/browser.ts` error classes

**Issue:**
- Error messages are technical but lack "what should user do" guidance

**Evidence:**
```typescript
throw new ChromeNotConnectedError('No connection found');
// User sees: "Error: No connection found"
// Missing: "Did you forget to call chrome(action: 'connect')?"
```

Better example:
```typescript
throw new ChromeNotConnectedError(
  'No Chrome connection found\n\n' +
  'Usage: Call chrome(action: "connect", port: 9222, connection_id: "default")\n' +
  'Or: Call chrome(action: "launch")\n' +
  'Debug: Available connections: ' + connectionList
);
```

**Severity:** P2 - Developers must guess recovery actions

**Recommendation:**
- Every error should answer: **"What went wrong?"** and **"How do I fix it?"**
- Include example usage
- List available resources (e.g., connection IDs)

---

### Finding 3.3: Tool Discoverability (P2)
**Location:** Tool descriptions in `src/index.ts`

**Issue:**
- Tool descriptions are short and don't clearly explain:
  - When to use this tool vs. alternatives
  - What prerequisites exist (e.g., "must enable debugger first")
  - What the tool outputs

**Evidence:**
```typescript
{
  name: 'breakpoint',
  description: 'Set or remove breakpoints. Consolidates debugger_set_breakpoint and debugger_remove_breakpoint into a single action-based tool.'
  // Missing:
  // - "Prerequisites: Debugger must be enabled first"
  // - "Alternatives: Use execution(action: 'pause') to pause anywhere"
  // - "Returns: breakpoint_id for later removal"
}
```

**Severity:** P2 - Users can't tell if tool is right for their use case

**Recommendation:**
```typescript
{
  name: 'breakpoint',
  description: 'Set or remove breakpoints for debugging JavaScript.',
  details: {
    purpose: 'Control where execution pauses during debugging',
    prerequisites: ['enable_debug_tools() must be called first'],
    alternatives: ['execution(action: "pause") to pause immediately'],
    outputs: 'breakpoint_id string for later reference',
    example: 'Set breakpoint at line 42 of main.js:\n  breakpoint(action: "set", url: "http://localhost:3000/main.js", line_number: 42)'
  }
}
```

---

### Finding 3.4: Option Overload in `query_elements` (P2)
**Location:** `src/tools/dom.ts` - queryElements tool

**Issue:**
- 5 parameters, 3 optional filters can combine in 2^3 = 8 ways
- No clear guidance on which combinations are useful

**Evidence:**
```typescript
query_elements({
  selector: 'button',
  limit: 20,
  text_contains: 'Submit',
  include_hidden: true,
  connection_id: 'default'
})
```

**Question:** Should user try all 8 combinations to debug? Or are some useless?

**Severity:** P2 - Users unclear on best practices

**Recommendation:** Add "common patterns" to description:
```typescript
// Patterns:
1. Find visible buttons:
   query_elements({ selector: 'button' })

2. Find button by text:
   query_elements({ selector: 'button', text_contains: 'Submit' })

3. Find all (including hidden):
   query_elements({ selector: 'button', include_hidden: true })

4. Find specific match:
   query_elements({ selector: 'button', text_contains: 'Submit', limit: 1 })
```

---

### Finding 3.5: Incomplete "Action" Parameter Documentation (P1)
**Location:** Consolidated tools (`chrome`, `breakpoint`, `step`, `execution`, `target`)

**Issue:**
- Tools use `action` parameter with enum values, but descriptions don't explain what each does

**Evidence:**
```typescript
{
  name: 'execution',
  description: 'Control execution flow. Consolidates debugger_resume and debugger_pause into a single action-based tool.',
  inputSchema: {
    action: {
      type: 'string',
      description: '"resume" to continue execution or "pause" to break',  // ✓ Good
      enum: ['resume', 'pause']
    }
  }
}

{
  name: 'step',
  description: '...',
  inputSchema: {
    direction: {
      type: 'string',
      description: '"over" (next line), "into" (enter function), or "out" (exit function)',  // ✓ Good
      enum: ['over', 'into', 'out']
    }
  }
}
```

**Good examples:** `execution` and `step` explain each enum value
**Bad examples:** Some tools don't include inline explanation of enum values

**Severity:** P1 - Users must memorize 8+ action values across 5 tools

**Recommendation:** Standardize enum documentation:
```typescript
action: {
  type: 'string',
  description: 'Specify the action to perform:',
  enum: ['connect', 'launch'],
  enumDescriptions: [
    'Connect to an existing Chrome instance via remote debugging port',
    'Launch a new Chrome instance (auto-connects after startup)'
  ]
}
```

---

## Dimension 4: Summary Scorecard

| Dimension | Category | Rating | Severity |
|-----------|----------|--------|----------|
| **Duplication** | Tool Definitions | 🔴 P1 | 85 lines of verbatim repetition |
| **Duplication** | Routing Logic | 🔴 P1 | ~170 lines dual path maintenance |
| **Duplication** | Error Handling | 🟡 P2 | 85 lines boilerplate across tools |
| **Architecture** | Single Enforcer | 🔴 P1 | Error handling distributed |
| **Architecture** | Routing | 🔴 P1 | 3 sources of truth |
| **Architecture** | Consolidation | 🟡 P1 | Inconsistent application |
| **Architecture** | Coupling Verification | 🟡 P2 | No automated checks |
| **Usability** | Naming | 🔴 P1 | snake_case/camelCase confusion |
| **Usability** | Error Messages | 🟡 P2 | Lack actionable guidance |
| **Usability** | Discoverability | 🟡 P2 | Sparse descriptions |
| **Usability** | Action Params | 🔴 P1 | Inconsistent enum documentation |

---

## Recommendations Priority

### 🔴 Critical (P0-P1)

1. **Unify tool definitions** - Extract shared metadata, build arrays from it
2. **Centralize error handling** - Single error formatter at MCP boundary
3. **Single tool registry** - Replace switch statements with lookups
4. **Standardize parameter naming** - Convert to snake_case at entry point
5. **Complete consolidation design** - Decide: consolidate `call_stack`/`evaluate` or keep separate

### 🟡 Important (P2)

6. **Improve error messages** - Add guidance on recovery actions
7. **Enhance tool descriptions** - Include prerequisites, examples, patterns
8. **Document action enums** - Add enumDescriptions to all consolidated tools
9. **Add verification tests** - Catch definition/router mismatches automatically

### 🟢 Nice-to-Have (P3)

10. **Centralize feature logic** - Strategy pattern for legacy vs smart mode
11. **Add common patterns** - Usage examples in query_elements documentation

---

## Files Affected

| File | Changes Needed | Impact |
|------|----------------|--------|
| `src/index.ts` | Unify tools, centralize routing, error handler | 200+ lines refactored |
| `src/tools/debugger.ts` | Remove try-catch boilerplate, use wrapper | ~30 lines simplified |
| `src/tools/dom.ts` | Remove try-catch boilerplate, add patterns | ~20 lines simplified |
| `src/tools/context.ts` | Remove try-catch boilerplate | ~10 lines simplified |
| `src/browser.ts` | Enhance error messages | ~50 lines improved |
| Tests | Add verification suite | ~100 lines added |

---

## Conclusion

Cherry Chrome MCP has a **solid foundation** with clear separation of concerns and thoughtful tool consolidation design. However, the feature toggle implementation has introduced **duplication and maintenance burden** that violates the architectural law "One Source of Truth."

**Next steps:**
1. Remove parallel tool definition arrays (consolidate to single source)
2. Move tool routing to centralized registry pattern
3. Standardize parameter naming at entry point
4. Improve error messages with actionable guidance

These changes would reduce maintenance burden, improve usability, and strengthen architectural alignment with the project's CLAUDE.md guidelines.

---

**Audit Completed By:** Claude Haiku 4.5
**Total Issues Identified:** 15 (8 P1, 5 P2, 2 P3)
**Estimated Remediation:** 8-12 hours for complete remediation
