# Definition of Done: Selector Builder (inspect_element)

## Acceptance Criteria

### AC1: Types Defined
- [ ] `SelectorCandidate` type with selector, stability score, strategy, count
- [ ] `InspectElementResult` type with candidates array and element details
- [ ] `InspectElementArgs` type for function parameters

### AC2: Core Discovery Function
- [ ] `inspectElement(args)` function in `src/tools/inspect.ts`
- [ ] Returns ranked selector candidates (default limit: 3)
- [ ] Uses `browserManager.getPageOrThrow()` for connection validation
- [ ] Handles errors gracefully with `errorResponse()`

### AC3: Selector Generation
- [ ] `generateBestSelector(element)` function
- [ ] Prioritizes: ID > data-testid > aria-label > unique class > tag.class > nth-child
- [ ] Returns most stable selector available for element
- [ ] Stability score reflects selector type

### AC4: Element Discovery
- [ ] `discoverElements()` finds elements matching criteria
- [ ] Supports `description` - keyword matching against text content
- [ ] Supports `text_contains` - exact substring match
- [ ] Supports `tag` filter (button, input, a, etc.)

### AC5: Attribute Matching
- [ ] Supports `attributes.role` filter
- [ ] Supports `attributes.aria_label` filter
- [ ] Supports `attributes.data_testid` filter (with wildcard *)
- [ ] Supports `attributes.placeholder` filter
- [ ] Supports `attributes.type` filter

### AC6: Spatial Matching (Optional Enhancement)
- [ ] Supports `near.selector` - find elements near reference
- [ ] Supports `near.direction` - filter by relative position
- [ ] Falls back gracefully if reference element not found

### AC7: Output Formatting
- [ ] `formatInspectResult()` produces clear, ranked output
- [ ] Shows stability score for each candidate
- [ ] Shows strategy used (ID, data-testid, class, etc.)
- [ ] Shows element details (tag, text, visible)
- [ ] Recommends highest-stability selector

### AC8: Tool Registration
- [ ] Tool registered in `src/index.ts`
- [ ] Tool definition includes clear description
- [ ] Input schema defines all parameters with descriptions

### AC9: Build & Tests
- [ ] `npm run build` passes
- [ ] No TypeScript errors
- [ ] Existing tests still pass

## Example Output

```
Selector Candidates for "login button":

[1] RECOMMENDED (Stability: 95/100)
    Selector: #signin-button
    Strategy: ID (direct reference)
    Element: <button>Sign In</button>
    Visible: true

[2] ALTERNATIVE (Stability: 90/100)
    Selector: [data-testid="login-submit"]
    Strategy: Test attribute

[3] FALLBACK (Stability: 60/100)
    Selector: button.btn-primary
    Strategy: Tag + class
    ⚠️ Less stable

Use the RECOMMENDED selector for best reliability.
```

## Verification

1. Build: `npm run build`
2. Connect to a test page with MCP Inspector
3. Run: `inspect_element({ description: "login" })`
4. Verify candidates returned with stability scores
5. Test attribute filters
6. Test spatial matching (if implemented)

## Scope Notes

- AC6 (Spatial Matching) is optional for initial release
- XPath support is out of scope
- Visual/screenshot-based discovery is out of scope
