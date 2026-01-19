# Definition of Done: Page State Snapshots & Diffing

## Acceptance Criteria

### AC1: Types Defined
- [ ] `DOMSnapshot` type in `types.ts` with counts and keyElements
- [ ] `DOMDiff` type in `types.ts` with added/removed/changed
- [ ] `lastDOMSnapshot` field added to `Connection` interface

### AC2: Snapshot Capture
- [ ] `captureDOMSnapshot(page)` function in `context.ts`
- [ ] Captures element counts (total, buttons, inputs, links, forms, visible)
- [ ] Captures key interactive elements with their state

### AC3: Diff Computation
- [ ] `computeDOMDiff(before, after)` function in `context.ts`
- [ ] Detects added elements
- [ ] Detects removed elements
- [ ] Detects changed elements (text, visibility, disabled, value)
- [ ] Computes count differences

### AC4: Diff Formatting
- [ ] `formatDOMDiff(diff)` function in `context.ts`
- [ ] Shows "Added:", "Removed:", "Changed:" sections
- [ ] Limits output to 5 items per category
- [ ] Shows count summary line
- [ ] Returns "No DOM changes detected" when no changes

### AC5: Integration with Action Tools
- [ ] `clickElement` captures snapshot before action
- [ ] `fillElement` captures snapshot before action
- [ ] Diff included in action context output
- [ ] Snapshot stored in Connection for next action

### AC6: Build & Tests
- [ ] `npm run build` passes
- [ ] No TypeScript errors
- [ ] Existing tests still pass

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

1. Build: `npm run build`
2. Connect to a page with interactive elements
3. Click a button that shows a modal or toast
4. Verify diff output shows the new elements
