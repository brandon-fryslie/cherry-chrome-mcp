# pause_on_exceptions

Configure whether to pause when JavaScript exceptions are thrown. This is
one of the most powerful debugging techniques - it catches errors at the
exact throw site with full variable context, even errors hidden inside
try/catch blocks that would otherwise be silently swallowed.

**See `references/debugger-guide.md` for debugging scenarios and strategies.**

## Prerequisites

Debugger enabled via `enable_debug_tools()`.

## Parameters

| Param | Required | Description |
|-------|----------|-------------|
| `state` | yes | `"none"`, `"uncaught"`, or `"all"` |
| `connection_id` | no | Connection to use |

## States

- **none**: Don't pause on exceptions (default)
- **uncaught**: Pause only on exceptions that aren't caught by try/catch. Good default for most debugging.
- **all**: Pause on ALL exceptions, including caught ones. Use this to find errors that are silently swallowed by blanket try/catch blocks.

## Output

```
Pause on exceptions set to: uncaught

Debugger will pause on uncaught exceptions only.
```

## When to Use Each State

- **uncaught**: Something is crashing or producing an unhandled rejection. Start here.
- **all**: Async operation fails silently, error is caught and ignored somewhere, or a try/catch is masking the real problem. This reveals hidden errors.
- **none**: Done debugging exceptions. Reset to avoid interrupting normal caught exceptions.

## Workflow

```
1. enable_debug_tools()
2. pause_on_exceptions({ state: 'all' })
3. -- trigger the failing operation
4. call_stack()         -- paused at the exact throw site
5. evaluate({ call_frame_id: '<id>', expression: 'err.message' })
6. evaluate({ call_frame_id: '<id>', expression: 'err.stack' })
7. -- inspect surrounding variables for full context
8. execution({ action: 'resume' })
```
