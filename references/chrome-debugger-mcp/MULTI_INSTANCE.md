# Multi-Instance Chrome Debugging

The Chrome Debugger MCP server supports connecting to multiple Chrome instances simultaneously.

## Features

- **Connect to arbitrary debug ports**: Use any port, not just 9222
- **Multiple simultaneous connections**: Debug multiple Chrome instances at once
- **Launch Chrome programmatically**: Start Chrome with custom configurations
- **Per-tool connection selection**: Specify which Chrome to use in each tool call
- **Default connection**: Uses active connection when not specified

## Connection Management Tools

### `chrome_connect(port, connection_id, host)`

Connect to an existing Chrome instance.

**Parameters:**
- `port` (int): Chrome debug port (default: 9222)
- `connection_id` (str): Unique identifier for this connection (default: "default")
- `host` (str): Chrome host (default: "localhost")

**Examples:**
```python
# Connect to Chrome on default port
chrome_connect(9222, "main")

# Connect to another Chrome instance
chrome_connect(9300, "secondary")

# Connect to remote Chrome
chrome_connect(9222, "remote-chrome", "192.168.1.100")
```

**Prerequisites:**
Chrome must be running with remote debugging enabled:
```bash
chrome --remote-debugging-port=9222
```

### `chrome_launch(debug_port, headless, user_data_dir, extra_args, connection_id)`

Launch a new Chrome instance with custom configuration.

**Parameters:**
- `debug_port` (int): Remote debugging port (default: 9222)
- `headless` (bool): Run in headless mode (default: False)
- `user_data_dir` (str): Custom user data directory (optional, creates temp if not specified)
- `extra_args` (str): Additional Chrome flags as space-separated string
- `connection_id` (str): Connection ID (default: auto-generate from port)

**Examples:**
```python
# Launch Chrome on port 9300
chrome_launch(9300)

# Launch headless Chrome
chrome_launch(9400, headless=True)

# Launch with custom flags
chrome_launch(9500, extra_args="--incognito --window-size=1920,1080")

# Launch with custom user data directory
chrome_launch(9600, user_data_dir="/tmp/chrome-profile")
```

**What it does:**
1. Launches Chrome with specified configuration
2. Waits for startup (2 seconds)
3. Automatically connects to the launched instance
4. Returns process ID and connection details

### `chrome_list_connections()`

List all active Chrome connections.

**Returns:**
- Connection ID
- WebSocket URL
- Active status (>>> marker for active connection)
- Paused state

**Example output:**
```
Chrome Connections:
================================================================================

>>> [main]
    URL: ws://localhost:9222/devtools/page/1234...
    Active: True
    Paused: False

    [secondary]
    URL: ws://localhost:9300/devtools/page/5678...
    Active: False
    Paused: True

Use chrome_switch_connection(connection_id) to change the active connection.
Use chrome_disconnect(connection_id) to close a connection.
```

### `chrome_switch_connection(connection_id)`

Switch the active Chrome connection.

All debugger and DOM tools will operate on the active connection.

**Example:**
```python
chrome_switch_connection("secondary")
```

### `chrome_disconnect(connection_id)`

Disconnect from a specific Chrome instance.

If you disconnect the active connection, the next available connection becomes active automatically.

**Example:**
```python
chrome_disconnect("main")
```

## Multi-Instance Workflows

### Workflow 1: Multiple Ports on Same Machine

Debug multiple local applications simultaneously:

```python
# Launch two Chrome instances
chrome_launch(9300, connection_id="app1")
chrome_launch(9400, connection_id="app2")

# List connections to verify
chrome_list_connections()

# Debug both simultaneously without switching!
debugger_enable(connection_id="app1")
debugger_set_breakpoint("http://localhost:3000/app.js", 42, connection_id="app1")

debugger_enable(connection_id="app2")
debugger_set_breakpoint("http://localhost:4000/main.js", 100, connection_id="app2")

# When breakpoints hit, specify which instance to inspect
debugger_get_call_stack(connection_id="app1")
debugger_get_call_stack(connection_id="app2")
```

### Workflow 2: Remote Chrome Debugging

Connect to Chrome running on remote machines:

```python
# Connect to different environments
chrome_connect(9222, connection_id="dev", host="dev.example.com")
chrome_connect(9222, connection_id="staging", host="staging.example.com")
chrome_connect(9222, connection_id="local", host="localhost")

# Debug across all environments without switching
debugger_enable(connection_id="dev")
debugger_set_breakpoint("app.js", 42, connection_id="dev")

debugger_enable(connection_id="staging")
debugger_set_breakpoint("app.js", 42, connection_id="staging")

# Compare behavior across environments
query_elements("button", connection_id="dev")
query_elements("button", connection_id="staging")
```

### Workflow 3: Headless Testing

Run automated tests in headless mode:

```python
# Launch headless Chrome for tests
chrome_launch(9500, headless=True, connection_id="test-runner")

# Switch to test Chrome
chrome_switch_connection("test-runner")

# Navigate to test page
navigate("http://localhost:8080/test.html")

# Set breakpoints and run tests
debugger_enable()
debugger_set_breakpoint("http://localhost:8080/test.js", 50)

# Click test button
click_element("#run-tests")

# Debug when paused
debugger_get_call_stack()
```

### Workflow 4: Different User Profiles

Test with different browser configurations:

