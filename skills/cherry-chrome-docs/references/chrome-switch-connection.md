# chrome_switch_connection

Switch the active connection. All subsequent tool calls use the active connection.

## Prerequisites

Multiple connections created via `connect()` with different `connection_id` values.

## Parameters

| Param | Required | Description |
|-------|----------|-------------|
| `connection_id` | yes | ID of the connection to activate |

## Output

```
Switched to connection 'session2'
```
