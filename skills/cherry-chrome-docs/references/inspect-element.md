# inspect_element

Discover CSS selectors from natural language descriptions and attributes.
Use when the selector for an element is unknown.

## Prerequisites

Connection via `connect()`.

## Parameters

| Param | Required | Description |
|-------|----------|-------------|
| `description` | no | Natural language description (e.g., "login button") |
| `text_contains` | no | Exact text substring match |
| `tag` | no | HTML tag filter (button, input, a, etc.) |
| `attributes` | no | Object with: `role`, `aria_label`, `data_testid`, `placeholder`, `type` |
| `near` | no | Spatial search: `{ selector, direction? }` where direction is above/below/left/right/inside |
| `strict_stability` | no | Only return high-stability selectors (ID, data-testid) |
| `limit` | no | Max candidates (default: 3) |
| `connection_id` | no | Connection to use |

## Output

```
Selector Candidates for: "login button" | tag: button

[1] RECOMMENDED (Stability: 95/100)
    Selector: #login-btn
    Strategy: ID
    Element: <button id="login-btn" class="btn primary">
    Text: Log In
    Visible: true

[2] ALTERNATIVE (Stability: 75/100)
    Selector: .btn.primary
    Strategy: unique class
    Matches: 2 elements

[3] FALLBACK (Stability: 30/100)
    Selector: body > div:nth-child(3)
    Strategy: nth-child

Use the RECOMMENDED selector for best reliability.
```

Stability scoring: ID (95) > data-testid (90) > aria-label (85) > unique class (75) > nth-child (30).
