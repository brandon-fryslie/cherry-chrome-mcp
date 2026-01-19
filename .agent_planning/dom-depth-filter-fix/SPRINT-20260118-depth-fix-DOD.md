# Definition of Done: depth-fix

**Sprint:** Remove DOM Depth Filtering
**Generated:** 2026-01-18

## Acceptance Criteria

### Functional Requirements

- [ ] Elements matching the CSS selector are NEVER filtered by depth
- [ ] `query_elements("button")` returns all buttons regardless of depth from body
- [ ] Default limit is 5 elements (changed from 20)
- [ ] Maximum limit is 20 elements (hard cap)
- [ ] `childInfo` is shown for ANY element with children (not just at max depth)

### Code Changes

- [ ] `src/tools/dom.ts`: Depth filtering removed, limit default = 5, max = 20
- [ ] `src/index.ts`: Tool description updated, `max_depth` removed
- [ ] `src/types.ts`: `QueryElementsResult` simplified
- [ ] `src/config.ts`: `MAX_DOM_DEPTH` and `HARD_MAX_DOM_DEPTH` removed

### Build & Test

- [ ] `npm run build` passes with no errors
- [ ] `npm test` passes
- [ ] No TypeScript errors

### Documentation

- [ ] `CLAUDE.md` updated - depth filtering section removed/rewritten
- [ ] `README.md` updated - depth filtering section removed/rewritten

## Verification

### Manual Test Scenarios

1. **Deep element query works:**
   - Navigate to a page with deeply nested elements
   - Query: `query_elements(".deep-nested-class")`
   - Verify: Element is returned regardless of depth

2. **Limit is respected:**
   - Query: `query_elements("div")` (many matches)
   - Verify: Returns max 5 by default
   - Verify: Shows message "[X more element(s) not shown. Use a more specific selector to narrow results.]"
   - Query: `query_elements("div", {limit: 10})`
   - Verify: Returns max 10

3. **childInfo shown:**
   - Query any element with children
   - Verify: `childInfo` block shows direct children and total descendants

## Out of Scope

- Performance optimizations
- New features
- Changes to other tools
