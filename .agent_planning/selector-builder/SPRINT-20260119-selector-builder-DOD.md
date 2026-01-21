# Definition of Done: Selector Builder (inspect_element)

## Acceptance Criteria

### AC1: Types Defined ✅
- [x] `SelectorCandidate` type with selector, stability score, strategy, count
- [x] `InspectElementResult` type with candidates array and element details
- [x] `InspectElementArgs` type for function parameters

### AC2: Core Discovery Function ✅
- [x] `inspectElement(args)` function in `src/tools/inspect.ts`
- [x] Returns ranked selector candidates (default limit: 3)
- [x] Uses `browserManager.getPageOrThrow()` for connection validation
- [x] Handles errors gracefully with `errorResponse()`

### AC3: Selector Generation ✅
- [x] `generateBestSelector(element)` function
- [x] Prioritizes: ID > data-testid > aria-label > unique class > tag.class > nth-child
- [x] Returns most stable selector available for element
- [x] Stability score reflects selector type

### AC4: Element Discovery ✅
- [x] `discoverElements()` finds elements matching criteria
- [x] Supports `description` - keyword matching against text content
- [x] Supports `text_contains` - exact substring match
- [x] Supports `tag` filter (button, input, a, etc.)

### AC5: Attribute Matching ✅
- [x] Supports `attributes.role` filter
- [x] Supports `attributes.aria_label` filter
- [x] Supports `attributes.data_testid` filter (with wildcard *)
- [x] Supports `attributes.placeholder` filter
- [x] Supports `attributes.type` filter

### AC6: Spatial Matching (Optional Enhancement) ✅
- [x] Supports `near.selector` - find elements near reference
- [x] Supports `near.direction` - filter by relative position
- [x] Falls back gracefully if reference element not found

### AC7: Output Formatting ✅
- [x] `formatInspectResult()` produces clear, ranked output
- [x] Shows stability score for each candidate
- [x] Shows strategy used (ID, data-testid, class, etc.)
- [x] Shows element details (tag, text, visible)
- [x] Recommends highest-stability selector

### AC8: Tool Registration ✅
- [x] Tool registered in `src/index.ts`
- [x] Tool definition includes clear description
- [x] Input schema defines all parameters with descriptions

### AC9: Build & Tests ✅
- [x] `npm run build` passes
- [x] No TypeScript errors
- [x] Existing tests still pass

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

1. Build: `npm run build` ✅
2. Connect to a test page with MCP Inspector
3. Run: `inspect_element({ description: "login" })`
4. Verify candidates returned with stability scores
5. Test attribute filters
6. Test spatial matching (if implemented)

## Scope Notes

- AC6 (Spatial Matching) is optional for initial release - IMPLEMENTED ✅
- XPath support is out of scope
- Visual/screenshot-based discovery is out of scope

## Completion Notes

All 9 acceptance criteria have been completed successfully:
- Types defined in `src/types.ts`
- Core implementation in `src/tools/inspect.ts`
- Tool registered in both legacy and smart modes
- Build passes with no errors
- Spatial matching implemented (AC6 bonus feature)

Commit: feat(selector): implement inspect_element tool
