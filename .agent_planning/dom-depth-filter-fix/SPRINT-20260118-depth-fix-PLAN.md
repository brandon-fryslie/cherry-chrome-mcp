# Sprint: depth-fix - Fix DOM Depth Filtering Logic

**Generated:** 2026-01-18
**Confidence:** HIGH
**Status:** READY FOR IMPLEMENTATION

## Sprint Goal

Fix `query_elements` to never filter out elements that directly match the selector. Depth filtering should control child traversal depth, not filter matched elements.

## Scope

**Deliverables:**
1. Fix depth filtering logic in `queryElements()` function
2. Update tool descriptions to clarify depth semantics
3. Verify fix works correctly

## Work Items

### P0: Fix depth filtering in queryElements()

**File:** `src/tools/dom.ts` (lines 57-146)

**Changes:**

1. Remove filtering of matched elements by depth
2. Change depth calculation to be relative to each matched element (for child traversal)
3. Keep `depthFromBody` as optional informational field (backwards compatible)

**Implementation:**

```javascript
// NEW: Never filter matched elements
const allElements = Array.from(document.querySelectorAll(selector));
const limitedElements = allElements.slice(0, limit);

// For each element, calculate child info based on max_depth from THAT element
return {
  found: allElements.length,
  elements: limitedElements.map((el, idx) => {
    // Child info: traverse up to maxDepth levels deep from THIS element
    const childInfo = el.children.length > 0 ? {
      directChildren: el.children.length,
      totalDescendants: countDescendants(el),
      // Could add: descendantsWithinDepth for more detail
    } : null;

    return {
      // ... existing fields
      depthFromBody: getDepth(el),  // informational only
      childInfo: childInfo
    };
  })
};
```

**Acceptance Criteria:**
- [ ] `query_elements("button")` returns buttons regardless of their depth from body
- [ ] Elements at depth 20 from body are returned when they match selector
- [ ] Child elision still works (shows child counts for elements with children)
- [ ] No regression: simple queries still work correctly

**Technical Notes:**
- Remove `filteredByDepth` and `foundAfterDepthFilter` from return value (no longer filtering)
- Keep `depthFromBody` in element data for informational purposes
- Update the elision message logic - it should trigger based on having children, not hitting max depth

### P1: Update tool descriptions

**File:** `src/index.ts` (tool definition for `query_elements`)

**Changes:**
- Update description to clarify that depth controls child traversal, not element filtering
- Remove mention of "filters out deeply nested elements"

**Acceptance Criteria:**
- [ ] Tool description accurately describes new behavior
- [ ] No mention of filtering matched elements by depth

### P2: Update output formatting

**File:** `src/tools/dom.ts` (lines 154-175)

**Changes:**
- Remove the "Filtered out N deeply nested elements" message
- Simplify output header since we no longer filter by depth

**Acceptance Criteria:**
- [ ] Output no longer mentions filtering by depth
- [ ] Output shows accurate count of matched elements

### P3: Update documentation

**Files:** `CLAUDE.md`, `README.md`

**Changes:**
- Update DOM depth filtering description to match new behavior
- Clarify that max_depth controls child traversal depth

**Acceptance Criteria:**
- [ ] Documentation accurately describes behavior
- [ ] Examples show correct usage

## Dependencies

- None

## Risks

| Risk | Mitigation |
|------|------------|
| Output structure change breaks consumers | Changes are backwards-compatible; we add fields, not remove them |
| Performance if many elements match | Already have `limit` parameter to control this |
