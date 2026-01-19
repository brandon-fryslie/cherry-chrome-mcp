# Definition of Done: Page State Snapshots & Diffing

## Acceptance Criteria

### AC1: Types Defined
- [x] `DOMSnapshot` type in `types.ts` with counts and keyElements
- [x] `DOMDiff` type in `types.ts` with added/removed/changed
- [x] `lastDOMSnapshot` field added to `Connection` interface

### AC2: Snapshot Capture
- [x] `captureDOMSnapshot(page)` function in `context.ts`
- [x] Captures element counts (total, buttons, inputs, links, forms, visible)
- [x] Captures key interactive elements with their state

### AC3: Diff Computation
- [x] `computeDOMDiff(before, after)` function in `context.ts`
- [x] Detects added elements
- [x] Detects removed elements
- [x] Detects changed elements (text, visibility, disabled, value)
- [x] Computes count differences

### AC4: Diff Formatting
- [x] `formatDOMDiff(diff)` function in `context.ts`
- [x] Shows "Added:", "Removed:", "Changed:" sections
- [x] Limits output to 5 items per category
- [x] Shows count summary line
- [x] Returns "No DOM changes detected" when no changes

### AC5: Integration with Action Tools
- [x] `clickElement` captures snapshot before action
- [x] `fillElement` captures snapshot before action
- [x] Diff included in action context output
- [x] Snapshot stored in Connection for next action

### AC6: Build & Tests
- [x] `npm run build` passes
- [x] No TypeScript errors
- [x] Existing tests still pass

## Example Output

```
Clicked <button> at index 0: Submit

--- Element State ---
Tag: button
Visible: true
Disabled: true (was false)

--- DOM Changes ---
Added:
  + .success-toast
  + .confirmation-modal
Removed:
  - .loading-spinner
Changed:
  ~ button[0]: disabled false → true
  ~ #status: text "Pending" → "Complete"

Counts: buttons: +0, visible: +1
```

## Verification

1. Build: `npm run build` ✓
2. Connect to a page with interactive elements
3. Click a button that shows a modal or toast
4. Verify diff output shows the new elements

## Implementation Notes

- Snapshot captures interactive elements only (buttons, inputs, modals, etc.)
- Diff limited to 5 items per category to prevent overwhelming output
- Navigation epoch tracked to correlate snapshots with page state
- Snapshot stored in Connection.lastDOMSnapshot for cross-action comparison
- All functions exported from context.ts for use by action tools
