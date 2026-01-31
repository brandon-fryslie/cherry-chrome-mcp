# When and How to Use the JavaScript Debugger

The debugger is the most powerful diagnostic tool available. It freezes
JavaScript execution at any point, exposing every variable, every scope,
and the full call stack. Use it aggressively - it is almost always faster
and more reliable than adding console.log statements.

## When to Use the Debugger

**Use the debugger FIRST when:**

- A function produces wrong output and the cause isn't obvious from reading code
- State is mutated somewhere unexpected and the source is unclear
- An event handler fires but the resulting behavior is wrong
- A network response is received but the UI doesn't update correctly
- A conditional branch takes the wrong path
- A loop produces unexpected results
- A variable is undefined/null when it shouldn't be
- An exception is thrown and the stack trace alone isn't enough context
- Code executes in an unexpected order (async/promise issues)
- A third-party library callback receives unexpected arguments

**The debugger is better than console.log because:**

- See ALL variables in scope, not just the ones explicitly logged
- Inspect the full call stack to understand how execution arrived here
- Step line-by-line to watch exactly how state changes
- Evaluate arbitrary expressions against live state
- No need to modify code, rebuild, or reload - just set a breakpoint
- Catch exceptions at the exact throw site with full context
- Examine closure variables that aren't easily accessible from outside

## Quick Start: 5-Step Debug Session

```
1. enable_debug_tools()
2. breakpoint({ action: 'set', url: '<script-url>', line_number: <line> })
3. -- trigger the code (click a button, submit a form, etc.)
4. call_stack()  →  see where execution paused, get call_frame_ids
5. evaluate({ call_frame_id: '<id>', expression: '<variable or expression>' })
```

That's it. Five calls to go from "something is wrong" to "I can see every
variable at the exact point of failure."

## Common Debugging Scenarios

### Scenario: Function returns wrong value

```
1. enable_debug_tools()
2. breakpoint({ action: 'set', url: 'http://localhost:3000/utils.js', line_number: 42 })
3. -- trigger the function
4. call_stack()
5. evaluate({ call_frame_id: '<id>', expression: 'inputData' })
6. step({ direction: 'over' })    -- watch each line execute
7. evaluate({ call_frame_id: '<new-id>', expression: 'result' })
   -- now compare input vs output at each step
8. execution({ action: 'resume' })
```

### Scenario: Click handler doesn't work

```
1. enable_debug_tools()
2. breakpoint({ action: 'set', url: 'http://localhost:3000/app.js', line_number: 100 })
3. interact({ action: 'click', selector: '#broken-button' })
   -- if breakpoint hits, the handler IS firing (problem is in the logic)
   -- if breakpoint doesn't hit, the handler isn't attached (check selector/binding)
4. call_stack()
5. evaluate({ call_frame_id: '<id>', expression: 'event.target' })
6. evaluate({ call_frame_id: '<id>', expression: 'this.state' })
```

### Scenario: Async operation fails silently

```
1. enable_debug_tools()
2. pause_on_exceptions({ state: 'all' })
   -- catches ALL exceptions, even caught ones hidden in try/catch
3. -- trigger the async operation
4. call_stack()   -- paused at the exception
5. evaluate({ call_frame_id: '<id>', expression: 'err.message' })
6. evaluate({ call_frame_id: '<id>', expression: 'err.stack' })
   -- now the full error context is visible
```

### Scenario: State changes unexpectedly

```
1. enable_debug_tools()
2. breakpoint({ action: 'set', url: 'http://localhost:3000/store.js',
     line_number: 50, condition: 'state.count > 10' })
   -- conditional breakpoint: only pauses when the condition is true
3. -- use the app normally
4. call_stack()   -- paused exactly when count exceeds 10
5. evaluate({ call_frame_id: '<id>', expression: 'state' })
6. -- inspect the call stack to see WHO triggered this mutation
```

### Scenario: Race condition / ordering issue

```
1. enable_debug_tools()
2. breakpoint({ action: 'set', url: '.../api.js', line_number: 20 })
3. breakpoint({ action: 'set', url: '.../render.js', line_number: 45 })
   -- set breakpoints in both competing code paths
4. -- trigger the operation
5. -- whichever breakpoint hits first reveals the execution order
6. call_stack()
7. execution({ action: 'resume' })
   -- resume to see which hits second
```

### Scenario: Loop produces wrong results

```
1. enable_debug_tools()
2. breakpoint({ action: 'set', url: '.../process.js',
     line_number: 30, condition: 'i === 5' })
   -- skip straight to iteration 5 instead of stepping through all iterations
3. evaluate({ call_frame_id: '<id>', expression: 'items[i]' })
4. evaluate({ call_frame_id: '<id>', expression: 'accumulator' })
5. step({ direction: 'over' })  -- watch one iteration
6. evaluate({ call_frame_id: '<id>', expression: 'accumulator' })
   -- see exactly how the accumulator changed
```

### Scenario: Third-party library behaves unexpectedly

```
1. enable_debug_tools()
2. pause_on_exceptions({ state: 'uncaught' })
   -- or set a breakpoint at the call site where the library is invoked
3. breakpoint({ action: 'set', url: '.../my-code.js', line_number: 75 })
4. -- trigger the library call
5. call_stack()
6. evaluate({ call_frame_id: '<id>', expression: 'libraryInput' })
7. step({ direction: 'into' })  -- step INTO the library code
8. -- now inside the library, inspect its internal state
```

## Power Techniques

### Conditional Breakpoints

Pause only when a condition is true. Avoid stepping through irrelevant iterations:
```
breakpoint({ action: 'set', url: '...', line_number: 30,
  condition: 'user.role === "admin"' })
```

### Evaluate Complex Expressions

Not limited to variable names. Evaluate any JavaScript:
```
evaluate({ call_frame_id: '<id>', expression: 'JSON.stringify(data, null, 2)' })
evaluate({ call_frame_id: '<id>', expression: 'Object.keys(state).length' })
evaluate({ call_frame_id: '<id>', expression: 'document.querySelectorAll(".error").length' })
evaluate({ call_frame_id: '<id>', expression: 'arr.filter(x => x.active).map(x => x.name)' })
```

### Step Strategically

- `step({ direction: 'over' })` - Stay at current level, skip function internals
- `step({ direction: 'into' })` - Dive into the function call on this line
- `step({ direction: 'out' })` - Finish current function, pause at caller

Use 'over' by default. Use 'into' only when a specific function call is suspect.
Use 'out' to escape a function you stepped into by mistake.

### Multiple Breakpoints

Set several breakpoints to trace execution flow across files:
```
breakpoint({ action: 'set', url: '.../router.js', line_number: 10 })
breakpoint({ action: 'set', url: '.../handler.js', line_number: 25 })
breakpoint({ action: 'set', url: '.../database.js', line_number: 50 })
-- resume between each to trace the request through the system
```

### Combine with DOM Tools

While paused, the browser is frozen. DOM tools work normally:
```
-- while paused at a breakpoint:
query_elements({ selector: '.error-message' })  -- check DOM state at this exact moment
get_console_logs()                                -- check what was logged up to this point
```

## Tips

- Set breakpoints BEFORE triggering the code, not after
- Use `call_stack()` after every pause - it shows where and why execution stopped
- After `step()`, previous `call_frame_id` values are stale - call `call_stack()` again
- `pause_on_exceptions({ state: 'all' })` catches hidden errors in try/catch blocks
- Conditional breakpoints avoid tedious stepping through loops
- `execution({ action: 'resume' })` continues to the next breakpoint automatically
- The debugger works on any JavaScript: app code, framework code, library code
