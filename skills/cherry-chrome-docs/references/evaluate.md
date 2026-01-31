# evaluate

Evaluate any JavaScript expression in the context of a specific call frame.
This is the payoff of the debugger - direct access to every variable, object,
and piece of state at the exact moment execution paused. Not limited to
variable names; any valid JavaScript expression works.

**See `references/debugger-guide.md` for debugging scenarios and strategies.**

## Prerequisites

Execution must be PAUSED. Requires a `call_frame_id` from `call_stack()`.

## Parameters

| Param | Required | Description |
|-------|----------|-------------|
| `call_frame_id` | yes | Frame ID from `call_stack()` output |
| `expression` | yes | Any JavaScript expression |
| `connection_id` | no | Connection to use |

## Expression Examples

Simple variable inspection:
```
evaluate({ call_frame_id: '<id>', expression: 'counter' })
evaluate({ call_frame_id: '<id>', expression: 'user.name' })
evaluate({ call_frame_id: '<id>', expression: 'this.state' })
```

Complex analysis - compute anything against live state:
```
evaluate({ ..., expression: 'JSON.stringify(data, null, 2)' })
evaluate({ ..., expression: 'Object.keys(state).length' })
evaluate({ ..., expression: 'arr.filter(x => x.active).map(x => x.name)' })
evaluate({ ..., expression: 'typeof unknownVar' })
evaluate({ ..., expression: 'document.querySelectorAll(".error").length' })
evaluate({ ..., expression: 'new Error().stack' })  -- get current stack as string
```

## Output

```
Expression: myVariable

Result:
{
  "type": "number",
  "value": 42,
  "description": "42"
}
```

For objects:
```
Expression: data

Result:
{
  "type": "object",
  "className": "Object",
  "description": "Object",
  "value": { "x": 10, "y": 20 }
}
```

Result is the CDP RemoteObject (JSON.stringify'd).

## Tips

- Evaluate in different frames: frame `[0]` has locals, higher frames have caller context
- Use `JSON.stringify(obj, null, 2)` for readable object inspection
- After `step()` or `resume()`, call_frame_ids are stale - call `call_stack()` first
- Expressions can have side effects (be careful with mutations during debugging)
