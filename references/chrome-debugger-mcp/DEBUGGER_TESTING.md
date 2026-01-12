# Testing the Debugger Implementation

This guide shows you how to test the fully implemented CDP debugger functionality.

## Prerequisites

1. **Chrome must be running with remote debugging enabled**
   ```bash
   # macOS
   /Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --remote-debugging-port=9222

   # Linux
   google-chrome --remote-debugging-port=9222

   # Windows
   "C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222
   ```

2. **Server must be running**
   ```bash
   python server.py
   ```

3. **Navigate to a page with JavaScript**
   Open a page like `https://example.com` or a local development server

## Quick Test Workflow

Here's a complete workflow to test all debugger features:

### 1. Enable the Debugger

```python
debugger_enable()
```

**Expected result:**
```
✓ Debugger enabled successfully

You can now:
- Set breakpoints with debugger_set_breakpoint()
- Pause execution with debugger_pause()
- Configure exception breaking with debugger_set_pause_on_exceptions()
```

### 2. Set a Breakpoint

Find a JavaScript file URL from your page (check Network tab in Chrome DevTools):

```python
debugger_set_breakpoint("https://example.com/script.js", 42)
```

**Expected result:**
```
✓ Breakpoint set successfully

Breakpoint ID: 1:42:0:https://example.com/script.js
URL: https://example.com/script.js
Line: 42

Actual location: Line 42, Column 0

Trigger the code path to pause at this breakpoint.
```

### 3. Trigger the Breakpoint

Interact with the page to execute the code at line 42 (click a button, etc.)

### 4. Check Call Stack (When Paused)

```python
debugger_get_call_stack()
```

**Expected result:**
```
📍 Execution paused: breakpoint

Call Stack:
============================================================

[0] handleClick
    Frame ID: {"ordinal":0,"injectedScriptId":"1"}
    Location: https://example.com/script.js:42:0
    Scopes: local, closure, global

[1] (anonymous)
    Frame ID: {"ordinal":1,"injectedScriptId":"1"}
    Location: https://example.com/script.js:100:5
    Scopes: local, global

Use debugger_evaluate_on_call_frame(call_frame_id, expression) to inspect variables.
Use debugger_step_over/into/out() to continue stepping, or debugger_resume() to continue execution.
```

### 5. Evaluate Expressions

Inspect variables in the current scope:

```python
# Inspect a variable
debugger_evaluate_on_call_frame('{"ordinal":0,"injectedScriptId":"1"}', "user")

# Check a condition
debugger_evaluate_on_call_frame('{"ordinal":0,"injectedScriptId":"1"}', "user.id === 123")

# Compute a value
debugger_evaluate_on_call_frame('{"ordinal":0,"injectedScriptId":"1"}', "items.length")
```

**Expected result:**
```
✓ Evaluated: user

Type: object
Description: {id: 123, name: "John Doe", email: "john@example.com"}
```

### 6. Step Through Code

```python
# Step to next line (don't enter function calls)
debugger_step_over()

# Step into a function call
debugger_step_into()

# Step out of current function
debugger_step_out()
```

**Expected result:**
```
✓ Stepped over. Execution will pause at next line.
Use debugger_get_call_stack() to see current location.
```

### 7. Resume Execution

```python
debugger_resume()
```

**Expected result:**
```
✓ Execution resumed. Will pause at next breakpoint or exception.
```

### 8. Pause at Any Time

```python
debugger_pause()
```

**Expected result:**
```
✓ Pause requested. Execution will pause at next statement.
Use debugger_get_call_stack() once paused.
```

### 9. Configure Exception Breaking

```python
# Pause on all exceptions (caught and uncaught)
debugger_set_pause_on_exceptions("all")

# Pause only on uncaught exceptions
debugger_set_pause_on_exceptions("uncaught")

# Don't pause on exceptions
debugger_set_pause_on_exceptions("none")
```

**Expected result:**
```
✓ Exception breaking configured

Will pause on all exceptions (caught and uncaught)
```

### 10. Remove Breakpoint

```python
debugger_remove_breakpoint("1:42:0:https://example.com/script.js")
```

**Expected result:**
```
✓ Breakpoint 1:42:0:https://example.com/script.js removed successfully
```

## Testing with a Real Example

Here's a complete example using a simple HTML page:

### Step 1: Create test.html

