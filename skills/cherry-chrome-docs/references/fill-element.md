# fill_element

Type text into an input, textarea, or select element.

## Prerequisites

Connection via `connect()`. Use `query_elements()` first to verify the input exists.

## Parameters

| Param | Required | Description |
|-------|----------|-------------|
| `selector` | yes | CSS selector for the input |
| `text` | yes | Text to enter |
| `index` | no | Which match (0 = first) |
| `submit` | no | Press Enter after filling (default: false) |
| `include_context` | no | Include element state after fill (default: true) |
| `connection_id` | no | Connection to use |

## Output

```
Filled <input> at index 0 (text) and submitted

--- Element State ---
Tag: input
Visible: true
Value: hello world

--- DOM Changes ---
Changed:
  ~ input[0]: value "" -> "hello world"
```
