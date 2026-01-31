# connect

Connect to Chrome and navigate to a URL. Launches new Chrome if no port given.
Reuses existing connection if connection_id already exists.

## Prerequisites

None (starts the workflow).

## Parameters

| Param | Required | Description |
|-------|----------|-------------|
| `url` | yes | URL to navigate to |
| `port` | no | If provided, connect to existing Chrome. If omitted, launch new Chrome on random port (15000-18000) |
| `connection_id` | no | Identifier for this connection (default: "default") |
| `headless` | no | Headless mode when launching (default: true) |
| `user_data_dir` | no | Custom Chrome profile directory |
| `extra_args` | no | Additional Chrome launch flags |

## Behavior

- **No port, no existing connection**: Launches new Chrome on random port, navigates to URL
- **No port, connection exists**: Reuses existing connection, navigates to new URL
- **Port provided, something running**: Connects to existing Chrome, navigates to URL
- **Port provided, nothing running**: Error with guidance

## Output

```
Launched Chrome on port 16432 (ID: default)
Navigated to: https://example.com

Title: Example Domain
<semantic page summary: buttons, inputs, landmarks, etc.>
```

Or when reusing:
```
Using existing connection 'default'
Navigated to: https://example.com
```
