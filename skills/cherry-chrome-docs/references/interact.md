# interact

Interact with page elements. Consolidates 8 actions into one tool.

## Prerequisites

Connection via `connect()`.

## Parameters

| Param | Used By | Description |
|-------|---------|-------------|
| `action` | all (required) | One of: click, scroll, right-click, double-click, focus, blur, press-key, select-option |
| `selector` | most actions | CSS selector. Required for all except scroll and press-key |
| `index` | click, right-click, double-click, focus, blur, press-key, select-option | Which match (0 = first) |
| `include_context` | click | Include element state + DOM changes after click (default: true) |
| `direction` | scroll | `top`, `bottom`, `up`, `down` (default: down) |
| `pixels` | scroll | Pixels to scroll for up/down (default: 500) |
| `key` | press-key (required) | Key name or combo: `"Enter"`, `"Control+a"`, `"Shift+Tab"` |
| `option_text` | select-option | Option text, case-insensitive |
| `option_index` | select-option | Option index, 0-based |
| `option_value` | select-option | Option value attribute, exact match |
| `connection_id` | all | Connection to use |

## Action Details

**click** - Requires `selector`.
```
Clicked <button> at index 0: Submit Form

--- Element State ---
Tag: button
Visible: true
Disabled: false

--- DOM Changes ---
Changed:
  ~ input[0]: value "" -> "submitted"
```

**scroll** - Use `direction`+`pixels` OR `selector` to scroll into view.
```
Scrolled down 500px
Position: 500/2000 (25%)
```

**right-click** - Requires `selector`. Returns: `Right-clicked <div> at index 0: Menu Item`

**double-click** - Requires `selector`. Returns: `Double-clicked <span> at index 0: text`

**focus** - Requires `selector`. Returns: `Focused <input> at index 0`

**blur** - Requires `selector`. Returns: `Blurred <input> at index 0`

**press-key** - Requires `key`. Selector optional (uses focused element if omitted).
Returns: `Pressed key 'Enter' on <input>`

**select-option** - Requires `selector` + one of `option_text`, `option_index`, `option_value`.
Returns: `Selected option: United States`
