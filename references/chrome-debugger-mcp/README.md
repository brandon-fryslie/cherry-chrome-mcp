# Chrome DevTools MCP Wrapper

A Python-based MCP server that wraps Chrome DevTools MCP with a **selector-based interface** optimized for debugging web and Electron applications.

## Why This Exists

The standard Chrome DevTools MCP server has 26 tools and often returns massive snapshots (5000+ lines). This wrapper provides a minimal, efficient interface focused on debugging workflows using CSS selectors - just like writing traditional browser automation tests.

## Key Features

- ✅ **CSS Selector-based**: Query and interact using selectors (`.button`, `#username`, etc.)
- ✅ **Compact Results**: Returns only what you query, not entire page snapshots
- ✅ **DOM Depth Filtering**: Automatically filters deeply nested elements (depth > 3 from body) to prevent broad selectors from returning the entire page
- ✅ **Zero Token Cost**: Snapshots processed server-side, agent never sees them
- ✅ **Native Chrome DevTools**: Uses official click/fill tools (with JavaScript fallback)
- ✅ **Traditional Testing Approach**: Works like Playwright/Cypress/Selenium
- ✅ **Smart Size Limits**: Analyzes oversized results and suggests specific, actionable refinements (e.g., "use .login-form class") instead of wasting tokens on truncated garbage
- ✅ **Full JavaScript Debugger**: Set breakpoints, step through code, inspect variables - real debugging, not guessing
- ✅ **Multi-Instance Support**: Connect to multiple Chrome instances on different ports simultaneously
- ✅ **Chrome Launcher**: Programmatically launch Chrome with custom configurations

## Available Tools

The wrapper exposes **22 focused debugging tools** (vs 26 in Chrome DevTools MCP):

### Chrome Connection Management (5 tools)

- `chrome_connect(port, connection_id)` - Connect to Chrome on arbitrary debug port
- `chrome_launch(debug_port, headless, extra_args)` - Launch Chrome with custom config
- `chrome_list_connections()` - List all active connections
- `chrome_switch_connection(connection_id)` - Switch active Chrome instance
- `chrome_disconnect(connection_id)` - Disconnect from Chrome instance

### Core Element Tools

#### 1. `query_elements(selector, limit=20, max_depth=3)`
Find elements by CSS selector and see their details.

**Depth Filtering:** Automatically filters out elements nested deeper than 3 levels from `<body>` to prevent broad selectors like `"div"` from returning the entire page. This forces specific selectors and keeps results compact.

**Examples:**
```python
query_elements("button")                    # Buttons within 3 levels of body
query_elements(".login-form input")         # Inputs in login form
query_elements("#username")                 # Element with id="username"
query_elements("div", max_depth=10)         # Include deeper divs if needed
```

**Returns:** Tag, text, ID, classes, attributes, visibility, depth, position

**Output Example:**
```
Found 847 element(s) matching 'div'
Filtered out 782 deeply nested element(s) (depth > 3)
Showing first 20 of 65 remaining:

[0] <div> (depth: 1)
    ID: #main
    Classes: container, wrapper
    Visible: true
    [ELIDED 3 DIRECT CHILD ELEMENTS (15 elements total). INCREASE SELECTOR SPECIFICITY]

[1] <div> (depth: 2)
    Classes: content, main-content
    Visible: true
    [ELIDED 8 DIRECT CHILD ELEMENTS (42 elements total). INCREASE SELECTOR SPECIFICITY]
```

Elements at max depth show **inline elision messages** so the agent knows children exist but aren't included.

### 2. `click_element(selector, index=0)`
Click an element matching the CSS selector.

**Examples:**
```python
click_element("button.submit")              # Click first submit button
click_element(".item", index=2)             # Click 3rd item
```

### 3. `fill_element(selector, text, index=0, submit=False)`
Fill text into an input element.

**Examples:**
```python
fill_element("#username", "admin")
fill_element("input[name='password']", "secret123")
fill_element(".search", "query", submit=True)  # Fill and press Enter
```

### 4. `execute_script(script)`
Execute arbitrary JavaScript for custom debugging.

**Examples:**
```python
execute_script("document.title")
execute_script("window.location.href")
execute_script("localStorage.getItem('token')")
execute_script("Array.from(document.querySelectorAll('a')).map(a => a.href)")
```

### 5. `get_console_logs(filter_level="all")`
Get console messages for debugging.

**Levels:** `all`, `error`, `warning`, `info`, `debug`

### 6. `navigate(url)`
Navigate to a URL.

### 7. `get_network_requests(filter_status=None)`
Get network requests (for debugging API calls).

