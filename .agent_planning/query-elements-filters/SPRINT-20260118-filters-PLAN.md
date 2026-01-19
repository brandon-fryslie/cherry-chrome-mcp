# Sprint: filters - Add text_contains and include_hidden Parameters

**Generated:** 2026-01-18
**Confidence:** HIGH
**Status:** READY FOR IMPLEMENTATION

## Sprint Goal

Add two new filtering parameters to `query_elements`: `text_contains` for text-based filtering and `include_hidden` for visibility control.

## Scope

**Deliverables:**
1. `text_contains` parameter - filter elements by visible text content
2. `include_hidden` parameter - control whether hidden elements are returned (default: false)
3. Updated tool definitions with new parameters
4. Updated documentation

## Work Items

### P0: Add text_contains parameter

**File:** `src/tools/dom.ts`

**Changes:**
- Add `text_contains?: string` to function args
- Filter elements where `textContent` includes the search string (case-insensitive)
- Apply filter BEFORE the limit is applied

**Acceptance Criteria:**
- [ ] `query_elements({ selector: "button", text_contains: "Submit" })` returns only buttons containing "Submit"
- [ ] Text matching is case-insensitive
- [ ] Filter is applied before limit (so limit applies to filtered results)
- [ ] Works with partial matches ("Sub" matches "Submit")

### P1: Add include_hidden parameter

**File:** `src/tools/dom.ts`

**Changes:**
- Add `include_hidden?: boolean` to function args (default: false)
- Filter out elements where:
  - `offsetParent === null` (already tracked as `visible`)
  - OR `getComputedStyle(el).display === 'none'`
  - OR `getComputedStyle(el).visibility === 'hidden'`
  - OR element has zero width AND zero height
- Apply filter BEFORE limit

**Acceptance Criteria:**
- [ ] By default, only visible elements are returned
- [ ] `include_hidden: true` returns both visible and hidden elements
- [ ] Hidden detection includes: display:none, visibility:hidden, offsetParent===null, zero dimensions
- [ ] Filter is applied before limit

### P2: Update tool definitions

**File:** `src/index.ts`

**Changes:**
- Add `text_contains` parameter to query_elements schema (both legacy and smart modes)
- Add `include_hidden` parameter with default: false

**Acceptance Criteria:**
- [ ] Both parameters appear in tool schema
- [ ] Descriptions are clear and helpful
- [ ] Defaults are correct (text_contains: undefined, include_hidden: false)

### P3: Update output to show filter info

**File:** `src/tools/dom.ts`

**Changes:**
- When filters are active, show what was filtered in output header

**Example output:**
```
Found 50 element(s) matching 'button'
  Filtered by text "Submit": 3 match
  Filtered by visibility: 2 visible
Showing first 2:
```

**Acceptance Criteria:**
- [ ] Output shows filter summary when filters are active
- [ ] Shows count before and after each filter stage

### P4: Update documentation

**Files:** `CLAUDE.md`, `README.md`

**Changes:**
- Document new parameters
- Add examples of usage

**Acceptance Criteria:**
- [ ] Both parameters documented
- [ ] Examples show common use cases

## Summary of New Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `text_contains` | string | undefined | Filter to elements containing this text (case-insensitive) |
| `include_hidden` | boolean | false | Include hidden elements (display:none, visibility:hidden, etc.) |

## Filter Order

1. CSS selector match (`document.querySelectorAll`)
2. Visibility filter (unless `include_hidden: true`)
3. Text filter (if `text_contains` provided)
4. Limit applied to remaining elements

## Dependencies

- None

## Risks

| Risk | Mitigation |
|------|------------|
| Performance with large DOMs | Filters run in browser context, should be fast |
| Edge cases in visibility detection | Use multiple checks (offsetParent, computed style, dimensions) |
