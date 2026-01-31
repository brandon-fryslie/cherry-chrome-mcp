# chrome_disconnect

Disconnect from a Chrome instance. Closes browser and cleans up state.

## Prerequisites

Connection exists via `connect()`.

## Parameters

| Param | Required | Description |
|-------|----------|-------------|
| `connection_id` | yes | ID of the connection to disconnect |

## Output

```
Disconnected 'default'
```

If the disconnected connection was active, the next available connection becomes active.
