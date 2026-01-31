# navigate

Navigate to a URL and return a semantic page summary.

## Prerequisites

Connection via `connect()`.

## Parameters

| Param | Required | Description |
|-------|----------|-------------|
| `url` | yes | URL to navigate to |
| `connection_id` | no | Connection to use |

## Output

```
Navigated to https://example.com

Title: Dashboard

-- Focused --
input#search (text)

-- Buttons (7) --
<button>New</button>
<button>Save</button>
+5 more...

-- Inputs (3) --
#project-name (text): "My Project"
#search (text): ""

-- Landmarks --
header, nav (Library), main, aside (Inspector)

-- Alerts --
None

-- Modals --
None

-- Errors --
None
```

The page summary includes: focused element, buttons, inputs, toggles,
landmarks, tabs, alerts, modals, and form validation errors.
