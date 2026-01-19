# Page State Snapshots & Diffing

**Confidence:** HIGH
**Sprint:** 2026-01-18
**Estimated Scope:** Medium

## Problem Statement

Agents struggle to understand what changed after an action (click, fill, navigate). Currently:
- Actions return "Clicked <button>" with optional element state
- No information about DOM mutations
- No visibility into new/removed elements
- Agent must manually query to discover changes

## Proposed Solution

Automatic before/after state comparison for all actions:

```
Clicked <button> at index 0: Submit

--- DOM Changes ---
Added:
  - .success-toast (1 element)
  - .confirmation-modal (1 element)
Removed:
  - .loading-spinner (1 element)
Changed:
  - #status: text "Pending" → "Complete"
  - .submit-btn: disabled → true

Element counts: +2 added, -1 removed
```

## Design

### Phase 1: DOM Snapshot Capture

**New Type:** `DOMSnapshot`

```typescript
// src/types.ts
interface DOMSnapshot {
  timestamp: number;
  navigationEpoch: number;
  counts: {
    total: number;
    buttons: number;
    inputs: number;
    links: number;
    forms: number;
    visible: number;
  };
  // Key elements by stable selectors
  keyElements: Map<string, ElementSnapshot>;
}

interface ElementSnapshot {
  tag: string;
  text: string;
  visible: boolean;
  disabled?: boolean;
  value?: string;
  classes: string[];
}
```

**Store in Connection:** Add `lastDOMSnapshot?: DOMSnapshot` to Connection interface

### Phase 2: Snapshot Capture Function

**Location:** `src/tools/context.ts`

```typescript
export async function captureDOMSnapshot(page: Page): Promise<DOMSnapshot> {
  const script = `
    (() => {
      const snapshot = {
        timestamp: Date.now(),
        counts: {
          total: document.querySelectorAll('*').length,
          buttons: document.querySelectorAll('button, [role="button"]').length,
          inputs: document.querySelectorAll('input, textarea, select').length,
          links: document.querySelectorAll('a[href]').length,
          forms: document.querySelectorAll('form').length,
          visible: Array.from(document.querySelectorAll('*'))
            .filter(el => el.offsetParent !== null).length,
        },
        keyElements: {}
      };

      // Capture key interactive elements
      const interactiveSelectors = [
        'button', 'input', 'select', 'textarea',
        '[role="button"]', '[role="dialog"]',
        '.modal', '.toast', '.alert', '.spinner', '.loading'
      ];

      interactiveSelectors.forEach(sel => {
        document.querySelectorAll(sel).forEach((el, i) => {
          const key = sel + '[' + i + ']';
          snapshot.keyElements[key] = {
            tag: el.tagName.toLowerCase(),
            text: el.textContent?.trim().substring(0, 50) || '',
            visible: el.offsetParent !== null,
            disabled: el.disabled,
            value: el.value?.substring(0, 50),
            classes: Array.from(el.classList)
          };
        });
      });

      return snapshot;
    })()
  `;

  return await page.evaluate(script) as DOMSnapshot;
}
```

### Phase 3: Diff Computation

```typescript
export function computeDOMDiff(
  before: DOMSnapshot,
  after: DOMSnapshot
): DOMDiff {
  const diff: DOMDiff = {
    hasChanges: false,
    countChanges: {},
    added: [],
    removed: [],
    changed: []
  };

  // Compare counts
  for (const key of Object.keys(after.counts)) {
    const beforeVal = before.counts[key] || 0;
    const afterVal = after.counts[key] || 0;
    if (beforeVal !== afterVal) {
      diff.hasChanges = true;
      diff.countChanges[key] = { before: beforeVal, after: afterVal };
    }
  }

  // Compare key elements
  const beforeKeys = new Set(Object.keys(before.keyElements));
  const afterKeys = new Set(Object.keys(after.keyElements));

  // Added elements
  for (const key of afterKeys) {
    if (!beforeKeys.has(key)) {
      diff.hasChanges = true;
      diff.added.push({ selector: key, element: after.keyElements[key] });
    }
  }

  // Removed elements
  for (const key of beforeKeys) {
    if (!afterKeys.has(key)) {
      diff.hasChanges = true;
      diff.removed.push({ selector: key, element: before.keyElements[key] });
    }
  }

  // Changed elements
  for (const key of beforeKeys) {
    if (afterKeys.has(key)) {
      const b = before.keyElements[key];
      const a = after.keyElements[key];
      const changes: string[] = [];

      if (b.text !== a.text) changes.push(`text "${b.text}" → "${a.text}"`);
      if (b.visible !== a.visible) changes.push(`visible ${b.visible} → ${a.visible}`);
      if (b.disabled !== a.disabled) changes.push(`disabled ${b.disabled} → ${a.disabled}`);
      if (b.value !== a.value) changes.push(`value "${b.value}" → "${a.value}"`);

      if (changes.length > 0) {
        diff.hasChanges = true;
        diff.changed.push({ selector: key, changes });
      }
    }
  }

  return diff;
}
```

