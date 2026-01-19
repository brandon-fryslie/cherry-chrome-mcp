# Implementation Context: depth-fix

**Sprint:** Fix DOM Depth Filtering Logic
**Generated:** 2026-01-18

## Key Files

| File | Purpose | Changes Required |
|------|---------|------------------|
| `src/tools/dom.ts` | DOM interaction tools | Primary fix - lines 57-175 |
| `src/index.ts` | Tool definitions | Update `query_elements` description |
| `src/types.ts` | TypeScript types | Minor: update `QueryElementsResult` if needed |
| `CLAUDE.md` | Project docs | Update depth filtering description |
| `README.md` | User docs | Update depth filtering description |

## Current Implementation (Bug)

Location: `src/tools/dom.ts` lines 57-146

```javascript
// JavaScript executed in page context
const script = `
  (() => {
    const maxDepth = ${maxDepth};

    // Calculate depth from body
    function getDepth(el) {
      let depth = 0;
      let current = el;
      while (current && current !== document.body) {
        depth++;
        current = current.parentElement;
      }
      return depth;
    }

    // Get all matching elements
    const allElements = Array.from(document.querySelectorAll('${escapedSelector}'));

    // BUG: Filter by depth (filters out matched elements!)
    const elementsWithDepth = allElements.map(el => ({
      element: el,
      depth: getDepth(el)
    }));
    const filteredElements = elementsWithDepth.filter(item => item.depth <= maxDepth);
    // ^^^ THIS IS THE BUG - filtering matched elements by their depth from body

    // ...
  })()
`;
```

## Fixed Implementation

```javascript
const script = `
  (() => {
    const maxDepth = ${maxDepth};

    function getDepthFromBody(el) {
      let depth = 0;
      let current = el;
      while (current && current !== document.body) {
        depth++;
        current = current.parentElement;
      }
      return depth;
    }

    function countDescendants(el) {
      let count = 0;
      function countRecursive(node) {
        for (const child of node.children) {
          count++;
          countRecursive(child);
        }
      }
      countRecursive(el);
      return count;
    }

    // Get all matching elements - NEVER filter by depth
    const allElements = Array.from(document.querySelectorAll('${escapedSelector}'));
    const limit = ${limit};
    const limitedElements = allElements.slice(0, limit);

    return {
      found: allElements.length,
      // REMOVED: foundAfterDepthFilter, filteredByDepth, maxDepth
      elements: limitedElements.map((el, idx) => {
        const rect = el.getBoundingClientRect();

        // Child info for elements with children
        let childInfo = null;
        if (el.children.length > 0) {
          childInfo = {
            directChildren: el.children.length,
            totalDescendants: countDescendants(el)
          };
        }

        return {
          index: idx,
          selector: '${escapedSelector}',
          tag: el.tagName.toLowerCase(),
          text: el.textContent ? el.textContent.trim().substring(0, 100) : '',
          id: el.id || null,
          classes: el.className ? el.className.split(' ').filter(c => c) : [],
          visible: el.offsetParent !== null,
          depthFromBody: getDepthFromBody(el),  // Informational only
          childInfo: childInfo,
          position: { /* ... */ },
          attributes: { /* ... */ }
        };
      })
    };
  })()
`;
```

## Output Formatting Changes

Location: `src/tools/dom.ts` lines 154-175

**Current (remove):**
```javascript
if (filteredCount > 0) {
  output.push(`Found ${foundTotal} element(s) matching '${selector}'`);
  output.push(
    `Filtered out ${filteredCount} deeply nested element(s) (depth > ${maxDepthUsed})`
  );
  // ...
}
```

**Fixed:**
```javascript
output.push(
  `Found ${data.found} element(s) matching '${selector}' (showing first ${Math.min(data.found, limit)}):`
);
```

## Type Changes

Location: `src/types.ts`

Current `QueryElementsResult`:
```typescript
export interface QueryElementsResult {
  found: number;
  foundAfterDepthFilter: number;  // REMOVE
  filteredByDepth: number;        // REMOVE
  maxDepth: number;               // REMOVE
  elements: QueryElement[];
}
```

Fixed:
```typescript
export interface QueryElementsResult {
  found: number;
  elements: QueryElement[];
}
```

## Tool Description Update

Location: `src/index.ts` (both legacy and smart tool definitions)

**Current:**
```
'Find elements by CSS selector with DOM depth filtering. Returns tag, text, id, classes, visibility. Filters out deeply nested elements (default depth 3) to prevent returning entire page.'
```

**Fixed:**
```
'Find elements by CSS selector. Returns tag, text, id, classes, visibility. Shows child element counts for elements with children.'
```

Note: The `max_depth` parameter can be kept for future use (controlling how much child detail to show) or removed if not needed.

## Documentation Updates

### CLAUDE.md (lines ~108-120)

**Current:**
```markdown
### DOM Depth Filtering

The `query_elements` tool filters out deeply nested elements using JavaScript executed in the page:

function getDepth(el: Element): number {
  // ...depth from body
}
```

**Fixed:**
```markdown
### DOM Query Results

The `query_elements` tool returns all elements matching the selector along with child information:
- Elements are never filtered by their depth in the DOM
- Child counts (direct + total descendants) shown for elements with children
- Results limited by the `limit` parameter (default 20)
```

### README.md

Update the "DOM Depth Filtering" section similarly.
