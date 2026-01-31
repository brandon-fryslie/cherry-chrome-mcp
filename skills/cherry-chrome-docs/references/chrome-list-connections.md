# chrome_list_connections

List all active Chrome connections with status.

## Prerequisites

At least one connection via `connect()`.

## Parameters

None.

## Output

```
Active connections:
  * default - https://example.com (active, debugger: enabled, paused: yes)
    session2 - https://other.com (debugger: disabled)
```

`*` marks the active connection. Shows URL, debugger state, and pause state.
