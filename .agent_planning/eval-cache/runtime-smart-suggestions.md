# Runtime: Smart Element Suggestions

**Last Updated:** 2026-01-18
**Scope:** Zero-result selector suggestions in query_elements

## Verified Behavior

### Trigger Condition
- **Only runs when:** `query_elements` finds 0 matching elements
- **Does not run when:** Any elements match (no performance impact on normal queries)

### Data Gathering Pattern
**Single Source of Truth:**
- One `page.evaluate()` call gathers complete `PageInventory`
- Inventory includes: classes, IDs, tags, data-attrs, interactive counts, total
- All suggestion logic operates on this single data snapshot

### Search Term Extraction
**Comprehensive Parsing:**
- Class names: `.login-btn` → `["login", "btn"]`
- IDs: `#submitButton` → `["submit", "button"]`
- Tags: `button` → `["button"]`
- Attributes: `[data-test='login']` → `["login"]`
- Splits on: hyphens, underscores, camelCase boundaries
- Lowercases and deduplicates

### Fuzzy Matching Strategy
**Matching Order:**
1. Classes containing any search term
2. IDs containing any search term
3. Tags matching search terms exactly
4. Data attributes containing any search term

**Sorting Logic:**
- Primary: Element count (descending) - most common first
- Secondary: Selector length (ascending) - shorter/cleaner first
- Limit: Top 5 suggestions

### Output Structure
**Two sections:**
1. Similar selectors (if any found):
   - Format: `  - .selector (N elements) - class contains "term"`
   - Includes reason for each suggestion
2. Page structure (always shown):
   - Counts: buttons, inputs, links, forms
   - Total element count
   - Proper pluralization

### Error Handling
**Silent Failure:**
- If suggestion gathering fails (e.g., page context lost), returns empty string
- Original "No elements found" message still shown
- No error thrown to user
- Consistent with other context gathering functions

## Edge Cases

### No Search Terms Extracted
- If selector is complex/unparseable, `extractSearchTerms()` returns `[]`
- `findSimilarSelectors()` returns `[]` (no suggestions)
- Page structure summary still shown

### No Matches Found
- If no classes/IDs/tags match search terms
- "Similar selectors" section omitted
- Page structure summary still shown

### Large Pages
- `document.querySelectorAll('*')` scans entire DOM
- Performance proportional to element count
- Only runs on zero results (acceptable tradeoff)

## Type Safety
- `PageInventory` interface ensures correct data structure
- `SelectorSuggestion` interface ensures consistent suggestion format
- TypeScript compilation catches mismatches

## Integration Points
- **Entry:** `dom.ts:297-301` (zero-result case)
- **Function:** `context.ts:198` (`gatherZeroResultSuggestions`)
- **Helpers:** `extractSearchTerms` (line 62), `findSimilarSelectors` (line 117)
- **Types:** `types.ts:210-240`

## Pattern Compliance
- **ONE SOURCE OF TRUTH:** ✅ Single page.evaluate() gathers inventory
- **SINGLE ENFORCER:** ✅ Matching centralized in findSimilarSelectors()
- **LOCALITY:** ✅ All context gathering in context.ts
