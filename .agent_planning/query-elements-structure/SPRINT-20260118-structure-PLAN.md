# Sprint: structure - Add HTML and Structure Summary to query_elements

**Generated:** 2026-01-18
**Confidence:** HIGH
**Status:** READY FOR IMPLEMENTATION

## Sprint Goal

Enhance `query_elements` output with HTML snippets and structural summaries to help agents understand element content without verbose child enumeration.

## Scope

**Deliverables:**
1. Add element's own HTML (outer HTML without children) - always shown
2. Add CSS-like structure skeleton showing child pattern
3. Add interactive elements list (clickable/fillable descendants)
4. Update output formatting

## New Output Format

```
[0] <div#checkout>
    ID: #checkout
    Classes: checkout-container, active
    Text: (truncated text content)
    HTML: <div id="checkout" class="checkout-container active" data-step="payment">
    Structure: form > (.field*4 > label+input) + .actions > button*2
    Interactive: input#email, input#card, button.back, button.submit
    Children: 12 direct, 45 total
    Visible: true
```

## Work Items

### P0: Add HTML snippet (element's own outer HTML, no children)

**Changes:**
- Extract element's outer HTML
- Strip inner content (children), keep only the opening tag with attributes
- Truncate at 200 characters if needed
- Always include in output

**Implementation:**
```javascript
function getOpeningTag(el) {
  // Clone element, remove children, get outerHTML
  const clone = el.cloneNode(false);
  return clone.outerHTML.replace(/<\/[^>]+>$/, '').substring(0, 200);
}
```

**Acceptance Criteria:**
- [ ] HTML line shows element's opening tag with all attributes
- [ ] Children are NOT included in HTML output
- [ ] Truncated at 200 chars with "..." if needed
- [ ] Special characters properly escaped

### P1: Add CSS-like structure skeleton

**Changes:**
- Generate a compressed representation of child structure
- Use CSS selector-like syntax
- Show multiplicity with `*N` notation
- Limit depth to 2-3 levels

**Syntax:**
- `>` = direct child
- `+` = sibling
- `*N` = N occurrences of same pattern
- `.class` = class
- `#id` = id
- `tag` = tag name
- `()` = grouping for repeated patterns

**Examples:**
```
ul > li*5 > a                    # Simple list
form > (.field*3 > label+input) + button   # Form with repeated fields
div > header + main + footer     # Layout
nav > ul > li*8 > (a + span?)    # Nav with optional spans
```

**Implementation approach:**
1. Get direct children, group by tag+class signature
2. For repeated patterns, use `*N`
3. Recurse to depth 2
4. Join siblings with `+`

**Acceptance Criteria:**
- [ ] Structure line shows child pattern in CSS-like syntax
- [ ] Repeated siblings shown as `element*N`
- [ ] Depth limited to 2 levels
- [ ] Total length capped at 100 chars

### P2: Add interactive elements list

**Changes:**
- Find all interactive descendants (buttons, inputs, links, etc.)
- Return their selectors (shortest unique: id > data-testid > class)
- Limit to 6 items with "+N more" if exceeded

**Interactive elements:**
- `button`, `a`, `input`, `select`, `textarea`
- Elements with `role="button"`, `role="link"`, `role="checkbox"`, etc.
- Elements with `onclick`, `onsubmit`, etc. attributes

**Selector format:**
- If has id: `#id`
- Else if has data-testid: `[data-testid="..."]`
- Else: `tag.class` or just `tag`

**Acceptance Criteria:**
- [ ] Lists up to 6 interactive descendants
- [ ] Uses shortest useful selector for each
- [ ] Shows "+N more" if more than 6
- [ ] Empty if no interactive children

### P3: Update output formatting

**Changes:**
- Add HTML line after Classes
- Add Structure line after HTML
- Add Interactive line after Structure
- Rename current childInfo display to "Children: N direct, M total"

**Acceptance Criteria:**
- [ ] New fields appear in logical order
- [ ] Existing fields still present
- [ ] Output is readable and well-formatted

### P4: Update types

**File:** `src/types.ts`

**Changes:**
- Add to ElementInfo: `html`, `structure`, `interactive`

**Acceptance Criteria:**
- [ ] Types updated for new fields
- [ ] Build passes

### P5: Update documentation

**Files:** `CLAUDE.md`, `README.md`

**Changes:**
- Document new output fields
- Show example output
- Explain structure syntax

**Acceptance Criteria:**
- [ ] Documentation explains all new fields
- [ ] Examples show realistic output

## Output Example

For a login form:

```
[0] <form#login-form>
    ID: #login-form
    Classes: auth-form, card
    Text: Log in to your account...
    HTML: <form id="login-form" class="auth-form card" action="/login" method="POST">
    Structure: .form-group*2 > (label + input) + .actions > (button + a)
    Interactive: input#email, input#password, button[type=submit], a.forgot-link
    Children: 3 direct, 11 total
    Visible: true
```

## Dependencies

- None

## Risks

| Risk | Mitigation |
|------|------------|
| Structure generation complex | Start simple, iterate |
| Performance with deep DOMs | Limit recursion depth, cache |
| Output too verbose | Keep total ~400 chars per element |