**Filter examples:** `"200"`, `"404"`, `"5xx"`

## Installation

### From PyPI (Recommended)

```bash
pip install chrome-debugger-mcp
```

### From Source

```bash
git clone https://github.com/yourusername/chrome-debugger-mcp.git
cd chrome-debugger-mcp
pip install -e .
```

**Requirements:** Python 3.10+, Node.js (for Chrome DevTools MCP server)

## Usage

### Test with MCP Inspector
```bash
# If installed from PyPI
npx @modelcontextprotocol/inspector chrome-debugger-mcp

# If running from source
npx @modelcontextprotocol/inspector python server.py
```

### Use with Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

**If installed from PyPI:**
```json
{
  "mcpServers": {
    "chrome-debugger": {
      "command": "chrome-debugger-mcp"
    }
  }
}
```

**If running from source:**
```json
{
  "mcpServers": {
    "chrome-debugger": {
      "command": "python",
      "args": ["/absolute/path/to/chrome-debugger-mcp/server.py"]
    }
  }
}
```

Then restart Claude Desktop.

## Typical Workflow

### Basic DOM Interaction
```
1. navigate("https://myapp.com")
2. query_elements("button")              # See what buttons exist
3. click_element("button.login")         # Click login button
4. fill_element("#username", "admin")    # Fill username
5. fill_element("#password", "secret")   # Fill password
6. click_element("button[type=submit]")  # Submit form
7. get_console_logs("error")             # Check for errors
```

### JavaScript Debugging
```
1. debugger_enable()                                          # Enable debugger
2. debugger_set_breakpoint("http://localhost:3000/app.js", 42)  # Set breakpoint
3. click_element("button")                                    # Trigger code
4. debugger_get_call_stack()                                  # See where we are
5. debugger_evaluate_on_call_frame("frame_id", "user.name")   # Inspect variables
6. debugger_step_over()                                       # Step to next line
7. debugger_resume()                                          # Continue execution
```

### Multi-Instance Debugging
```
1. chrome_launch(9300, connection_id="app1")           # Launch first Chrome
2. chrome_launch(9400, connection_id="app2")           # Launch second Chrome
3. chrome_list_connections()                           # See all connections

# Debug both simultaneously without switching!
4. navigate("http://localhost:3000", connection_id="app1")
5. debugger_enable(connection_id="app1")
6. debugger_set_breakpoint("app.js", 42, connection_id="app1")

7. navigate("http://localhost:4000", connection_id="app2")
8. debugger_enable(connection_id="app2")
9. debugger_set_breakpoint("main.js", 100, connection_id="app2")

# Inspect either instance at any time
10. debugger_get_call_stack(connection_id="app1")
11. debugger_get_call_stack(connection_id="app2")
```

See [MULTI_INSTANCE.md](MULTI_INSTANCE.md) for detailed multi-instance documentation.

## How It Works: Smart Ref Resolution

This wrapper uses a clever hybrid approach:

1. **Agent uses CSS selectors** - Simple, familiar interface
2. **Server finds element ref** - Temporarily marks element, takes snapshot, extracts ref
3. **Uses native Chrome DevTools tools** - Calls official `click`/`fill` with ref
4. **Falls back to JavaScript** - If native tools fail or ref not found
5. **Agent never sees snapshot** - Zero token cost!

**The Magic:**
```
Agent: "click_element('button.submit')"
  ↓
Wrapper: Mark element with temp ID → Snapshot → Extract ref → Clean up
  ↓
Chrome DevTools: Native click using ref (most reliable)
  ↓
Agent: "✓ Clicked <button> [ref=1234]"
```

## Smart Size Limits (Not Truncation!)

Most tools truncate large results - wasting tokens on incomplete, useless data.

**Traditional truncation (wasteful):**
```
Agent: query_elements("div")  // Returns 50,000 divs
Tool: [10,000 tokens of truncated garbage...]
Agent: Still doesn't have what they need, tries again
Total waste: 10,000+ tokens
```

**This wrapper (efficient with analysis):**
```
Agent: query_elements("div")  // Would return 50,000 divs

Tool: Result too large: 48.8KB (limit: 4.9KB)

      Found 247 elements. Here's how to narrow it down:
        Most common classes: .container (45 elements), .row (38 elements), .card (22 elements)
        IDs available: #main, #sidebar, #footer
        Tag breakdown: div (247)

      Try: Combine selector with a class (e.g., 'div.container')
      Or: Reduce limit parameter (currently showing 247 elements)

Agent: query_elements("div.login-form")  // Uses actual class from analysis
Tool: Found 1 element... [returns useful data]

Total cost: ~100 tokens (95% savings!)
```

