# Smart Element Suggestions on Empty Results

**Confidence:** HIGH
**Sprint:** 2026-01-18
**Estimated Scope:** Small-Medium

## Problem Statement

When `query_elements` returns 0 matches, the agent receives a dead-end message:
```
No elements found matching selector: .login-btn
```

This wastes agent turns without guidance. The agent must guess at alternatives.

## Proposed Solution

When a selector finds nothing, analyze the page and suggest alternatives:
```
No elements found matching selector: .login-btn

Similar selectors that DO exist:
  - .login-button (3 elements)
  - #loginBtn (1 element)
  - button[type="submit"] (2 elements)

Page structure summary:
  - 12 buttons, 5 inputs, 8 links
  - Classes containing "login": login-form, login-header, login-button
  - IDs containing "login": loginForm, loginBtn
```

## Design

### New Function: `gatherZeroResultSuggestions()`

**Location:** `src/tools/context.ts` (alongside other context gatherers)

**Input:** `page: Page, attemptedSelector: string`

**Output:** String of formatted suggestions

**Logic:**
1. Parse attempted selector to understand intent (class? ID? tag? attribute?)
2. Gather page inventory (all classes, IDs, tags, data-* attributes)
3. Fuzzy match against attempted selector
4. Return top suggestions with element counts

### JavaScript to Execute in Page

```javascript
(() => {
  const attemptedSelector = '${escapedSelector}';

  // Gather all selectable elements
  const allElements = document.querySelectorAll('*');

  // Extract classes (with counts)
  const classCounts = {};
  allElements.forEach(el => {
    if (el.className && typeof el.className === 'string') {
      el.className.split(' ').filter(c => c).forEach(cls => {
        classCounts[cls] = (classCounts[cls] || 0) + 1;
      });
    }
  });

  // Extract IDs
  const ids = Array.from(document.querySelectorAll('[id]'))
    .map(el => el.id)
    .filter(id => id);

  // Tag counts
  const tagCounts = {};
  allElements.forEach(el => {
    const tag = el.tagName.toLowerCase();
    tagCounts[tag] = (tagCounts[tag] || 0) + 1;
  });

  // Data attributes
  const dataAttrs = {};
  allElements.forEach(el => {
    Array.from(el.attributes)
      .filter(a => a.name.startsWith('data-'))
      .forEach(a => {
        dataAttrs[a.name] = (dataAttrs[a.name] || 0) + 1;
      });
  });

  // Interactive elements summary
  const interactive = {
    buttons: document.querySelectorAll('button, [role="button"]').length,
    inputs: document.querySelectorAll('input, textarea, select').length,
    links: document.querySelectorAll('a[href]').length,
    forms: document.querySelectorAll('form').length,
  };

  return {
    classCounts,
    ids,
    tagCounts,
    dataAttrs,
    interactive,
    totalElements: allElements.length
  };
})()
```

### Suggestion Matching Logic

```typescript
function findSimilarSelectors(
  attemptedSelector: string,
  pageInventory: PageInventory
): Suggestion[] {
  const suggestions: Suggestion[] = [];

  // Extract search terms from selector
  // ".login-btn" → ["login", "btn"]
  // "#submitButton" → ["submit", "button"]
  const terms = extractSearchTerms(attemptedSelector);

  // Match against classes
  for (const [cls, count] of Object.entries(pageInventory.classCounts)) {
    if (terms.some(t => cls.toLowerCase().includes(t.toLowerCase()))) {
      suggestions.push({
        selector: `.${cls}`,
        count,
        reason: `class contains "${terms.find(t => cls.toLowerCase().includes(t.toLowerCase()))}"`
      });
    }
  }

  // Match against IDs
  for (const id of pageInventory.ids) {
    if (terms.some(t => id.toLowerCase().includes(t.toLowerCase()))) {
      suggestions.push({
        selector: `#${id}`,
        count: 1,
        reason: `ID contains "${terms.find(t => id.toLowerCase().includes(t.toLowerCase()))}"`
      });
    }
  }

  // Sort by relevance and count
  return suggestions
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
}
```

## Integration Point

**In `queryElements()` (dom.ts lines 174-176):**

```typescript
// Before
if (data.found === 0) {
  return successResponse(`No elements found matching selector: ${selector}`);
}

// After
if (data.found === 0) {
  const suggestions = await gatherZeroResultSuggestions(page, selector);
  return successResponse(
    `No elements found matching selector: ${selector}\n\n${suggestions}`
  );
}
```

## Files to Modify

| File | Change |
|------|--------|
| `src/tools/context.ts` | Add `gatherZeroResultSuggestions()` function |
| `src/tools/dom.ts` | Update `queryElements()` zero-result case |
| `src/types.ts` | Add `PageInventory` and `Suggestion` types (optional) |

## Success Criteria

1. When `query_elements` returns 0 results, response includes:
   - Similar selectors that exist (class/ID fuzzy match)
   - Element counts for suggestions
   - Page structure summary (buttons, inputs, links)
2. Suggestions are sorted by relevance and element count
3. No performance impact on normal (non-zero) queries
4. Build passes with no errors

## Non-Goals

- Full CSS selector parsing (just extract obvious terms)
- Accessibility tree analysis (future enhancement)
- Machine learning-based suggestions
