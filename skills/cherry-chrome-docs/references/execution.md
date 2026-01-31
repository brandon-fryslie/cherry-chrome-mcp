# execution

Resume or pause JavaScript execution. Use `pause` to freeze running code
on demand (without a breakpoint). Use `resume` to continue after inspecting
paused state.

**See `references/debugger-guide.md` for debugging scenarios and strategies.**

## Prerequisites

- **resume**: Execution must be PAUSED
- **pause**: Debugger enabled via `enable_debug_tools()`, code must be RUNNING

## Parameters

| Param | Required | Description |
|-------|----------|-------------|
| `action` | yes | `"resume"` or `"pause"` |
| `include_context` | no | Include call stack and variables when pausing (default: true) |
| `connection_id` | no | Connection to use |

## Output

**resume:**
```
Execution resumed. Will pause at next breakpoint or debugger statement.
```

**pause** (with `include_context: true`):
```
Execution paused.

Paused at: main.js:42 (handleClick)
Reason: Breakpoint

Call Stack:
  [0] handleClick (main.js:42) <- current
  [1] addEventListener (main.js:100)

Local Variables:
  x = 42
  name = "hello"

Recent Console (last 3):
  [LOG] Starting process
```

## When to Use pause vs breakpoint

- **breakpoint**: Know the exact file and line to stop at. Precise and repeatable.
- **pause**: Don't know where to stop. Pause wherever code happens to be executing.
  Useful for long-running operations, infinite loops, or when the relevant code
  location is unknown.
