# Selector Builder / inspect_element Feature

**Confidence:** HIGH
**Sprint:** 2026-01-19
**Estimated Scope:** Medium-Large

## Problem Statement

Agents guess at CSS selectors, often requiring multiple attempts:
1. Try `.login-btn` → 0 results
2. Try `.login-button` → 0 results
3. Try `#loginBtn` → found!

This wastes tool calls. The agent knows WHAT they're looking for ("the login button") but not the exact selector.

## Proposed Solution

New `inspect_element` tool that discovers selectors from descriptions:

```typescript
inspect_element({
  description: "the login button",      // Natural language hint
  text_contains: "Sign In",             // Content hint
  near: { selector: "#header" },        // Spatial hint
  attributes: {
    role: "button",
    data_testid: "login-*"              // Wildcard match
  }
})
```

Returns ranked selector candidates with stability scores.

## Design

### Tool Signature

```typescript
export async function inspectElement(args: {
  description?: string;           // "the login button"
  text_contains?: string;         // "Sign In"
  near?: {
    selector: string;
    direction?: 'above' | 'below' | 'left' | 'right' | 'inside';
  };
  attributes?: {
    role?: string;
    aria_label?: string;
    data_testid?: string;
    class_contains?: string;
    placeholder?: string;
    type?: string;
  };
  tag?: string;                   // Filter by tag (button, input, a)
  strict_stability?: boolean;     // Only return ID/data-testid
  limit?: number;                 // Max candidates (default: 3)
  connection_id?: string;
}): Promise<ToolResult>
```

### Discovery Strategies (Priority Order)

| Strategy | Stability | Example |
|----------|-----------|---------|
| ID | 95% | `#signin-button` |
| data-testid | 90% | `[data-testid="login"]` |
| aria-label | 85% | `[aria-label="Sign In"]` |
| role + aria-label | 85% | `[role="button"][aria-label="Sign In"]` |
| Unique class combo | 75% | `.btn.btn-primary` |
| Tag + class | 60% | `button.submit-btn` |
| Semantic (tag + text) | 55% | `button` containing "Sign In" |
| nth-child | 30% | `form > button:nth-child(2)` |

### Selector Generation Algorithm

```typescript
function generateBestSelector(el: Element): string {
  // 1. ID (most stable)
  if (el.id) return `#${el.id}`;

  // 2. data-testid
  const testId = el.getAttribute('data-testid');
  if (testId) return `[data-testid="${testId}"]`;

  // 3. aria-label
  const ariaLabel = el.getAttribute('aria-label');
  if (ariaLabel) return `[aria-label="${ariaLabel}"]`;

  // 4. Unique class combination
  const uniqueClasses = findUniqueClassCombo(el);
  if (uniqueClasses) return uniqueClasses;

  // 5. Tag + first class
  if (el.className) {
    const selector = `${el.tagName.toLowerCase()}.${firstClass}`;
    if (isUnique(selector)) return selector;
  }

  // 6. nth-child fallback
  return generateNthChildSelector(el);
}
```

### Text Matching

For `description` and `text_contains`:
1. Normalize: lowercase, trim whitespace
2. Extract keywords: split on spaces
3. Match elements where:
   - `textContent` contains ALL keywords
   - OR `aria-label` contains ANY keyword
   - OR `placeholder` contains ANY keyword

### Spatial Matching (near)

When `near.selector` provided:
1. Find the reference element
2. Calculate DOM distance (parent hops)
3. Filter candidates within 5 hops
4. Optionally filter by direction (above/below based on Y position)

### Output Format

```
Selector Candidates for "login button":

[1] RECOMMENDED (Stability: 95/100)
    Selector: #signin-button
    Strategy: ID (direct reference)
    Element: <button id="signin-button">Sign In</button>
    Visible: true

[2] ALTERNATIVE (Stability: 90/100)
    Selector: [data-testid="login-submit"]
    Strategy: Test attribute
    Element: <button data-testid="login-submit">Sign In</button>

[3] FALLBACK (Stability: 60/100)
    Selector: button.btn-primary
    Strategy: Tag + class
    Matches: 1 element
    ⚠️ Less stable than options above

Use the RECOMMENDED selector for best reliability.
```

## Implementation Plan

### Phase 1: Types & Foundation
1. Add types to `types.ts`: `SelectorCandidate`, `InspectElementResult`, `InspectElementArgs`
2. Create new file `src/tools/inspect.ts`

### Phase 2: Core Discovery Logic
3. Implement `inspectElement()` main function
4. Implement `discoverElements()` - finds matching elements
5. Implement `generateBestSelector()` - generates selector for element
6. Implement `rankSelectors()` - scores and sorts candidates

### Phase 3: Matching Strategies
7. Implement text matching (keywords, fuzzy)
8. Implement attribute matching (role, aria-label, data-testid)
9. Implement spatial matching (near selector, direction)
10. Implement tag filtering

### Phase 4: Output & Integration
11. Implement `formatInspectResult()` - formats output
12. Register tool in `index.ts`
13. Add tool definition with inputSchema

### Phase 5: Testing
14. Verify build passes
15. Manual testing with MCP Inspector

## Files to Create/Modify

| File | Change |
|------|--------|
| `src/types.ts` | Add `SelectorCandidate`, `InspectElementResult` types |
| `src/tools/inspect.ts` | NEW - Main implementation |
| `src/tools/index.ts` | Export inspect functions |
| `src/index.ts` | Register `inspect_element` tool |

## Success Criteria

1. Tool discovers elements by description with >80% success on typical pages
2. Stability scores correctly rank ID > data-testid > class > nth-child
3. Spatial queries work (near selector)
4. Attribute filtering works (role, aria-label, data-testid)
5. Output is concise and actionable
6. Build passes with no errors
7. Tool integrates cleanly with existing patterns

## Non-Goals

- XPath support (CSS only for now)
- Visual/screenshot-based discovery
- Machine learning-based matching
- Selector validation against live page

## Example Flows

**Flow 1: Description only**
```
Agent: inspect_element({ description: "login button" })
→ Returns: #signin-button (found by text content + tag)
```

**Flow 2: Attribute hint**
```
Agent: inspect_element({
  attributes: { data_testid: "login-*" }
})
→ Returns: [data-testid="login-submit"] (wildcard match)
```

**Flow 3: Near another element**
```
Agent: inspect_element({
  description: "submit button",
  near: { selector: ".error-message", direction: "below" }
})
→ Returns: button.retry-action (found spatially)
```

**Flow 4: Strict stability**
```
Agent: inspect_element({
  description: "login button",
  strict_stability: true
})
→ Returns only ID or data-testid selectors (or error if none found)
```
