# enable_debug_tools

Enable the JavaScript debugger via CDP. This is the gateway to the most
powerful diagnostic capability available: freezing execution at any point
to inspect all variables, the full call stack, and closure state.

**See `references/debugger-guide.md` for when to use the debugger and
step-by-step scenarios.**

## Prerequisites

Connection via `connect()`.

## Parameters

| Param | Required | Description |
|-------|----------|-------------|
| `connection_id` | no | Connection to use |

## Output

```
Debug tools enabled successfully

You can now:
- Set breakpoints with breakpoint(action="set", ...)
- Pause execution with execution(action="pause")
- Configure exception breaking with pause_on_exceptions(...)
```

## What This Unlocks

After enabling, the full debugger workflow becomes available:

```
enable_debug_tools()
  → breakpoint()           -- arm breakpoints at specific lines
  → pause_on_exceptions()  -- catch errors at the throw site
  → execution(pause)       -- freeze running code on demand
  → call_stack()           -- see where and why code paused
  → evaluate()             -- inspect any variable or expression
  → step()                 -- advance line by line
```