```python
# Launch with clean profile
chrome_launch(9600, user_data_dir="/tmp/clean-profile", connection_id="clean")

# Launch with user profile
chrome_launch(9700, user_data_dir="/tmp/logged-in-profile", connection_id="logged-in")

# Test as anonymous user
chrome_switch_connection("clean")
navigate("https://myapp.com")
query_elements(".login-button")

# Test as logged-in user
chrome_switch_connection("logged-in")
navigate("https://myapp.com/dashboard")
query_elements(".user-menu")
```

## Connection Selection

You can specify which Chrome instance to use in **two ways**:

### 1. Per-Tool Selection (Recommended)

Every debugger and DOM tool accepts an optional `connection_id` parameter:

```python
# Debug different Chrome instances without switching
debugger_enable(connection_id="app1")
debugger_set_breakpoint("app.js", 42, connection_id="app1")

query_elements("button", connection_id="app2")
click_element(".submit", connection_id="app2")

# Mix and match as needed
debugger_get_call_stack(connection_id="staging")
fill_element("#input", "test", connection_id="production")
```

### 2. Default Connection (Fallback)

If you don't specify `connection_id`, tools use the **default connection**:

```python
# These use the default connection
debugger_enable()
query_elements("button")
click_element(".submit")
```

The default is either:
- The "default" connection (auto-created on startup if Chrome is running on 9222)
- The first connection you create
- The connection selected with `chrome_switch_connection()`

**Which approach to use?**
- **Per-tool selection**: When actively debugging multiple instances simultaneously
- **Default connection**: When working with one instance at a time

## Auto-Connection on Startup

When the MCP server starts, it attempts to auto-connect to Chrome on localhost:9222 with connection ID "default".

If this fails (Chrome not running), you'll see a note in the logs. You can manually connect later using `chrome_connect()`.

## Connection Lifecycle

1. **Server starts** → Auto-connect to localhost:9222 (if available)
2. **Manual connections** → Use `chrome_connect()` or `chrome_launch()`
3. **Active connection set** → First connection becomes active automatically
4. **Switch connections** → Use `chrome_switch_connection()`
5. **Disconnection** → Use `chrome_disconnect()` or server shutdown disconnects all

## Limitations

- Each Chrome instance must use a unique debug port
- Remote connections require network access to the Chrome host
- Launched Chrome processes are detached (won't stop when server stops)
- Maximum connections limited by system resources (typically dozens is fine)

## Troubleshooting

### "Failed to connect to Chrome CDP"

**Cause:** Chrome not running or wrong port

**Solution:**
```bash
# Check if Chrome is listening on the port
curl http://localhost:9222/json

# If not, launch Chrome with debugging
chrome --remote-debugging-port=9222
```

### "No active Chrome connection"

**Cause:** No connection established or all connections disconnected

**Solution:**
```python
# List connections
chrome_list_connections()

# If none, connect or launch
chrome_connect(9222, "main")
# or
chrome_launch(9300)
```

### "Connection already exists"

**Cause:** Trying to create a connection with an ID that's already in use

**Solution:**
```python
# Use a different connection ID
chrome_connect(9222, "main-2")

# Or disconnect the existing one first
chrome_disconnect("main")
chrome_connect(9222, "main")
```

### Chrome launches but connection fails

**Cause:** Chrome may need more time to start

**Solution:**
Wait a few seconds and connect manually:
```python
# After seeing the warning
import time
time.sleep(3)
chrome_connect(9300, "my-chrome")
```

## Platform-Specific Notes

### macOS
```bash
# Chrome path
/Applications/Google Chrome.app/Contents/MacOS/Google Chrome

# Launch with debugging
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --remote-debugging-port=9222
```

### Linux
```bash
# Chrome path
google-chrome

# Launch with debugging
google-chrome --remote-debugging-port=9222
```

### Windows
```cmd
REM Chrome path
C:\Program Files\Google\Chrome\Application\chrome.exe

REM Launch with debugging
"C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222
```

## Security Considerations

**Remote debugging exposes full browser control!**

- Only use on trusted networks
- Don't expose debug ports to the internet
- Use firewalls to restrict access
- Consider using SSH tunnels for remote debugging:
  ```bash
  ssh -L 9222:localhost:9222 user@remote-server
  ```

Then connect to localhost:9222 which tunnels to the remote server.

## Advanced: Custom Chrome Flags

You can pass any Chrome command-line flag via `extra_args`:

```python
# Disable GPU (for headless)
chrome_launch(9300, extra_args="--disable-gpu")

# Disable web security (testing only!)
chrome_launch(9300, extra_args="--disable-web-security --disable-site-isolation-trials")

# Set window size
chrome_launch(9300, extra_args="--window-size=1920,1080")

# Multiple flags
chrome_launch(9300, extra_args="--incognito --start-maximized --disable-extensions")
```

See [Chrome command-line switches](https://peter.sh/experiments/chromium-command-line-switches/) for full list.

## Best Practices

1. **Use descriptive connection IDs**: `"app1"`, `"staging"`, `"test-runner"` not `"conn1"`, `"a"`, `"x"`
2. **Check active connection**: Use `chrome_list_connections()` before debugging
3. **Disconnect when done**: Free up resources with `chrome_disconnect()`
4. **Use unique ports**: Avoid conflicts by using different ports for each instance
5. **Document your setup**: Note which ports are used for which applications

## Summary

Multi-instance support enables:
- ✅ Debugging multiple applications simultaneously
- ✅ Connecting to Chrome on any port
- ✅ Remote debugging over network
- ✅ Programmatic Chrome launching
- ✅ Easy switching between instances
- ✅ Flexible workflow configurations

All while maintaining the simple, selector-based debugging interface!
