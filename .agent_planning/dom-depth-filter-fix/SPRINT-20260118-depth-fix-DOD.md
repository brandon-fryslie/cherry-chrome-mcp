# Definition of Done: depth-fix

**Sprint:** Fix DOM Depth Filtering Logic
**Generated:** 2026-01-18

## Acceptance Criteria

### Functional Requirements

- [ ] Elements matching the CSS selector are NEVER filtered out regardless of their depth from body
- [ ] `query_elements("button")` returns all buttons even if they are at depth 20 from `<body>`
- [ ] `max_depth` parameter controls child traversal depth, not element filtering
- [ ] Child elision information is still provided for elements with children

### Code Quality

- [ ] `src/tools/dom.ts` changes are minimal and focused
- [ ] No new TypeScript errors or warnings
- [ ] Build passes: `npm run build`

### Documentation

- [ ] Tool description in `src/index.ts` accurately describes behavior
- [ ] `CLAUDE.md` updated if depth filtering description changes
- [ ] `README.md` updated if depth filtering description changes

### Verification

- [ ] Manual test: Query deeply nested element returns it
- [ ] Manual test: Query broad selector (`div`) returns elements with child info
- [ ] No regressions in existing functionality

## Out of Scope

- Adding new parameters or features
- Changing the child counting logic
- Performance optimizations

## Verification Command

```bash
npm run build && npm test
```

## Manual Test Scenario

1. Launch Chrome with `chrome_launch()`
2. Navigate to a page with deeply nested structure
3. Query a specific deeply nested element
4. Verify the element is returned (not filtered)
5. Verify child info is shown appropriately
