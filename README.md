# Cherry Chrome MCP

CSS selector-based Chrome DevTools MCP server with full JavaScript debugger support.

## Features

- **CSS Selector-based**: Query and interact using familiar CSS selectors
- **Compact Results**: Returns only what you query, not entire page snapshots
- **Multi-Instance Support**: Connect to multiple Chrome instances simultaneously
- **Full Debugger**: Breakpoints, stepping, call stack inspection, expression evaluation
- **DOM Depth Filtering**: Prevents returning the entire page on broad selectors
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
      "args": ["/path/to/cherry-chrome-mcp/build/src/index.js"]
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
npx @modelcontextprotocol/inspector node build/src/index.js
```

## Available Tools (21 total)

### Chrome Connection Management (5 tools)
- `chrome_connect(port, connection_id, host)` - Connect to existing Chrome
- `chrome_launch(debug_port, headless, user_data_dir, extra_args, connection_id)` - Launch new Chrome
- `chrome_list_connections()` - List all active connections
- `chrome_switch_connection(connection_id)` - Switch active connection
- `chrome_disconnect(connection_id)` - Disconnect from Chrome instance

### DOM Interaction (5 tools)
- `query_elements(selector, limit, max_depth)` - Find elements by CSS selector with depth filtering
- `click_element(selector, index)` - Click an element
- `fill_element(selector, text, index, submit)` - Fill form inputs
- `navigate(url)` - Navigate to URL
- `get_console_logs(filter_level)` - Get console messages

### JavaScript Debugger (11 tools)
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

## Key Differences from Standard Chrome DevTools MCP

1. **CSS Selector-First**: Uses CSS selectors instead of accessibility tree refs
2. **DOM Depth Filtering**: Filters out deeply nested elements (default depth 3)
3. **Compact Results**: Returns only queried data, not entire page snapshots
4. **Multi-Instance**: Connect to multiple Chrome/Electron instances simultaneously
5. **Full Debugger**: Complete JavaScript debugger integration via CDP
6. **Result Size Analysis**: Rejects oversized results with smart suggestions instead of truncating

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

## License

MIT
