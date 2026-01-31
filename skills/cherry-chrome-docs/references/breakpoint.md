# breakpoint

Set or remove JavaScript breakpoints. When code hits a breakpoint, execution
freezes and every variable in scope becomes inspectable via `call_stack()` and
`evaluate()`.

**See `references/debugger-guide.md` for debugging scenarios and strategies.**

## Prerequisites

Debugger enabled via `enable_debug_tools()`.

## Parameters

| Param | Required | Description |
|-------|----------|-------------|
| `action` | yes | `"set"` or `"remove"` |
| `url` | set only | Script URL to set breakpoint in |
| `line_number` | set only | Line number (1-indexed) |
| `column_number` | no | Column number (0-indexed, default: 0) |
| `condition` | no | JS expression - only pause when truthy |
| `breakpoint_id` | remove only | ID returned from a previous set |
| `connection_id` | no | Connection to use |

## Conditional Breakpoints

Skip irrelevant executions. Only pause when the condition matters:
```
breakpoint({ action: 'set', url: '...', line_number: 30,
  condition: 'user.role === "admin"' })

breakpoint({ action: 'set', url: '...', line_number: 50,
  condition: 'i === 99' })  -- skip straight to iteration 99

breakpoint({ action: 'set', url: '...', line_number: 75,
  condition: 'response.status >= 400' })  -- only pause on errors
```

## Output

**set:**
```
Breakpoint set successfully

Breakpoint ID: 1:42:0:http://localhost:3000/main.js
URL: http://localhost:3000/main.js
Line: 42
Condition: x > 5

Actual location: Line 42, Column 0
```

Save the Breakpoint ID to use with `action: "remove"` later.

**remove:**
```
Breakpoint 1:42:0:http://localhost:3000/main.js removed successfully.
```

## Tips

- Set breakpoints BEFORE triggering the code path
- Set multiple breakpoints across files to trace execution flow
- Use conditional breakpoints to avoid tedious stepping through loops
- The URL must match what the browser loaded (check with `get_console_logs()` or page source)
