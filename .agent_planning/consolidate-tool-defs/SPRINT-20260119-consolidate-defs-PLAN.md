# Sprint: Consolidate Tool Definitions

**Generated:** 2026-01-19
**Confidence:** HIGH
**Status:** READY FOR IMPLEMENTATION
**Effort Estimate:** 90 minutes

---

## Sprint Goal

Eliminate 85+ lines of verbatim duplication in tool metadata by extracting shared tool definitions into a single `toolMetadata` object, then deriving both `legacyTools` and `smartTools` arrays from it.

---

## Deliverables

1. **Extract shared tool metadata** into single object organized by category
2. **Refactor legacyTools array** to reference metadata
3. **Refactor smartTools array** to reference metadata
4. **Verify** both arrays function identically to original
5. **Build succeeds** with zero TypeScript errors

---

## Work Items

### P0: Extract toolMetadata Object

**Goal:** Create single source of truth for tool definitions.

**Technical Notes:**
- Create `const toolMetadata = { ... }` object before `legacyTools` definition
- Organize by category: `chrome`, `dom`, `debugger`, `connection`
- Only include tools that are identical between legacy and smart modes
- Document which tools are included and why

**Acceptance Criteria:**
- [ ] New `toolMetadata` object created in `src/index.ts`
- [ ] All 8 identical tools extracted: queryElements, clickElement, fillElement, navigate, getConsoleLogs, chromeListConnections, chromeSwitchConnection, chromeDisconnect
- [ ] Metadata organized by category (chrome, dom, debugger, connection)
- [ ] Original descriptions preserved verbatim (no changes to content)
- [ ] Parameter defaults preserved (limit: 5, include_hidden: false, etc.)
- [ ] TypeScript compilation succeeds with no errors

**Implementation Guidance:**

```typescript
const toolMetadata = {
  dom: {
    queryElements: {
      description: 'Find elements by CSS selector...',
      inputSchema: {
        type: 'object',
        properties: { ... },
        required: ['selector'],
      },
    },
    clickElement: { ... },
    fillElement: { ... },
    navigate: { ... },
    getConsoleLogs: { ... },
  },
  connection: {
    chromeListConnections: { ... },
    chromeSwitchConnection: { ... },
    chromeDisconnect: { ... },
  },
};
```

**Key Points:**
- Use camelCase for object keys (queryElements, not query_elements)
- Keep tool name in properties as 'query_elements' (for MCP)
- Preserve indentation and formatting of original
- Do NOT modify descriptions or schemas

---

### P1: Refactor legacyTools Array

**Goal:** Replace verbatim definitions with references to metadata.

**Technical Notes:**
- Keep tools in same order as original for easy diffing
- Use spread operator: `...toolMetadata.dom.queryElements`
- Preserve tool name property override
- Keep unique legacy tools (chrome_connect, chrome_launch, etc.)

**Acceptance Criteria:**
- [ ] All 8 identical tools replaced with metadata references
- [ ] Legacy-only tools (chrome_connect, chrome_launch, etc.) unchanged
- [ ] Array length still 23 tools
- [ ] Each tool still has name property
- [ ] InputSchema intact and correct
- [ ] TypeScript compilation succeeds

**Implementation Guidance:**

```typescript
const legacyTools: Tool[] = [
  // Chrome Connection Management
  {
    name: 'chrome_connect',
    description: 'Connect to a Chrome instance...',
    inputSchema: { ... },
  },
  {
    name: 'chrome_launch',
    description: 'Launch a new Chrome instance...',
    inputSchema: { ... },
  },
  // DOM Tools (from metadata)
  {
    name: 'query_elements',
    ...toolMetadata.dom.queryElements,
  },
  {
    name: 'click_element',
    ...toolMetadata.dom.clickElement,
  },
  // ... continue with rest of tools
];
```

**Key Points:**
- Verify no accidental changes to legacy-only tools
- Check all unique legacy tools still present
- Confirm array length = 23

---

### P2: Refactor smartTools Array

**Goal:** Replace verbatim definitions with references to metadata.

**Technical Notes:**
- Same as legacyTools, but with consolidated tool names
- Keep consolidated tools (chrome, target, breakpoint, etc.) unchanged
- Use metadata references for shared tools

**Acceptance Criteria:**
- [ ] All 8 identical tools replaced with metadata references
- [ ] Smart-only/consolidated tools unchanged
- [ ] Array length still 18 tools
- [ ] All consolidated tools still present (chrome, target, breakpoint, step, execution, call_stack, evaluate, pause_on_exceptions)
- [ ] TypeScript compilation succeeds

**Implementation Guidance:**

```typescript
const smartTools: Tool[] = [
  // Chrome Connection Management (consolidated)
  {
    name: 'chrome',
    description: 'Connect or launch Chrome...',
    inputSchema: { ... },
  },
  // List connections (from metadata)
  {
    name: 'chrome_list_connections',
    ...toolMetadata.connection.chromeListConnections,
  },
  // ... continue with rest of tools
];
```

**Key Points:**
- Verify no accidental changes to consolidated tools
- Check all unique smart tools still present
- Confirm array length = 18

---

### P3: Verify Both Arrays

