# Evaluation: Consolidate Tool Definitions

**Date:** January 19, 2026
**Topic:** Tool Definition Consolidation
**Verdict:** CONTINUE (HIGH confidence path clear)

---

## Current State

### Tool Definition Structure

**Location:** `src/index.ts:72-985`

- `legacyTools` array (lines 72-555): 23 tool definitions
- `smartTools` array (lines 556-985): 18 tool definitions
- Selection via `USE_LEGACY_TOOLS` environment variable (line 986)
- `activeTools` chosen at runtime

### Duplication Analysis

**Shared tools between modes:**
- `query_elements`, `click_element`, `fill_element`, `navigate`, `get_console_logs`
- `chrome_list_connections`, `chrome_switch_connection`, `chrome_disconnect`
- All DOM tools (5 identical definitions)
- All list/switch connection tools (3 identical definitions)

**Unique to legacy:**
- `chrome_connect`, `chrome_launch` (separate)
- `list_targets`, `switch_target` (separate)
- `debugger_enable`, `debugger_set_breakpoint`, `debugger_remove_breakpoint`, etc. (11 separate)

**Unique to smart:**
- `chrome` (consolidated)
- `target` (consolidated)
- `enable_debug_tools`, `breakpoint`, `step`, `execution`, `call_stack`, `evaluate`, `pause_on_exceptions` (consolidated/renamed)

### Verbatim Repetition

**Example - query_elements:**

```typescript
// Lines 73 (legacy)
{
  name: 'query_elements',
  description: 'Find elements by CSS selector. Returns tag, text, id, classes, visibility. Returns up to limit elements (default 5, max 20).',
  inputSchema: {
    type: 'object',
    properties: {
      selector: {
        type: 'string',
        description: 'CSS selector to query (e.g., ".class", "#id", "button")',
      },
      limit: {
        type: 'number',
        description: 'Maximum number of elements to return',
        default: 5,
      },
      // ... 5 more properties
    },
    required: ['selector'],
  },
}

// Lines 419 (smart - IDENTICAL)
{
  name: 'query_elements',
  description: 'Find elements by CSS selector. Returns tag, text, id, classes, visibility. Returns up to limit elements (default 5, max 20).',
  inputSchema: {
    type: 'object',
    properties: {
      selector: {
        type: 'string',
        description: 'CSS selector to query (e.g., ".class", "#id", "button")',
      },
      limit: {
        type: 'number',
        description: 'Maximum number of elements to return',
        default: 5,
      },
      // ... 5 more properties
    },
    required: ['selector'],
  },
}
```

**Identified duplications:**
1. All 5 DOM tools (query_elements, click_element, fill_element, navigate, get_console_logs) - **~200 lines verbatim**
2. All 3 connection list/switch tools - **~50 lines verbatim**
3. Total shared tool definitions: **~250 lines**
4. Estimated unique metadata per tool: **10-25 lines**

---

## What Needs to Change

### Architecture Problem

**Current:** Three sources of truth for "what is a tool?"
1. Tool definition object (name, description, schema)
2. Tool implementation function (exported from tools/)
3. Router case statement (maps name to implementation)

Changes to any tool require updates in all 3 places.

### Solution Approach

**Create single metadata source**, derive arrays:

```typescript
// Step 1: Define all tool metadata once
const TOOL_METADATA = {
  queryElements: {
    description: '...',
    inputSchema: {...},
    // Metadata for both modes
  },
  // ... all tools
};

// Step 2: Build legacy tools from metadata
const legacyTools = [
  {
    name: 'query_elements',
    ...TOOL_METADATA.queryElements,
  },
  // ...
];

// Step 3: Build smart tools from metadata
const smartTools = [
  {
    name: 'query_elements',
    ...TOOL_METADATA.queryElements,
  },
  // ...
];
```

### Benefits

- **Single source of truth** for shared tool metadata
- **Eliminates 85+ lines of verbatim duplication**
- **Easier maintenance** - fix once, works in both modes
- **Consistent descriptions** - no accidental divergence

---

## Technical Details

### Tools That Are Identical

| Tool | Lines | Legacy | Smart | Same? |
|------|-------|--------|-------|-------|
| query_elements | 35 | ✓ | ✓ | YES |
| click_element | 30 | ✓ | ✓ | YES |
| fill_element | 38 | ✓ | ✓ | YES |
| navigate | 19 | ✓ | ✓ | YES |
| get_console_logs | 18 | ✓ | ✓ | YES |
| chrome_list_connections | 6 | ✓ | ✓ | YES |
| chrome_switch_connection | 12 | ✓ | ✓ | YES |
| chrome_disconnect | 14 | ✓ | ✓ | YES |

**Total identical lines:** 172 (not counting curly braces)

### Tools That Differ

| Tool | Legacy | Smart | Difference |
|------|--------|-------|------------|
| chrome | chrome_connect + chrome_launch | chrome(action) | Consolidated in smart |
| target | list_targets + switch_target | target(action) | Consolidated in smart |
| debugger tools | 11 separate tools | 7 consolidated tools | Consolidated in smart |

---

## Implementation Approach

### Phase 1: Extract Shared Metadata
- Create `toolMetadata` object containing all shared tool definitions
- Verify all 8 identical tools extracted correctly
- No behavior changes, purely structural

### Phase 2: Refactor Legacy Array
- Replace verbatim tool definitions with references to metadata
- Verify array length unchanged (23 tools)
- Verify activeTools selection still works

### Phase 3: Refactor Smart Array
- Replace verbatim tool definitions with references to metadata
- Verify array length unchanged (18 tools)
- Run full build/test cycle

### Phase 4: Verify
- Build succeeds
- No TypeScript errors
- Tool definitions match original (visual inspection)
- Both modes still register correct tools

---

## Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|-----------|
| Accidentally lose tool definition | Low | Critical | Extract + verify each tool before deletion |
| Metadata object becomes unwieldy | Medium | Low | Organize by category (chrome, dom, debugger) |
| Spread operator issues with schemas | Low | Medium | Test with actual tool registration |
| Missed one tool definition | Low | High | Diff original vs new before/after |

---

## Verification Strategy

### Automated
1. TypeScript compiler passes (no errors)
2. `npm run build` succeeds
3. Tool count matches: activeTools.length === expected

### Manual
1. Visual diff: Original legacyTools vs new legacyTools
2. Visual diff: Original smartTools vs new smartTools
3. Test with MCP Inspector: Both modes register correct tools
4. Sample tool: `query_elements` works identically in both modes

---

## Dependencies

- No external dependencies
- No changes to tool implementations required
- No changes to router logic required
- Pure refactoring of data structure

---

## Effort Estimate

| Task | Effort |
|------|--------|
| Create toolMetadata object | 30 min |
| Refactor legacyTools array | 15 min |
| Refactor smartTools array | 15 min |
| Verify and test | 30 min |
| **Total** | **90 min** |

---

## Confidence Assessment

**Confidence: HIGH**

**Why:**
- Clear problem: verbatim duplication in tool definitions
- Clear solution: extract metadata, build arrays from it
- No architectural changes needed
- No changes to tool implementations
- Straightforward refactoring
- Easy to verify (compare line-by-line)

**Unknowns: NONE**
- Exact structure of metadata object: Clear from existing code
- How to reference metadata: Standard JavaScript spread operator
- Verification method: Direct comparison with original

---

## Verdict: CONTINUE

Proceed to Sprint Planning. This is a HIGH confidence implementation task.
All unknowns resolved, clear technical path, low risk.
