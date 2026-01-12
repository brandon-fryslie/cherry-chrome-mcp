# CDP Debugger Implementation Status

## Current Status: ✅ FULLY IMPLEMENTED

The debugger tools are now **fully functional** with real Chrome DevTools Protocol (CDP) integration via WebSocket.

## What's Implemented

### ✅ CDP Client (Complete)
- Direct WebSocket connection to Chrome DevTools Protocol
- Bidirectional message handling (commands and events)
- Event listening for `Debugger.paused` and `Debugger.resumed`
- Proper async/await patterns with timeouts

### ✅ All Debugger Tools (Complete)
All debugger tools now use real CDP commands:

<note>
: we would like to condense these somewhat without reducing functionality.
maybe ~4 tools max, 
- one for breakpoints + pause on exception
- one for stepover/in/out/pause/resume
- one for getting call stack? and other misc stuff?
- calling any functioon enables the debugger automatically?
- </note>

1. **`debugger_enable()`** - Enables the CDP Debugger domain
2. **`debugger_set_breakpoint(url, line_number, column_number, condition)`** - Sets breakpoints via `Debugger.setBreakpointByUrl`
3. **`debugger_get_call_stack()`** - Displays call stack from `Debugger.paused` event
4. **`debugger_evaluate_on_call_frame(call_frame_id, expression)`** - Evaluates expressions via `Debugger.evaluateOnCallFrame`
5. **`debugger_step_over()`** - Steps over using `Debugger.stepOver`
6. **`debugger_step_into()`** - Steps into using `Debugger.stepInto`
7. **`debugger_step_out()`** - Steps out using `Debugger.stepOut`
8. **`debugger_resume()`** - Resumes execution using `Debugger.resume`
9. **`debugger_pause()`** - Pauses execution using `Debugger.pause`
10. **`debugger_remove_breakpoint(breakpoint_id)`** - Removes breakpoints via `Debugger.removeBreakpoint`
11. **`debugger_set_pause_on_exceptions(state)`** - Configures exception pausing via `Debugger.setPauseOnExceptions`

### Implementation Details
- **CDPClient class**: Manages WebSocket connection to Chrome
- **Event handling**: Automatically captures `Debugger.paused` events with call stack data
- **State tracking**: Stores paused state and breakpoint IDs
- **Error handling**: Proper error messages and CDP error reporting
- **Line number conversion**: Handles 0-indexed (CDP) vs 1-indexed (user) line numbers

## Implementation Approach

We would like to wrap the chrome Devtools MCP to leverage it's functionality without needing to mess with it too much

Should that be  unreliable or problematic, we can chop it up and harvest it for parts.


## CDP Methods Needed

Here's the mapping of tools to CDP methods:

| Tool | CDP Method | CDP Docs |
|------|------------|----------|
| `debugger_enable()` | `Debugger.enable` | https://chromedevtools.github.io/devtools-protocol/tot/Debugger/#method-enable |
| `debugger_set_breakpoint()` | `Debugger.setBreakpointByUrl` | https://chromedevtools.github.io/devtools-protocol/tot/Debugger/#method-setBreakpointByUrl |
| `debugger_get_call_stack()` | From `Debugger.paused` event | https://chromedevtools.github.io/devtools-protocol/tot/Debugger/#event-paused |
| `debugger_evaluate_on_call_frame()` | `Debugger.evaluateOnCallFrame` | https://chromedevtools.github.io/devtools-protocol/tot/Debugger/#method-evaluateOnCallFrame |
| `debugger_step_over()` | `Debugger.stepOver` | https://chromedevtools.github.io/devtools-protocol/tot/Debugger/#method-stepOver |
| `debugger_step_into()` | `Debugger.stepInto` | https://chromedevtools.github.io/devtools-protocol/tot/Debugger/#method-stepInto |
| `debugger_step_out()` | `Debugger.stepOut` | https://chromedevtools.github.io/devtools-protocol/tot/Debugger/#method-stepOut |
| `debugger_resume()` | `Debugger.resume` | https://chromedevtools.github.io/devtools-protocol/tot/Debugger/#method-resume |
| `debugger_pause()` | `Debugger.pause` | https://chromedevtools.github.io/devtools-protocol/tot/Debugger/#method-pause |
| `debugger_remove_breakpoint()` | `Debugger.removeBreakpoint` | https://chromedevtools.github.io/devtools-protocol/tot/Debugger/#method-removeBreakpoint |
| `debugger_set_pause_on_exceptions()` | `Debugger.setPauseOnExceptions` | https://chromedevtools.github.io/devtools-protocol/tot/Debugger/#method-setPauseOnExceptions |

## Event Handling

The debugger needs to listen for CDP events:

### `Debugger.paused` Event
When execution pauses at a breakpoint, CDP sends this event with:
- `callFrames[]` - The call stack
- `reason` - Why it paused ("breakpoint", "exception", etc.)
- `data` - Additional context

Store this in the client:

```python
class CDPClient:
    def __init__(self):
        self.paused_data = None  # Store when Debugger.paused received

    async def handle_event(self, event):
        if event["method"] == "Debugger.paused":
            self.paused_data = event["params"]

async def debugger_get_call_stack():
    if not cdp_client.paused_data:
        return "Not paused. Set a breakpoint and trigger it first."

    frames = cdp_client.paused_data["callFrames"]
    return format_call_stack(frames)
```

## Next Steps

1. **Determine CDP Access Method**: Check if Chrome DevTools MCP server exposes CDP
2. **Implement CDP Client**: Add websocket CDP connection or use MCP CDP tools
3. **Wire Up Tools**: Replace placeholders with real CDP calls
4. **Test**: Verify breakpoints, stepping, and evaluation work
5. **Handle Events**: Listen for `Debugger.paused` events properly

## Testing the Implementation

Once implemented, test with this workflow:

```bash
# TODO: rewrite for typescript
```

## Why This Forces Better Debugging

With these tools, agents **must**:
1. Know the source file path and line number
2. Set breakpoints strategically
3. Trigger the code path to hit the breakpoint
4. Inspect state when paused
5. Step through code methodically

This prevents the "spray and pray" approach of random `execute_script()` calls!
