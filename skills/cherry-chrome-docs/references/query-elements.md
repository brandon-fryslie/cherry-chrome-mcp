# query_elements

Find DOM elements by CSS selector with optional text and visibility filters.

## Prerequisites

Connection via `connect()`.

## Parameters

| Param | Required | Description |
|-------|----------|-------------|
| `selector` | yes | CSS selector |
| `limit` | no | Max elements to return (default: 5, max: 20) |
| `text_contains` | no | Case-insensitive text filter |
| `include_hidden` | no | Include hidden elements (default: false) |
| `connection_id` | no | Connection to use |

## Filter Order

1. CSS selector match
2. Visibility filter (unless `include_hidden: true`)
3. Text filter (if `text_contains` provided)
4. Limit applied

## Output

```
Found 50 element(s) matching 'button'
  Visibility filter: 10 hidden element(s) excluded
  Text filter "Submit": 35 element(s) excluded
Showing first 5 of 5 remaining:

[0] <button>
    ID: #submit-btn
    Classes: btn, primary
    Text: Submit Form
    HTML: <button id="submit-btn" class="btn primary" type="submit">
    Structure: span + .icon
    Interactive: span.label, .icon
    Attributes: {"type":"submit"}
    Visible: true
    Children: 2 direct, 3 total
```

**No results** returns suggestions: similar selectors and page structure summary.

**Result too large** (>5000 chars) returns narrowing suggestions instead of truncating.

## Element Fields

- **HTML**: Opening tag with all attributes (no children), truncated at 200 chars
- **Structure**: CSS-like child skeleton (e.g., `ul > li*5 > a`), depth-limited to 2 levels
- **Interactive**: Clickable/input descendants with selectors (up to 6, then "+N more")
- **Children**: `N direct, M total` descendant counts
