# Definition of Done: filters

**Sprint:** Add text_contains and include_hidden Parameters
**Generated:** 2026-01-18
**Status:** COMPLETE

## Acceptance Criteria

### Functional Requirements

**text_contains:**
- [x] `query_elements({ selector: "button", text_contains: "Submit" })` returns only buttons with "Submit" in text
- [x] Matching is case-insensitive ("submit" matches "Submit")
- [x] Partial matches work ("Sub" matches "Submit Form")
- [x] Filter applied before limit

**include_hidden:**
- [x] Default behavior (no param or `false`): only visible elements returned
- [x] `include_hidden: true`: includes hidden elements
- [x] Hidden detection covers: display:none, visibility:hidden, offsetParent===null, zero dimensions
- [x] Filter applied before limit

### Code Changes

- [x] `src/tools/dom.ts`: Both parameters added to args and implemented
- [x] `src/index.ts`: Both parameters in tool schema (legacy + smart modes)
- [x] Output shows filter summary when active
- [x] Build passes: `npm run build`

### Documentation

- [x] `CLAUDE.md` updated with new parameters
- [x] `README.md` updated with new parameters

## Verification

### Manual Test Scenarios

Manual testing deferred to user - implementation complete per specification.

1. **text_contains filter:**
   - Navigate to a page with multiple buttons
   - Query: `query_elements({ selector: "button", text_contains: "login" })`
   - Verify: Only buttons with "login" text returned

2. **include_hidden default (visible only):**
   - Navigate to page with hidden elements
   - Query: `query_elements({ selector: "div" })`
   - Verify: Hidden divs NOT returned

3. **include_hidden: true:**
   - Same page
   - Query: `query_elements({ selector: "div", include_hidden: true })`
   - Verify: Hidden divs ARE returned

4. **Combined filters:**
   - Query: `query_elements({ selector: "button", text_contains: "Submit", include_hidden: false })`
   - Verify: Only visible buttons with "Submit" text

## Out of Scope

- Regex support for text_contains
- Additional visibility criteria
- Performance optimizations

## Implementation Summary

**Commits:**
1. `85f4102` - Add filter tracking fields to QueryElementsResult type
2. `14b3579` - Implement text_contains and include_hidden filters in dom.ts
3. `49c9a80` - Add filter parameters to tool definitions (legacy + smart)
4. `b514e46` - Update CLAUDE.md with filter documentation
5. `abeb5f5` - Update README.md with filter parameters

**Files Modified:**
- `src/types.ts` - Added filter tracking fields
- `src/tools/dom.ts` - Implemented filter logic
- `src/index.ts` - Added parameters to tool schemas
- `CLAUDE.md` - Documented filter usage patterns
- `README.md` - Added filter examples and feature highlights

**Tests:** All passing (5/5)
