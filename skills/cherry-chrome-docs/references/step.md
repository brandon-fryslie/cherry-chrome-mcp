# step

Step through paused code line by line. Advances execution and returns to
PAUSED state, showing the new location, updated variables (with change markers),
and any new console output. This is how to watch code execute in slow motion.

**See `references/debugger-guide.md` for debugging scenarios and strategies.**

## Prerequisites

Execution must be PAUSED (hit a breakpoint or called `execution(action="pause")`).

## Parameters

| Param | Required | Description |
|-------|----------|-------------|
| `direction` | yes | `"over"` (next line), `"into"` (enter function), `"out"` (exit function) |
| `include_context` | no | Include location, variables, and console after step (default: true) |
| `connection_id` | no | Connection to use |

## Choosing Direction

- **over**: Execute the current line and pause at the next line. If the line contains a function call, execute the entire function without stopping inside it. **Use this by default.**
- **into**: If the current line contains a function call, pause at the first line inside that function. Use when a specific function is suspect and its internals need inspection.
- **out**: Execute the rest of the current function and pause at the caller. Use to escape a function entered with "into" or to skip to the return value.

## Output

With `include_context: true` (default):
```
Stepped over successfully.

Stepped to: main.js:43 (handleClick)

Local Variables:
  x = 42
  name = "hello" [CHANGED]
  items = [Array(3)]

New Console (since last step):
  [LOG] Item processed
```

`[CHANGED]` marks variables whose values differ from the previous step -
focus on these to understand what the last line did.

## Tips

- After stepping, previous `call_frame_id` values are stale - call `call_stack()` again before `evaluate()`
- Use "over" by default; only "into" when a specific function call is suspect
- Watch `[CHANGED]` markers to track exactly how state evolves
- Combine with `evaluate()` to compute derived values between steps
- `execution({ action: 'resume' })` skips ahead to the next breakpoint when stepping is no longer needed
