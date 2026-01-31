# get_page_text

Extract text content from elements. Use `from_end: true` to get most recent
entries (useful for chat UIs, logs, feeds).

## Prerequisites

Connection via `connect()`.

## Parameters

| Param | Required | Description |
|-------|----------|-------------|
| `selector` | no | CSS selector (default: body) |
| `limit` | no | Max elements (default: 10, max: 50) |
| `max_length` | no | Max text per element (default: 1000) |
| `from_end` | no | Get last N matches instead of first N (default: false) |
| `connection_id` | no | Connection to use |

## Output

```
Found 15 element(s), showing first 10:

--- [0] #message-1 ---
Hello, how are you today?

--- [1] #message-2 ---
I'm doing great, thanks for asking!
```

With `from_end: true`:
```
Found 15 element(s), showing last 3:

--- [13] .message ---
Thanks!

--- [14] .message ---
You're welcome!
```
