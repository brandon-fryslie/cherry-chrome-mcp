# Deferred Work - Audit Findings (2026-01-19)

Work items discovered during comprehensive audit of duplication, architecture, and usability.
Auto-captured from `AUDIT-REPORT-20260119.md`

**To process:**
- Review findings in audit report
- Create beads items when ready to implement
- Organize by priority (P1 critical, P2 important, P3 nice-to-have)

---

## P1 - Critical Issues (Do First)

### 1. Consolidate tool definitions
**Type**: task | **Priority**: P1 | **Source**: audit/duplication
**Status**: PENDING

**Description**
Unify legacyTools and smartTools arrays into single source of truth with shared metadata. Currently 85 lines of tool descriptions and schemas are duplicated verbatim across both arrays.

**Location**: `src/index.ts:17277-18150`

**Problem**
- Tool definitions repeated in legacyTools (23 tools) and smartTools (18 tools)
- Identical descriptions, schemas, parameter defaults duplicated
- If bug fixed in one, must fix in both
- 85 lines of maintenance burden

**Solution**
Create shared tool metadata objects:
```typescript
const toolMetadata = {
  queryElements: {
    description: '...',
    schema: {...},
    params: {...}
  },
  // ... other tools
};

const legacyTools = [
  { name: 'query_elements', ...toolMetadata.queryElements },
  // ...
];

const smartTools = [
  { name: 'query_elements', ...toolMetadata.queryElements },
  // ...
];
```

**Impact**: Eliminates 85 lines of duplication, single source of truth
**Audit Finding**: 1.1

---

### 2. Centralize error handling
**Type**: task | **Priority**: P1 | **Source**: audit/architecture
**Status**: PENDING

**Description**
Move error formatting from 17 individual tools to single MCP boundary handler. Currently violates "Single Enforcer" principle - error handling duplicated across all tools.

**Location**: `src/tools/debugger.ts`, `src/tools/dom.ts`, `src/tools/context.ts`, `src/index.ts`

**Problem**
- Every tool implements identical try-catch pattern
- Error message extraction duplicated 17 times
- Changes to error format require updates in 17 locations
- Violates CLAUDE.md architectural law

**Solution**
Create error handler at MCP boundary:
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

**Impact**: ~85 lines of boilerplate removed, single enforcer pattern
**Audit Finding**: 2.1

---

### 3. Implement tool registry pattern
**Type**: task | **Priority**: P1 | **Source**: audit/architecture
**Status**: PENDING

**Description**
Replace 170-line dual switch statement routing with centralized registry lookup. Currently tool name-to-implementation mapping exists in 3 places.

**Location**: `src/index.ts:18199-18370`

**Problem**
- Massive switch statement branches on USE_LEGACY_TOOLS flag
- First branch handles 23 legacy tool names
- Second branch handles 18 smart tool names
- ~170 lines of nearly identical case/call patterns
- 3 sources of truth: definitions, router, exports

**Solution**
```typescript
const toolRegistry = new Map<string, {
  definition: Tool,
  impl: (args: any) => Promise<any>
}>();

// Populate from single source
toolRegistry.set('query_elements', {
  definition: {...},
  impl: queryElements
});

// Route from registry
const toolImpl = toolRegistry.get(name)?.impl;
if (!toolImpl) throw new Error(`Unknown tool: ${name}`);
return toolImpl(args);
```

**Impact**: ~170 lines consolidated, single source of truth for routing
**Audit Finding**: 1.2, 2.2

---

### 4. Standardize parameter naming
**Type**: task | **Priority**: P1 | **Source**: audit/usability
**Status**: PENDING

**Description**
Convert all tool parameters to snake_case with single normalizeArgs() wrapper at entry point. Currently mixing snake_case (tool params), camelCase (functions), abbreviated forms.

**Location**: All tools across `src/tools/`

**Problem**
- Parameters use mixed naming conventions: connection_id, connectionId, connId, id
- Every tool converts snake_case to camelCase (3 lines per tool = 51 lines total)
- IDE autocomplete shows inconsistent casing
- Users confused about correct parameter name

**Solution**
```typescript
// Single conversion at entry point
function normalizeArgs(args: Record<string, any>): Record<string, any> {
  return {
    connectionId: args.connection_id,
    // ... other conversions
  };
}

const normalized = normalizeArgs(request.params.arguments);
// All internal code uses camelCase
```

**Impact**: Standardized API, 51 lines of conversion code removed
**Audit Finding**: 3.1

---

### 5. Complete tool consolidation design
**Type**: clarify | **Priority**: P1 | **Source**: audit/architecture
**Status**: PENDING

**Description**
Decide consolidation strategy for remaining tools. Some tools consolidated (chrome, breakpoint, step), others not (call_stack, evaluate). Inconsistency suggests incomplete design.

**Problem**
- 5 tools use consolidation pattern: chrome(action), breakpoint(action), step(direction), execution(action), target(action)
- But call_stack, evaluate, pause_on_exceptions remain separate
- Unclear if this is intentional or incomplete

**Options**
1. **Complete consolidation**: Consolidate call_stack/evaluate into context(action: "stack" | "evaluate")
2. **Intentional separation**: Document why some tools remain separate
3. **Hybrid**: Keep separate but add clear naming pattern (e.g., all combined tools end with -)

**Decision Needed**: Which approach aligns with design goals?

**Impact**: Consistent API surface, reduced tool count or clear documentation
**Audit Finding**: 2.4

---

## P2 - Important Issues (Do Soon)