```html
<!DOCTYPE html>
<html>
<head>
    <title>Debugger Test</title>
</head>
<body>
    <h1>Debugger Test Page</h1>
    <button id="testBtn">Click Me</button>

    <script>
        let counter = 0;

        function incrementCounter() {
            counter++;  // Line 13 - Set breakpoint here
            console.log('Counter:', counter);
            return counter;
        }

        function handleClick(event) {
            console.log('Button clicked');
            const result = incrementCounter();  // Line 20 - Or here
            alert(`Counter is now: ${result}`);
        }

        document.getElementById('testBtn').addEventListener('click', handleClick);
    </script>
</body>
</html>
```

### Step 2: Serve the file

```bash
# Using Python's built-in server
python -m http.server 8000
```

### Step 3: Open in Chrome

Navigate to `http://localhost:8000/test.html`

### Step 4: Test the debugger

```python
# Enable debugger
debugger_enable()

# Set breakpoint at line 13 (counter++)
debugger_set_breakpoint("http://localhost:8000/test.html", 13)

# Click the button in the browser
# ... execution pauses ...

# Check where we are
debugger_get_call_stack()

# Inspect the counter variable
debugger_evaluate_on_call_frame("<frame-id-from-stack>", "counter")

# Step over to next line
debugger_step_over()

# Check call stack again
debugger_get_call_stack()

# Resume execution
debugger_resume()
```

## Common Issues and Solutions

### Issue: "Failed to connect to Chrome CDP"

**Solution:** Make sure Chrome is running with `--remote-debugging-port=9222`

Check if Chrome is listening:
```bash
curl http://localhost:9222/json
```

Should return a JSON array of targets.

### Issue: "No page target found"

**Solution:** Open a tab in Chrome. The CDP client needs an active page target.

### Issue: "Breakpoint not hit"

**Possible causes:**
1. Wrong URL - Check the exact URL in Chrome DevTools Network tab
2. Wrong line number - Line numbers are 1-indexed, make sure you're counting correctly
3. Code not executed - Make sure to trigger the code path (click button, etc.)
4. Source maps - If using source maps, you may need to set breakpoint in compiled code

### Issue: "CDP error: Cannot find context with specified id"

**Solution:** The page was reloaded. Call `debugger_enable()` again after page reload.

## Advanced Testing

### Conditional Breakpoints

```python
# Only pause when user.id is 123
debugger_set_breakpoint(
    "http://localhost:8000/app.js",
    42,
    condition="user.id === 123"
)
```

### Exception Breaking

```python
# Enable pause on all exceptions
debugger_set_pause_on_exceptions("all")

# Trigger an exception in your code
# Execution will pause at the throw statement

# Check the call stack
debugger_get_call_stack()

# Inspect the exception
debugger_evaluate_on_call_frame("<frame-id>", "arguments[0]")
```

### Stepping Through Async Code

The debugger works with async/await and Promises:

```python
# Set breakpoint in async function
debugger_set_breakpoint("http://localhost:8000/app.js", 50)

# When paused in async function:
debugger_get_call_stack()  # Shows async call stack

# Step through promises
debugger_step_over()  # Steps to next await
```

## Performance Notes

- Setting too many breakpoints can slow down page load
- The CDP WebSocket has a 10-second timeout for commands
- Large call stacks (>20 frames) may be truncated for readability
- Evaluating complex expressions can take time

## What Works

✅ Breakpoints in JavaScript files
✅ Conditional breakpoints
✅ Stepping (over, into, out)
✅ Call stack inspection
✅ Variable evaluation
✅ Pause/resume
✅ Exception breaking
✅ Async/await debugging
✅ Multiple breakpoints
✅ Removing breakpoints

## What Doesn't Work (Yet)

❌ Breakpoints in inline `<script>` tags (use file URLs)
❌ Modifying variables during debugging (read-only for now)
❌ Watching expressions (can manually evaluate instead)
❌ Breakpoints in minified code (works but hard to read)

## Debugging the Debugger

Enable debug logging in `config.py`:

```python
DEBUG = True
```

This will print:
- CDP connection status
- When debugger pauses/resumes
- CDP command/response details
- WebSocket errors

Check the output when running `python server.py` to see what's happening under the hood.

## Next Steps

Once you've verified the debugger works:

1. Try it with your actual application code
2. Set breakpoints in complex functions
3. Use conditional breakpoints to debug specific cases
4. Inspect async/await flows
5. Debug exception handling

The debugger forces methodical debugging instead of random `console.log()` statements!
