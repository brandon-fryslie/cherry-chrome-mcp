# Definition of Done: structure

**Sprint:** Add HTML and Structure Summary to query_elements
**Generated:** 2026-01-18

## Acceptance Criteria

### Functional Requirements

**HTML snippet:**
- [ ] Shows element's opening tag with all attributes
- [ ] Does NOT include children in output
- [ ] Truncated at 200 chars if needed
- [ ] Always present in output

**Structure skeleton:**
- [ ] CSS-like syntax showing child pattern
- [ ] Repeated elements shown as `element*N`
- [ ] Depth limited to 2 levels
- [ ] Length capped at ~100 chars

**Interactive list:**
- [ ] Lists interactive descendants (button, a, input, select, textarea, role=*)
- [ ] Uses shortest selector (id > data-testid > tag.class)
- [ ] Limited to 6 items with "+N more"
- [ ] Empty/omitted if no interactive children

### Code Changes

- [ ] `src/tools/dom.ts`: Add HTML, structure, interactive extraction
- [ ] `src/types.ts`: Add new fields to ElementInfo
- [ ] Output formatting updated with new fields
- [ ] Build passes: `npm run build`

### Documentation

- [ ] `CLAUDE.md` updated with new output format
- [ ] `README.md` updated with new output format

## Verification

### Manual Test Scenarios

1. **HTML extraction:**
   - Query: `query_elements({ selector: "form" })`
   - Verify: HTML line shows `<form ...>` with attributes, no children

2. **Structure skeleton:**
   - Query a form with repeated fields
   - Verify: Structure shows pattern like `.field*3 > label+input`

3. **Interactive list:**
   - Query a container with buttons/inputs
   - Verify: Interactive line lists them with selectors

4. **Complex page:**
   - Query `body` or a large container
   - Verify: Output is still readable, not overwhelming

## Output Format

```
[0] <tag#id>
    ID: #id
    Classes: class1, class2
    Text: truncated text...
    HTML: <tag id="id" class="class1 class2" attr="value">
    Structure: child-pattern > nested*N
    Interactive: #input1, button.submit, a.link
    Children: N direct, M total
    Visible: true
```

## Out of Scope

- Parameter to control structure depth
- Customizable interactive element criteria
- Full HTML with children
