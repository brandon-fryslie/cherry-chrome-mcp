# call_stack

Get the current call stack when execution is paused. This is the first tool
to call after execution pauses - it reveals WHERE code stopped, WHY it stopped,
and provides the `call_frame_id` values needed to inspect variables with `evaluate()`.

**See `references/debugger-guide.md` for debugging scenarios and strategies.**

## Prerequisites

Execution must be PAUSED (hit a breakpoint or called `execution(action="pause")`).

## Parameters

| Param | Required | Description |
|-------|----------|-------------|
| `connection_id` | no | Connection to use |

## Output

```
Call Stack:
================================================================================

[0] handleClick
    at http://localhost:3000/main.js:42:10
    callFrameId: {"ordinal":0,"injectedScriptId":1}

[1] addEventListener
    at http://localhost:3000/main.js:100:5
    callFrameId: {"ordinal":1,"injectedScriptId":1}

Use debugger_evaluate_on_call_frame(call_frame_id, expression) to inspect variables.
```

## Reading the Call Stack

- Frame `[0]` is where execution is currently paused
- Higher frames show what called the current function
- The `callFrameId` is the key to `evaluate()` - it targets a specific frame
- Each frame shows the function name, file, line, and column

## call_frame_id Lifecycle

1. **Obtain**: Each frame has a `callFrameId` string
2. **Use**: Pass to `evaluate(call_frame_id=..., expression=...)`
3. **Reuse**: Multiple evaluate calls allowed while still paused
4. **Invalidate**: All IDs become invalid after `step()` or `execution(action="resume")`
5. **Refresh**: Call `call_stack()` again after stepping to get new IDs

## Tips

- Always call `call_stack()` immediately after pausing - it's the foundation for everything else
- Inspect different frames to understand how execution arrived at the current point
- Frame `[0]` has locals; higher frames have caller variables and the broader context
- Use the URL and line number from the stack to set additional breakpoints in related code
