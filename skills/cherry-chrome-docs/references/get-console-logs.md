# get_console_logs

Read browser console messages with pattern compression and freshness tracking.

## Prerequisites

Connection via `connect()`.

## Parameters

| Param | Required | Description |
|-------|----------|-------------|
| `limit` | no | Max messages to return (default: 3) |
| `filter_level` | no | `"all"`, `"error"`, `"warning"`, `"info"`, `"debug"`, `"log"` (default: all) |
| `expand_errors` | no | Include full stack traces for errors (default: false) |
| `connection_id` | no | Connection to use |

## Output

```
--- PAGE STATE ---
[PAGE RELOADED since your last query]
Navigation epoch: 3
Last navigation: 45s ago

--- CONSOLE MESSAGES ---
Showing 3 of 15 (filter: all):

[Pattern compression: 15 -> 5 lines (67% reduction)]

[10:30:45.123] [LOG] Error: timeout <n>ms x5
    Variations: 123, 456, 789, 234 +1 more
```

Pattern compression automatically groups repetitive messages. Similarity
matching normalizes numbers, UUIDs, hex values, and timestamps.

With `expand_errors: true`, error entries include full stack traces with
file:line locations.
