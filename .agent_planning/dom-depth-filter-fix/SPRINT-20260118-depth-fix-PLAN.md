# Sprint: depth-fix - Remove DOM Depth Filtering

**Generated:** 2026-01-18
**Confidence:** HIGH
**Status:** READY FOR IMPLEMENTATION

## Sprint Goal

Remove DOM depth filtering from `query_elements`. Use `limit` parameter (default 5, max 20) for result size control instead of filtering by depth from body.

## Scope

**Deliverables:**
1. Remove depth filtering logic from `queryElements()` function
2. Change default limit from 20 to 5
3. Update tool descriptions
4. Update documentation

## Work Items

### P0: Remove depth filtering and update limit defaults

**File:** `src/tools/dom.ts`

**Changes:**

1. Remove depth filtering logic entirely
2. Change default limit from 20 to 5
3. Keep the limit parameter (max 20)
4. Remove `filteredByDepth`, `foundAfterDepthFilter`, `maxDepth` from return value
5. Still show `childInfo` for ALL elements with children (not just at max depth)
6. Keep `depthFromBody` as informational only (optional - can remove if not useful)

**Acceptance Criteria:**
- [ ] `query_elements("button")` returns buttons regardless of their depth from body
- [ ] Default limit is 5 elements
- [ ] Maximum limit is 20 elements
- [ ] No depth filtering occurs - all matched elements are candidates
- [ ] `childInfo` shows for any element with children
- [ ] Build passes: `npm run build`

### P1: Update tool definitions

**File:** `src/index.ts`

**Changes:**
- Update description: remove mention of depth filtering
- Change limit default in schema from 20 to 5
- Remove `max_depth` parameter entirely (or keep but document as no-op)

**Acceptance Criteria:**
- [ ] Tool description accurately describes new behavior
- [ ] Limit default is 5 in tool schema
- [ ] `max_depth` parameter removed or deprecated

### P2: Update type definitions

**File:** `src/types.ts`

**Changes:**
- Remove `filteredByDepth`, `foundAfterDepthFilter`, `maxDepth` from `QueryElementsResult`
- Keep or remove `depth` from element data (informational only)

**Acceptance Criteria:**
- [ ] Types match new return structure

### P3: Update output formatting

**File:** `src/tools/dom.ts` (lines 154-175)

**Changes:**
- Remove "Filtered out N deeply nested elements" message
- Simplify output header
- Add hint when results are truncated telling agent to use more specific selector

**Acceptance Criteria:**
- [ ] Output no longer mentions depth filtering
- [ ] Shows clean count: "Found N element(s), showing first M"
- [ ] When truncated, shows: "[X more element(s) not shown. Use a more specific selector to narrow results.]"

### P4: Remove config constants

**File:** `src/config.ts`

**Changes:**
- Remove `MAX_DOM_DEPTH` constant
- Remove `HARD_MAX_DOM_DEPTH` constant

**Acceptance Criteria:**
- [ ] Unused depth constants removed

### P5: Update documentation

**Files:** `CLAUDE.md`, `README.md`

**Changes:**
- Remove DOM depth filtering documentation
- Update to describe limit-based result control
- Note default of 5, max of 20

**Acceptance Criteria:**
- [ ] Documentation accurately describes new behavior
- [ ] No mention of depth filtering

## Summary of Changes

| Aspect | Before | After |
|--------|--------|-------|
| Default limit | 20 | 5 |
| Max limit | unlimited | 20 |
| Depth filtering | Yes (depth from body) | None |
| `max_depth` param | Controls filtering | Removed |
| `childInfo` shown | Only at max depth | For all elements with children |

## Dependencies

- None

## Risks

| Risk | Mitigation |
|------|------------|
| Breaking change for agents using `max_depth` | Document as removed, parameter can be ignored if passed |
| More elements returned for broad queries | Lower default limit (5) compensates |
