# Cherry Chrome MCP

CSS selector-based Chrome DevTools MCP server with full JavaScript debugger support.

## Features

- **CSS Selector-based**: Query and interact using familiar CSS selectors
- **Compact Results**: Returns only what you query, not entire page snapshots
- **Multi-Instance Support**: Connect to multiple Chrome instances simultaneously
- **Full Debugger**: Breakpoints, stepping, call stack inspection, expression evaluation
- **DOM Depth Filtering**: Prevents returning the entire page on broad selectors
- **Smart Tools Mode**: NEW! Consolidated action-based tools with dynamic visibility and auto-bundled context
- **Built on Puppeteer**: Same battle-tested foundation as official Chrome DevTools MCP
- **TypeScript**: Type-safe, ported from Python chrome-debugger-mcp

## Installation

```bash
npm install
npm run build
```

## Usage

### As MCP Server

Add to your MCP client configuration:

```json
{
  "mcpServers": {
    "cherry-chrome": {
      "command": "node",
      "args": ["/path/to/cherry-chrome-mcp/build/src/index.js"],
      "env": {
        "USE_SMART_TOOLS": "true"
      }
    }
  }
}
```

### Development

```bash
npm run dev          # Watch mode
npm run build        # Build
npm test             # Run tests
npm start            # Build and start
```

### Testing with MCP Inspector

```bash
# Legacy mode (23 granular tools)
npx @modelcontextprotocol/inspector node build/src/index.js

# Smart mode (19 consolidated tools with dynamic visibility)
USE_SMART_TOOLS=true npx @modelcontextprotocol/inspector node build/src/index.js
```

## Tool Modes

Cherry Chrome MCP supports two tool modes via the `USE_SMART_TOOLS` environment variable:

### Legacy Mode (default)

23 granular tools with explicit names for each action. See "Available Tools" section below.

### Smart Mode (NEW!)

19 consolidated action-based tools with three major improvements:

**1. Consolidated Tools** - Related actions combined into single tools:
- `chrome(action: "connect" | "launch")` - Replaces chrome_connect + chrome_launch
- `target(action: "list" | "switch")` - Replaces list_targets + switch_target
- `step(direction: "over" | "into" | "out")` - Replaces 3 step tools
- `execution(action: "resume" | "pause")` - Replaces debugger_resume + debugger_pause
- `breakpoint(action: "set" | "remove")` - Replaces set + remove breakpoint

**2. Dynamic Tool Visibility** - Tools appear/disappear based on connection state:
- **Not connected**: 2 tools (chrome, chrome_list_connections)
- **Connected**: 12 tools (adds DOM + target + utilities)
- **Debug enabled**: 15 tools (adds debugger tools)
- **Paused**: 5 tools (step, execution, evaluate, call_stack, show_tools)

Reduces context overhead by hiding irrelevant tools automatically.

**3. Smart Auto-Bundled Responses** - Tools include contextual information by default:
- **Pause/breakpoint**: Auto-includes call stack, local variables (top 10), console logs (last 3)
- **Step**: Auto-includes new location, variables with [CHANGED] markers, new console output
- **Navigate**: Auto-includes page title, console errors, element summary
- **Click/fill**: Auto-includes triggered console logs, element state

Eliminates follow-up tool calls by anticipating what information you'll need next.

All smart tools support `include_context: false` to disable auto-bundling if needed.

## Available Tools

### Legacy Mode (23 tools)

#### Chrome Connection Management (5 tools)
- `chrome_connect(port, connection_id, host)` - Connect to existing Chrome
- `chrome_launch(debug_port, headless, user_data_dir, extra_args, connection_id)` - Launch new Chrome
- `chrome_list_connections()` - List all active connections
- `chrome_switch_connection(connection_id)` - Switch active connection
- `chrome_disconnect(connection_id)` - Disconnect from Chrome instance

#### Target Management (2 tools)
- `list_targets(connection_id)` - List all pages/workers
- `switch_target(connection_id, index, title, url)` - Switch to different page