### 6. Enhance error messages with guidance
**Type**: task | **Priority**: P2 | **Source**: audit/usability
**Status**: PENDING

**Description**
Add recovery actions and examples to all error messages. Currently technical but lack "what should user do" guidance.

**Location**: `src/browser.ts` - error classes

**Problem**
- Error messages say "what went wrong" but not "how to fix it"
- Example: "No connection found" - missing usage guidance
- Users must guess recovery actions

**Solution**
```typescript
throw new ChromeNotConnectedError(
  'No Chrome connection found\n\n' +
  'Usage: Call chrome(action: "connect", port: 9222, connection_id: "default")\n' +
  'Or: Call chrome(action: "launch")\n' +
  'Debug: Available connections: ' + connectionList
);
```

**Impact**: Better user experience, reduced support questions
**Audit Finding**: 3.2

---

### 7. Improve tool descriptions
**Type**: task | **Priority**: P2 | **Source**: audit/usability
**Status**: PENDING

**Description**
Document prerequisites, alternatives, example usage, and output format for each tool. Currently sparse descriptions don't help users understand use cases.

**Location**: Tool definitions in `src/index.ts`

**Problem**
- Descriptions short and don't explain when to use
- Missing prerequisites (e.g., "must enable debugger first")
- No examples or output documentation
- Users can't tell if tool is right for their use case

**Solution**
Enhance tool descriptions with details section:
```typescript
{
  name: 'breakpoint',
  description: 'Set or remove breakpoints for debugging JavaScript.',
  details: {
    purpose: 'Control where execution pauses during debugging',
    prerequisites: ['enable_debug_tools() must be called first'],
    alternatives: ['execution(action: "pause") to pause immediately'],
    outputs: 'breakpoint_id string for later reference',
    example: 'Set breakpoint at line 42...'
  }
}
```

**Impact**: Better discoverability, users can self-serve
**Audit Finding**: 3.3

---

### 8. Add enumDescriptions to action parameters
**Type**: task | **Priority**: P2 | **Source**: audit/usability
**Status**: PENDING

**Description**
Document what each action value does in consolidated tools. Some tools have good inline docs, others don't.

**Location**: Tool definitions for consolidated tools

**Problem**
- Tools like execution have good documentation: "resume" to continue, "pause" to break
- But inconsistent across tools
- Users must memorize 8+ action values

**Solution**
Standardize with enumDescriptions:
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

**Impact**: Consistent documentation, clearer API
**Audit Finding**: 3.5

---

### 9. Add verification test suite
**Type**: task | **Priority**: P2 | **Source**: audit/architecture
**Status**: PENDING

**Description**
Add automated tests to catch definition/router mismatches, orphaned implementations, naming consistency violations.

**Location**: `tests/` directory

**Problem**
- No verification that tools in definitions exist in router
- No check for orphaned implementations
- No automation to catch coupling violations
- Manual code review required

**Tests Needed**
1. All tools in definitions have implementations
2. No router cases for non-existent tools
3. All exported tool functions are registered
4. Consistent naming (snake_case in definitions)
5. No duplicate tool names

**Impact**: Catch coupling violations early, prevent regressions
**Audit Finding**: 2.5

---

### 10. Refactor query_elements documentation
**Type**: task | **Priority**: P2 | **Source**: audit/usability
**Status**: PENDING

**Description**
Add common usage patterns for the 8 possible parameter combinations. Include guidance on when to use each pattern.

**Location**: query_elements tool description

**Problem**
- 5 parameters, 3 optional filters = 8 combinations
- No guidance on which combinations are useful
- Users unclear on best practices
- Should users try all combinations to debug?

**Solution**
Add patterns section:
```
Common patterns:
1. Find visible buttons: query_elements({ selector: 'button' })
2. Find button by text: query_elements({ selector: 'button', text_contains: 'Submit' })
3. Find all including hidden: query_elements({ selector: 'button', include_hidden: true })
4. Find specific match: query_elements({ selector: 'button', text_contains: 'Submit', limit: 1 })
5. Find on different connection: query_elements({ selector: 'button', connection_id: 'other' })
```

**Impact**: Better UX, users know how to use tool effectively
**Audit Finding**: 3.4

---

## Summary

| Finding | Type | Priority | Files Affected |
|---------|------|----------|-----------------|
| 1.1 - Consolidate definitions | task | P1 | src/index.ts |
| 1.2 - Centralize routing | task | P1 | src/index.ts |
| 1.3 - Remove error boilerplate | task | P1 | src/tools/* |
| 2.1 - Error handling enforcer | task | P1 | src/browser.ts, src/index.ts |
| 2.2 - Tool registry | task | P1 | src/index.ts |
| 2.3 - Parameter naming | task | P1 | src/tools/* |
| 2.4 - Consolidation design | clarify | P1 | -- |
| 3.2 - Error message guidance | task | P2 | src/browser.ts |
| 3.3 - Tool descriptions | task | P2 | src/index.ts |
| 3.4 - Enum documentation | task | P2 | src/index.ts |
| 3.5 - Verification tests | task | P2 | tests/ |
| 3.6 - Query patterns | task | P2 | src/index.ts |

**Estimated effort**: 8-12 hours for complete remediation
**Estimated impact**: 300+ lines of duplication removed, stronger architectural alignment

---

Generated by audit-master skill on 2026-01-19.
Source: `/Users/bmf/code/cherry-chrome-mcp/AUDIT-REPORT-20260119.md`
