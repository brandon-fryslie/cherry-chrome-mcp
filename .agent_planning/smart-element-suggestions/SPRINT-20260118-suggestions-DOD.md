# Definition of Done: Smart Element Suggestions

## Acceptance Criteria

### AC1: Suggestion Gathering Function
- [x] `gatherZeroResultSuggestions(page, selector)` function exists in `context.ts`
- [x] Function gathers page inventory (classes, IDs, tags, data attributes)
- [x] Function extracts search terms from attempted selector
- [x] Function returns formatted string of suggestions

### AC2: Fuzzy Matching Logic
- [x] Classes containing search terms are suggested with counts
- [x] IDs containing search terms are suggested
- [x] Tags from attempted selector are matched
- [x] Results sorted by relevance/count, limited to top 5

### AC3: Integration with queryElements
- [x] Zero-result case calls `gatherZeroResultSuggestions()`
- [x] Response includes original "No elements found" message
- [x] Response includes similar selectors section
- [x] Response includes page structure summary

### AC4: Page Structure Summary
- [x] Shows count of interactive elements (buttons, inputs, links, forms)
- [x] Shows total element count
- [x] Information is concise and actionable

### AC5: Build & Tests
- [x] `npm run build` passes
- [x] No TypeScript errors
- [x] Existing tests still pass

## Implementation Complete

All acceptance criteria met in commit cdab826:
- Added `PageInventory` and `SelectorSuggestion` types to `src/types.ts`
- Implemented `gatherZeroResultSuggestions()` in `src/tools/context.ts` with:
  - `extractSearchTerms()` helper to parse selectors
  - `findSimilarSelectors()` helper for fuzzy matching
  - Page inventory gathering via JavaScript execution
- Integrated with `queryElements()` in `src/tools/dom.ts`
- Build passes with no TypeScript errors
- All existing tests pass (5/5)

## Example Output

```
No elements found matching selector: .login-btn

Similar selectors that exist:
  - .login-button (3 elements) - class contains "login"
  - #loginBtn (1 element) - ID contains "login"
  - .btn-primary (8 elements) - class contains "btn"

Page structure:
  - 12 buttons, 5 inputs, 8 links, 2 forms
  - Total: 156 elements
```

## Verification

1. Build: `npm run build` ✓
2. Manual test with MCP Inspector on a page with elements (ready for user testing)
3. Try a selector that doesn't exist, verify suggestions appear (ready for user testing)