#### DOM Interaction (5 tools)
- `query_elements(selector, limit, max_depth)` - Find elements by CSS selector with depth filtering
- `click_element(selector, index)` - Click an element
- `fill_element(selector, text, index, submit)` - Fill form inputs
- `navigate(url)` - Navigate to URL
- `get_console_logs(filter_level)` - Get console messages

#### JavaScript Debugger (11 tools)
- `debugger_enable()` - Enable JavaScript debugger
- `debugger_set_breakpoint(url, line_number, column_number, condition)` - Set breakpoint
- `debugger_get_call_stack()` - Get call stack when paused
- `debugger_evaluate_on_call_frame(call_frame_id, expression)` - Evaluate in paused context
- `debugger_step_over()` - Step over current line
- `debugger_step_into()` - Step into function call
- `debugger_step_out()` - Step out of function
- `debugger_resume()` - Resume execution
- `debugger_pause()` - Pause execution
- `debugger_remove_breakpoint(breakpoint_id)` - Remove breakpoint
- `debugger_set_pause_on_exceptions(state)` - Configure exception pausing

### Smart Mode (19 tools)

#### Connection & Setup (3 tools)
- `chrome(action, ...)` - Connect to or launch Chrome
- `chrome_list_connections()` - List all connections
- `chrome_disconnect(connection_id)` - Disconnect

#### Target & Visibility (4 tools)
- `target(action, ...)` - List or switch targets
- `enable_debug_tools()` - Show debugger tools
- `hide_tools(pattern)` - Hide tools by pattern
- `show_tools(all, tools)` - Restore hidden tools

#### DOM Interaction (5 tools)
- `query_elements(selector, ...)` - Find elements (same as legacy)
- `click_element(selector, include_context)` - Click with optional context
- `fill_element(selector, text, include_context)` - Fill with optional context
- `navigate(url, include_context)` - Navigate with optional context
- `get_console_logs(filter_level)` - Get console (same as legacy)

#### Debugger (7 tools)
- `breakpoint(action, ...)` - Set or remove breakpoints
- `step(direction, include_context)` - Step with optional context
- `execution(action, include_context)` - Resume or pause with optional context
- `call_stack(connection_id)` - Get call stack
- `evaluate(call_frame_id, expression)` - Evaluate expression
- `pause_on_exceptions(state)` - Configure exception pausing

## Key Differences from Standard Chrome DevTools MCP

1. **CSS Selector-First**: Uses CSS selectors instead of accessibility tree refs
2. **DOM Depth Filtering**: Filters out deeply nested elements (default depth 3)
3. **Compact Results**: Returns only queried data, not entire page snapshots
4. **Multi-Instance**: Connect to multiple Chrome/Electron instances simultaneously
5. **Full Debugger**: Complete JavaScript debugger integration via CDP
6. **Result Size Analysis**: Rejects oversized results with smart suggestions instead of truncating
7. **Smart Tools Mode**: Optional consolidated tools with dynamic visibility and auto-context

## Architecture

```
Cherry Chrome MCP
    ↓ (Puppeteer + CDP)
Chrome Browser(s)
```

Uses Puppeteer for browser automation and direct CDP (Chrome DevTools Protocol) for debugger operations.

## Configuration

Configuration constants in `src/config.ts`:
- `MAX_RESULT_SIZE = 5000` - Maximum result size in characters (~1250 tokens)
- `MAX_DOM_DEPTH = 3` - Default DOM depth filter
- `HARD_MAX_DOM_DEPTH = 10` - Maximum allowed DOM depth
- `USE_SMART_TOOLS = process.env.USE_SMART_TOOLS === 'true'` - Enable smart tools mode

## Documentation

- **FEATURE-TOGGLE.md** - Detailed comparison of legacy vs smart tools modes
- **CLAUDE.md** - Development guidance for AI assistants
- **test-toggle.sh** - Automated testing script for both modes

## License

MIT
