# Implementation Context: depth-fix

**Sprint:** Remove DOM Depth Filtering
**Generated:** 2026-01-18

## Key Files

| File | Purpose | Changes Required |
|------|---------|------------------|
| `src/tools/dom.ts` | DOM interaction tools | Remove depth filtering, change limits |
| `src/index.ts` | Tool definitions | Update description, remove max_depth param |
| `src/types.ts` | TypeScript types | Simplify QueryElementsResult |
| `src/config.ts` | Constants | Remove MAX_DOM_DEPTH constants |
| `CLAUDE.md` | Project docs | Remove depth filtering docs |
| `README.md` | User docs | Remove depth filtering docs |

## Implementation Details

### 1. src/tools/dom.ts Changes

**Current (lines 45-46):**
```typescript
const limit = args.limit ?? 20;
let maxDepth = args.max_depth ?? MAX_DOM_DEPTH;
```

**Fixed:**
```typescript
let limit = args.limit ?? 5;
if (limit > 20) limit = 20;  // Hard cap at 20
// Remove maxDepth entirely
```

**Current script (lines 58-96):**
```javascript
const maxDepth = ${maxDepth};

function getDepth(el) { ... }

const elementsWithDepth = allElements.map(el => ({
  element: el,
  depth: getDepth(el)
}));
const filteredElements = elementsWithDepth.filter(item => item.depth <= maxDepth);
```

**Fixed script:**
```javascript
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

// No filtering - just get all and slice to limit
const allElements = Array.from(document.querySelectorAll('${escapedSelector}'));
const limit = ${limit};
const limitedElements = allElements.slice(0, limit);

return {
  found: allElements.length,
  elements: limitedElements.map((el, idx) => {
    // childInfo for ALL elements with children
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
      childInfo: childInfo,
      position: { ... },
      attributes: { ... }
    };
  })
};
```

**Current output formatting (lines 156-174):**
```typescript
const foundTotal = data.found;
const foundFiltered = data.foundAfterDepthFilter;
const filteredCount = data.filteredByDepth;

if (filteredCount > 0) {
  output.push(`Found ${foundTotal} element(s) matching '${selector}'`);
  output.push(`Filtered out ${filteredCount}...`);
} else {
  output.push(`Found ${foundTotal} element(s)...`);
}
```

**Fixed output formatting:**
```typescript
const total = data.found;
const shown = data.elements.length;
output.push(`Found ${total} element(s) matching '${selector}' (showing first ${shown}):`);

// Add hint if results were truncated
if (total > shown) {
  output.push(`[${total - shown} more element(s) not shown. Use a more specific selector to narrow results.]`);
}
```

### 2. src/types.ts Changes

**Current:**
```typescript
export interface QueryElementsResult {
  found: number;
  foundAfterDepthFilter: number;
  filteredByDepth: number;
  maxDepth: number;
  elements: QueryElement[];
}

export interface QueryElement {
  // ...
  depth: number;
  childInfo: { ... } | null;
}
```

**Fixed:**
```typescript
export interface QueryElementsResult {
  found: number;
  elements: QueryElement[];
}

export interface QueryElement {
  // ...
  // Remove 'depth' field
  childInfo: { ... } | null;
}
```

### 3. src/index.ts Changes

**Tool definition (both legacy and smart):**
- Description: `'Find elements by CSS selector. Returns tag, text, id, classes, visibility, child counts.'`
- limit parameter: `default: 5` (was 20)
- Remove `max_depth` parameter entirely

### 4. src/config.ts Changes

**Remove:**
```typescript
export const MAX_DOM_DEPTH = 3;
export const HARD_MAX_DOM_DEPTH = 10;
```

### 5. Documentation Changes

**CLAUDE.md - Remove or rewrite lines ~108-120** (DOM depth filtering section)

**README.md - Remove or rewrite** the "DOM Depth Filtering" section

## Files to NOT Change

- `src/browser.ts` - No changes
- `src/response.ts` - No changes (analyzeQueryElementsData might need minor update)
- `src/tools/debugger.ts` - No changes
- `src/tools/chrome.ts` - No changes