### Phase 4: Format Diff Output

```typescript
export function formatDOMDiff(diff: DOMDiff): string {
  if (!diff.hasChanges) {
    return '--- No DOM changes detected ---';
  }

  const lines: string[] = ['--- DOM Changes ---'];

  if (diff.added.length > 0) {
    lines.push('Added:');
    for (const item of diff.added.slice(0, 5)) {
      lines.push(`  + ${item.selector}`);
    }
  }

  if (diff.removed.length > 0) {
    lines.push('Removed:');
    for (const item of diff.removed.slice(0, 5)) {
      lines.push(`  - ${item.selector}`);
    }
  }

  if (diff.changed.length > 0) {
    lines.push('Changed:');
    for (const item of diff.changed.slice(0, 5)) {
      lines.push(`  ~ ${item.selector}: ${item.changes.join(', ')}`);
    }
  }

  // Summary
  const countSummary: string[] = [];
  for (const [key, val] of Object.entries(diff.countChanges)) {
    const delta = val.after - val.before;
    countSummary.push(`${key}: ${delta > 0 ? '+' : ''}${delta}`);
  }
  if (countSummary.length > 0) {
    lines.push('');
    lines.push(`Counts: ${countSummary.join(', ')}`);
  }

  return lines.join('\n');
}
```

## Integration Points

### Option A: Automatic for All Actions (Recommended)

Modify `gatherActionContext()` to always capture and diff:

```typescript
// In gatherActionContext()
export async function gatherActionContext(
  page: Page,
  selector: string,
  action: string,
  connection?: Connection,
  beforeSnapshot?: DOMSnapshot
): Promise<string> {
  const output: string[] = [];

  // Existing element state gathering...
  output.push(await gatherElementState(page, selector, action));

  // Add DOM diff if we have a before snapshot
  if (beforeSnapshot) {
    const afterSnapshot = await captureDOMSnapshot(page);
    const diff = computeDOMDiff(beforeSnapshot, afterSnapshot);
    output.push(formatDOMDiff(diff));

    // Store for next action
    if (connection) {
      connection.lastDOMSnapshot = afterSnapshot;
    }
  }

  return output.join('\n\n');
}
```

### Option B: Optional Parameter

Add `include_dom_diff?: boolean` to action tools:

```typescript
export async function clickElement(args: {
  selector: string;
  index?: number;
  include_context?: boolean;
  include_dom_diff?: boolean;  // NEW
  connection_id?: string;
})
```

## Files to Modify

| File | Change |
|------|--------|
| `src/types.ts` | Add `DOMSnapshot`, `DOMDiff` types; add `lastDOMSnapshot` to Connection |
| `src/tools/context.ts` | Add snapshot, diff, and format functions |
| `src/tools/dom.ts` | Capture snapshot before action, pass to context gatherer |
| `src/browser.ts` | Initialize `lastDOMSnapshot` in Connection |

## Success Criteria

1. DOM snapshot captured before each action (click, fill)
2. Diff computed and formatted after action completes
3. Diff shows added/removed/changed elements
4. Diff shows count changes (buttons, inputs, etc.)
5. Output is concise (max 10 items per category)
6. No performance regression for simple actions
7. Build passes with no errors

## Non-Goals

- Full DOM tree diffing (too verbose)
- CSS style change detection
- Network request tracking (future feature)
- Mutation observer (real-time tracking)

## Performance Considerations

- Snapshot capture adds ~50-100ms per action
- Only capture interactive elements, not full DOM
- Limit diff output to top 5 items per category
- Store only one snapshot (not history)
