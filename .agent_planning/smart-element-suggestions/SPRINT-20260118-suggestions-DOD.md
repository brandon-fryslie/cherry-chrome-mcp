# Definition of Done: Smart Element Suggestions

## Acceptance Criteria

### AC1: Suggestion Gathering Function
- [ ] `gatherZeroResultSuggestions(page, selector)` function exists in `context.ts`
- [ ] Function gathers page inventory (classes, IDs, tags, data attributes)
- [ ] Function extracts search terms from attempted selector
- [ ] Function returns formatted string of suggestions

### AC2: Fuzzy Matching Logic
- [ ] Classes containing search terms are suggested with counts
- [ ] IDs containing search terms are suggested
- [ ] Tags from attempted selector are matched
- [ ] Results sorted by relevance/count, limited to top 5

### AC3: Integration with queryElements
- [ ] Zero-result case calls `gatherZeroResultSuggestions()`
- [ ] Response includes original "No elements found" message
- [ ] Response includes similar selectors section
- [ ] Response includes page structure summary

### AC4: Page Structure Summary
- [ ] Shows count of interactive elements (buttons, inputs, links, forms)
- [ ] Shows total element count
- [ ] Information is concise and actionable

### AC5: Build & Tests
- [ ] `npm run build` passes
- [ ] No TypeScript errors
- [ ] Existing tests still pass

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

1. Build: `npm run build`
2. Manual test with MCP Inspector on a page with elements
3. Try a selector that doesn't exist, verify suggestions appear
