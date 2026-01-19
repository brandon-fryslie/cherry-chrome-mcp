# Evaluation: DOM Depth Filter Fix

**Generated:** 2026-01-18
**Topic:** Fix DOM depth filtering to never filter matched elements
**Verdict:** CONTINUE

## Summary

The `query_elements` tool's DOM depth filtering is incorrectly filtering out elements that directly match the CSS selector. The filtering should start FROM matched elements, not filter the matched elements themselves.

## Current Behavior (Bug)

```javascript
// In src/tools/dom.ts lines 63-95

function getDepth(el) {
  let depth = 0;
  let current = el;
  while (current && current !== document.body) {
    depth++;
    current = current.parentElement;
  }
  return depth;
}

// ALL matching elements filtered by depth from body
const allElements = Array.from(document.querySelectorAll(selector));
const elementsWithDepth = allElements.map(el => ({
  element: el,
  depth: getDepth(el)
}));
const filteredElements = elementsWithDepth.filter(item => item.depth <= maxDepth);
```

**Problem:** If a button is at depth 10 from `<body>` and user queries `query_elements("button.submit")`, the button is filtered out because `10 > maxDepth(3)`.

## Expected Behavior (Fix)

1. Elements matching the selector should ALWAYS be returned (never filtered by their own depth)
2. The `max_depth` parameter should control how deep we descend INTO children of matched elements
3. Child elision should show descendants up to `max_depth` levels below the matched element

**Example:**
```
query_elements("button.submit", max_depth=2)
```
- The button itself is always returned regardless of its depth from body
- If the button has children, show child info up to 2 levels deep
- Children deeper than 2 levels from the matched element get elided

## Affected Files

| File | Changes Required |
|------|------------------|
| `src/tools/dom.ts` | Rewrite depth calculation logic in `queryElements()` |
| `src/types.ts` | Possibly update `QueryElementsResult` if structure changes |
| Tool descriptions | Update to clarify depth is relative to matched elements |

## Technical Approach

### Option A: Relative Depth Calculation (Recommended)

Change depth to be calculated **relative to each matched element**, not from body:

```javascript
// Always include all matched elements
const allElements = Array.from(document.querySelectorAll(selector));

// For each matched element, calculate child info based on relative depth
return allElements.slice(0, limit).map((el, idx) => {
  // Count children within maxDepth levels of THIS element
  const childInfo = getChildInfoRelative(el, maxDepth);

  return {
    // ... element data
    childInfo: childInfo,
    // depth field becomes optional/informational only
    depthFromBody: getDepthFromBody(el)
  };
});
```

**Pros:** Clear semantics, matched elements never filtered, depth parameter makes intuitive sense
**Cons:** Changes output structure slightly (depth becomes informational)

### Option B: Separate Matched vs Descendant Handling

Keep depth from body but never filter direct matches:

```javascript
// Never filter matched elements
const allElements = Array.from(document.querySelectorAll(selector));

// Still track depth for informational purposes
// But use maxDepth only for child elision decisions
```

**Pros:** Minimal change to output structure
**Cons:** `depth` field semantics become confusing (shown but not used for filtering)

## Recommendation

**Option A (Relative Depth)** is cleaner because:
1. The depth parameter has clear, intuitive meaning: "how deep into children to look"
2. No confusing "depth from body" field that doesn't affect filtering
3. Aligns with user mental model: "show me this element and its structure up to N levels deep"

## Dependencies

- None. This is a self-contained change to the DOM tool.

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Breaking change for agents relying on depth filtering | LOW | The current behavior is buggy; fixing it is an improvement |
| Output structure changes | LOW | Only childInfo calculation changes |

## Test Cases

1. `query_elements("button")` on page where buttons are at depth 20 → should return buttons
2. `query_elements("div.container", max_depth=2)` → returns container, elides children beyond 2 levels
3. `query_elements("*", max_depth=1)` → returns all elements, but only shows immediate children

## Conclusion

This is a HIGH confidence fix. The bug is clear, the solution is straightforward, and there are no ambiguities. Ready for implementation planning.