The wrapper **analyzes** oversized results and provides **specific, actionable suggestions** based on the actual data found. This is:

- ✅ **Deterministic**: Analyzes the structured JSON data we control
- ✅ **Zero-cost**: Server-side processing, no tokens wasted
- ✅ **Specific**: Shows actual classes, IDs, and tags found in the results
- ✅ **Actionable**: Agent can immediately use suggested selectors

## DOM Depth Filtering

When you query `"div"`, querySelectorAll returns **every single div** on the page - the top-level container, all its children, grandchildren, etc. This explodes the result size.

**The Problem:**
```
query_elements("div")
→ Returns 847 divs including deeply nested ones
→ Would be 50KB+ of data
→ Agent overwhelmed, query fails
```

**The Solution - Depth Filtering:**

By default, we only return elements within **3 levels** of `<body>`:

```
<body>                    ← depth 0
  <div id="main">         ← depth 1  ✓ INCLUDED
    <div class="content"> ← depth 2  ✓ INCLUDED
      <div class="card">  ← depth 3  ✓ INCLUDED
        <div class="text">← depth 4  ✗ FILTERED OUT
```

**Result:**
- 847 divs found → 782 filtered → 65 returned
- Compact, focused results
- Agent forced to use specific selectors

**Override if needed (hard limit: 10):**
```python
query_elements("div", max_depth=8)  # Include deeper elements
query_elements("div", max_depth=10) # Maximum allowed
query_elements("div", max_depth=50) # Clamped to 10!
```

**Hard limit of 10:** Even if you request `max_depth=999`, it's clamped to 10. Going deeper than that returns massive amounts of irrelevant data.

**Inline elision messages:**
Elements at max depth that have children show this in their output:
```
[ELIDED 5 DIRECT CHILD ELEMENTS (12 elements total). INCREASE SELECTOR SPECIFICITY]
```

This tells you explicitly that children exist but were filtered - they're not missing, you just need to be more specific.

## Why CSS Selectors > Snapshots

**Snapshot approach (what other tools do):**
- Returns entire accessibility tree (5000+ lines)
- Agent must read everything to find what it needs
- Wastes tokens and time
- Hard to incrementally explore

**CSS Selector approach (this tool):**
- Agent queries exactly what it needs: `query_elements(".button")`
- Returns 10-100 lines of relevant info
- Natural for developers (how tests are actually written)
- Incremental exploration: "show me buttons", "show me inputs", etc.
- **Bonus:** Snapshots processed server-side for native tool use

## Architecture

```
┌─────────────────────────────┐
│  MCP Client / Agent         │  (e.g., Claude Desktop)
│  Uses CSS selectors only    │  "click_element('button.submit')"
└────────┬────────────────────┘
         │ MCP Protocol - Clean, minimal interface
         │
┌────────▼────────────────────────────────────────┐
│  Wrapper Server (This project)                  │
│  - Accepts CSS selectors from agent             │
│  - Internally: mark → snapshot → extract ref    │
│  - Calls native Chrome tools with refs          │
│  - Falls back to JavaScript if needed           │
│  - Truncates large results                      │
│  - Agent NEVER sees 5000-line snapshots!        │
└────────┬────────────────────────────────────────┘
         │ MCP Protocol - Uses all 26 tools internally
         │
┌────────▼────────┐
│ Chrome DevTools │  (Original server - npx)
│   MCP Server    │  26 tools, snapshot, click, fill, etc.
└─────────────────┘
```

## Configuration

Edit `config.py`:

```python
# Maximum result size (characters)
# Results larger than this are REJECTED with helpful error (not truncated!)
# 5000 chars ≈ 1250 tokens
MAX_RESULT_SIZE = 5000

# Maximum DOM depth for query_elements (default)
# Elements deeper than this from <body> are filtered out
# Setting this low (3) forces specific selectors
MAX_DOM_DEPTH = 3

# Hard limit for DOM depth
# Even if agent requests higher depth, clamped to this maximum
HARD_MAX_DOM_DEPTH = 10

# Enable debug logging
DEBUG = False

# Chrome DevTools server command (usually don't need to change)
CHROME_DEVTOOLS_COMMAND = "npx"
CHROME_DEVTOOLS_ARGS = ["-y", "@modelcontextprotocol/server-chrome-devtools"]
```

## Use Cases

Perfect for:
- Debugging Electron applications
- Debugging web applications
- Automated testing assistance
- Console error investigation
- Network request debugging

**Not for:**
- Performance profiling (use Chrome DevTools directly)
- Complex device emulation
- Screenshot capture (use selectors instead!)

## License

MIT