**Goal:** Confirm refactored arrays function identically to originals.

**Technical Notes:**
- Use diff tool to compare structure
- Check tool count matches
- Verify tool names are correct

**Acceptance Criteria:**
- [ ] `npm run build` succeeds with zero TypeScript errors
- [ ] No warnings or deprecations in compilation output
- [ ] legacyTools array length = 23 (verified)
- [ ] smartTools array length = 18 (verified)
- [ ] Each tool has name, description, inputSchema properties
- [ ] No undefined properties in refactored definitions
- [ ] Build output (`build/`) updated with changes

**Verification Steps:**
```bash
# Build and verify
npm run build

# Check tool counts
node -e "
  const legacy = require('./build/src/index.js').legacyTools;
  const smart = require('./build/src/index.js').smartTools;
  console.log('Legacy tools:', legacy.length);
  console.log('Smart tools:', smart.length);
"

# Visual inspection
# 1. Compare original src/index.ts with new version
# 2. Verify query_elements definition in both modes
# 3. Spot check one legacy tool and one smart tool
```

---

### P4: Test with MCP Inspector (Optional)

**Goal:** Verify both modes still work correctly at runtime.

**Technical Notes:**
- Test with `USE_LEGACY_TOOLS=false` (smart mode)
- Test with `USE_LEGACY_TOOLS=true` (legacy mode)
- Verify tools are registered correctly

**Acceptance Criteria:**
- [ ] Smart mode: All 18 tools registered (tested with MCP Inspector)
- [ ] Legacy mode: All 23 tools registered (tested with MCP Inspector)
- [ ] Sample tool (query_elements) works identically in both modes
- [ ] No runtime errors when executing tools

**Test Steps:**
```bash
# Test smart mode
npx @modelcontextprotocol/inspector node build/src/index.js

# In Inspector:
# 1. List tools - verify 18 tools present
# 2. Call query_elements with test selector
# 3. Verify result format correct

# Test legacy mode
USE_LEGACY_TOOLS=true npx @modelcontextprotocol/inspector node build/src/index.js

# In Inspector:
# 1. List tools - verify 23 tools present
# 2. Call query_elements with test selector
# 3. Verify result format identical to smart mode
```

---

## Dependencies

- None. Pure refactoring of data structure within single file.
- No changes to tool implementations needed.
- No changes to router logic needed.

---

## Risks & Mitigation

| Risk | Likelihood | Mitigation |
|------|------------|-----------|
| Accidentally remove tool definition | Low | Diff original vs new before commit |
| Spread operator causes schema corruption | Low | Verify each tool's inputSchema after refactor |
| Tool name mismatch between metadata key and name property | Low | Code review: check each tool name matches metadata key |
| Build fails due to TypeScript error | Low | Run `npm run build` after each phase |

---

## Acceptance Criteria Summary

**All of these must be true:**

1. ✓ `toolMetadata` object created with all 8 shared tools
2. ✓ `legacyTools` refactored to use metadata references
3. ✓ `smartTools` refactored to use metadata references
4. ✓ Both arrays still 23 and 18 tools respectively
5. ✓ All tool names correct and in place
6. ✓ All inputSchemas intact
7. ✓ TypeScript compilation succeeds
8. ✓ No build warnings or errors
9. ✓ Visual diff confirms no unintended changes
10. ✓ (Optional) MCP Inspector verification passes

---

## Implementation Notes

### Organization Strategy

Organize `toolMetadata` by category for clarity:

```typescript
const toolMetadata = {
  dom: {
    // DOM interaction tools
    queryElements: { ... },
    clickElement: { ... },
    fillElement: { ... },
    navigate: { ... },
    getConsoleLogs: { ... },
  },
  connection: {
    // Connection management tools (shared)
    chromeListConnections: { ... },
    chromeSwitchConnection: { ... },
    chromeDisconnect: { ... },
  },
};
```

### Key Principle

**Do not change ANY content.** This is structural refactoring only:
- No description changes
- No schema changes
- No parameter defaults changed
- No property additions/removals

---

## Success Criteria

✅ **Definition of Done (DoD):**

The refactoring is complete when:
1. `toolMetadata` object exists and is used by both arrays
2. Both `legacyTools` and `smartTools` reference metadata for shared tools
3. Build succeeds: `npm run build` → zero errors
4. Diff shows only the refactoring (no content changes)
5. Tool counts: legacy 23, smart 18 (unchanged)
6. All tests pass (if any)

---

## Timeline

| Phase | Est. Time | Task |
|-------|-----------|------|
| Setup | 10 min | Review current structure, plan organization |
| Extract | 25 min | Create toolMetadata object, verify completeness |
| Refactor Legacy | 15 min | Update legacyTools array |
| Refactor Smart | 15 min | Update smartTools array |
| Verify | 20 min | Build, test, diff verification |
| **Total** | **85 min** | |

---

## Next Steps After Approval

1. **Implement Phase 1:** Extract toolMetadata
2. **Implement Phase 2:** Refactor legacyTools
3. **Implement Phase 3:** Refactor smartTools
4. **Execute Phase 4:** Build and verify
5. **Optional Phase 5:** Test with MCP Inspector
6. **Commit:** Push consolidated tool definitions
