# Implementation Context: filters

**Sprint:** Add text_contains and include_hidden Parameters
**Generated:** 2026-01-18

## Key Files

| File | Purpose | Changes Required |
|------|---------|------------------|
| `src/tools/dom.ts` | DOM tools | Add filter logic to queryElements |
| `src/index.ts` | Tool definitions | Add parameters to schema |
| `CLAUDE.md` | Project docs | Document new parameters |
| `README.md` | User docs | Document new parameters |

## Implementation Details

### 1. src/tools/dom.ts Changes

**Current function signature (line ~50):**
```typescript
export async function queryElements(args: {
  selector: string;
  limit?: number;
  connection_id?: string;
}): Promise<...>
```

**New function signature:**
```typescript
export async function queryElements(args: {
  selector: string;
  limit?: number;
  text_contains?: string;
  include_hidden?: boolean;
  connection_id?: string;
}): Promise<...>
```

**New script logic (replace current script):**

```javascript
(() => {
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

  function isVisible(el) {
    // Check offsetParent (null for hidden elements, except body/html)
    if (el.offsetParent === null && el.tagName !== 'BODY' && el.tagName !== 'HTML') {
      // Could still be visible if it's fixed/sticky positioned
      const style = getComputedStyle(el);
      if (style.position !== 'fixed' && style.position !== 'sticky') {
        return false;
      }
    }

    const style = getComputedStyle(el);
    if (style.display === 'none') return false;
    if (style.visibility === 'hidden') return false;

    // Check for zero dimensions
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) return false;

    return true;
  }

  // Get all matching elements
  let elements = Array.from(document.querySelectorAll('${escapedSelector}'));
  const totalMatched = elements.length;

  // Apply visibility filter (unless include_hidden is true)
  const includeHidden = ${args.include_hidden ?? false};
  let hiddenCount = 0;
  if (!includeHidden) {
    const beforeFilter = elements.length;
    elements = elements.filter(el => isVisible(el));
    hiddenCount = beforeFilter - elements.length;
  }

  // Apply text filter
  const textContains = ${args.text_contains ? `'${escapeForJs(args.text_contains)}'` : 'null'};
  let textFilteredCount = 0;
  if (textContains) {
    const beforeFilter = elements.length;
    const searchLower = textContains.toLowerCase();
    elements = elements.filter(el => {
      const text = el.textContent || '';
      return text.toLowerCase().includes(searchLower);
    });
    textFilteredCount = beforeFilter - elements.length;
  }

  // Apply limit
  const limit = ${limit};
  const limitedElements = elements.slice(0, limit);

  return {
    found: totalMatched,
    afterVisibilityFilter: includeHidden ? totalMatched : totalMatched - hiddenCount,
    afterTextFilter: elements.length,
    hiddenFiltered: hiddenCount,
    textFiltered: textFilteredCount,
    elements: limitedElements.map((el, idx) => {
      // ... existing element mapping code
    })
  };
})()
```

**Updated output formatting:**

```typescript
// Build output header with filter info
const output: string[] = [];
const total = data.found;
const afterVisibility = data.afterVisibilityFilter;
const afterText = data.afterTextFilter;
const shown = data.elements.length;

if (data.hiddenFiltered > 0 || data.textFiltered > 0) {
  output.push(`Found ${total} element(s) matching '${selector}'`);
  if (data.hiddenFiltered > 0) {
    output.push(`  Visibility filter: ${data.hiddenFiltered} hidden element(s) excluded`);
  }
  if (data.textFiltered > 0) {
    output.push(`  Text filter "${args.text_contains}": ${data.textFiltered} element(s) excluded`);
  }
  output.push(`Showing first ${shown} of ${afterText} remaining:`);
} else {
  output.push(`Found ${total} element(s) matching '${selector}' (showing first ${shown}):`);
}
```

### 2. src/index.ts Changes

**Add to query_elements parameters (both legacy and smart tool definitions):**

```typescript
text_contains: {
  type: 'string',
  description: 'Filter to elements containing this text (case-insensitive partial match)',
},
include_hidden: {
  type: 'boolean',
  default: false,
  description: 'Include hidden elements (display:none, visibility:hidden, zero size). Default: false (visible only)',
},
```

### 3. Types Update (if needed)

**src/types.ts - Update QueryElementsResult:**

```typescript
export interface QueryElementsResult {
  found: number;
  afterVisibilityFilter: number;
  afterTextFilter: number;
  hiddenFiltered: number;
  textFiltered: number;
  elements: ElementInfo[];
}
```

### 4. Documentation

**CLAUDE.md - Add to Query Elements section:**

```markdown
### Query Elements Filters

Filter results by text content or visibility:

\`\`\`typescript
// Find only buttons containing "Submit"
query_elements({ selector: "button", text_contains: "Submit" })

// Include hidden elements (normally excluded)
query_elements({ selector: "div", include_hidden: true })

// Combined: visible buttons with specific text
query_elements({ selector: "button", text_contains: "Login", include_hidden: false })
\`\`\`

**Parameters:**
- `text_contains`: Case-insensitive partial text match
- `include_hidden`: Include hidden elements (default: false)
```

## Edge Cases to Handle

1. **Fixed/sticky positioned elements**: These have `offsetParent === null` but are visible
2. **Elements inside hidden parents**: `getComputedStyle` handles this
3. **Empty text content**: `text_contains` should not match empty strings
4. **Special characters in text_contains**: Escape properly for JavaScript string
