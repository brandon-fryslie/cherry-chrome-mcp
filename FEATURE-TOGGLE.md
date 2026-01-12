# Feature Toggle: Smart Consolidated Tools

Cherry Chrome MCP Server supports two tool modes via the `USE_SMART_TOOLS` environment variable.

## Modes

### Legacy Mode (Default)

**When:** `USE_SMART_TOOLS` is not set or set to `false`

**Tools:** Traditional granular tools (23 tools)
- `chrome_connect`, `chrome_launch`, `chrome_disconnect`
- `list_targets`, `switch_target`
- `debugger_enable`, `debugger_set_breakpoint`, `debugger_remove_breakpoint`
- `debugger_step_over`, `debugger_step_into`, `debugger_step_out`
- `debugger_resume`, `debugger_pause`
- All DOM tools (unchanged)

**Use case:** Backward compatibility, stable production use

### Smart Mode

**When:** `USE_SMART_TOOLS=true`

**Tools:** Consolidated action-based tools (18 tools)
- `chrome` (replaces `chrome_connect`, `chrome_launch`)
- `target` (replaces `list_targets`, `switch_target`)
- `enable_debug_tools` (replaces `debugger_enable` with semantic intent)
- `breakpoint` (replaces `debugger_set_breakpoint`, `debugger_remove_breakpoint`)
- `step` (replaces `debugger_step_over`, `debugger_step_into`, `debugger_step_out`)
- `execution` (replaces `debugger_resume`, `debugger_pause`)
- `call_stack`, `evaluate`, `pause_on_exceptions` (renamed for consistency)
- `hide_tools`, `show_tools` (NEW: dynamic tool visibility)
- All DOM tools (unchanged)

**Use case:** Testing new consolidated approach, advanced features

## Usage

### Legacy Mode (Default)

```bash
# Direct execution
node build/src/index.js

# With MCP inspector
npx @modelcontextprotocol/inspector node build/src/index.js

# With Claude Desktop
claude mcp add cherry-chrome -- node /path/to/build/src/index.js
```

### Smart Mode

```bash
# Direct execution
USE_SMART_TOOLS=true node build/src/index.js

# With MCP inspector
USE_SMART_TOOLS=true npx @modelcontextprotocol/inspector node build/src/index.js

# With Claude Desktop (.mcp.json)
{
  "mcpServers": {
    "cherry-chrome": {
      "command": "node",
      "args": ["/path/to/build/src/index.js"],
      "env": {
        "USE_SMART_TOOLS": "true"
      }
    }
  }
}
```

## Tool Comparison

| Legacy Tool | Smart Tool | Change |
|-------------|------------|--------|
| `chrome_connect(port, host, connection_id)` | `chrome(action="connect", port, host, connection_id)` | Action-based |
| `chrome_launch(debug_port, headless, ...)` | `chrome(action="launch", port, headless, ...)` | Action-based |
| `list_targets(connection_id)` | `target(action="list", connection_id)` | Action-based |
| `switch_target(index/title/url, connection_id)` | `target(action="switch", index/title/url, connection_id)` | Action-based |
| `debugger_enable(connection_id)` | `enable_debug_tools(connection_id)` | Renamed for semantic clarity |
| `debugger_set_breakpoint(url, line, ...)` | `breakpoint(action="set", url, line, ...)` | Action-based |
| `debugger_remove_breakpoint(breakpoint_id, ...)` | `breakpoint(action="remove", breakpoint_id, ...)` | Action-based |
| `debugger_step_over()` | `step(direction="over")` | Direction-based |
| `debugger_step_into()` | `step(direction="into")` | Direction-based |
| `debugger_step_out()` | `step(direction="out")` | Direction-based |
| `debugger_resume()` | `execution(action="resume")` | Action-based |
| `debugger_pause()` | `execution(action="pause")` | Action-based |
| `debugger_get_call_stack()` | `call_stack()` | Renamed for consistency |
| `debugger_evaluate_on_call_frame(frame, expr)` | `evaluate(frame, expr)` | Renamed for consistency |
| `debugger_set_pause_on_exceptions(state)` | `pause_on_exceptions(state)` | Renamed for consistency |
| N/A | `hide_tools(pattern/tools)` | NEW |
| N/A | `show_tools(all/tools)` | NEW |

## Testing

Run the test script to verify both modes work:

```bash
./test-toggle.sh
```

Expected output:
- Legacy mode: `[MODE: LEGACY TOOLS]` with 23 tools
- Smart mode: `[MODE: SMART TOOLS]` with 18 tools

## Implementation Details

- **Config:** `USE_SMART_TOOLS` flag in `src/config.ts` (default: `false`)
- **Registration:** Conditional tool array selection in `src/index.ts`
- **Routing:** Separate switch statements for legacy vs smart tool handlers
- **Backward compatibility:** All legacy tool implementations remain intact
- **Server startup:** Logs active mode to stderr

## Migration Path

1. **Phase 1 (Current):** Feature toggle allows testing smart tools alongside legacy
2. **Phase 2 (Future):** Add P1/P2 features (dynamic visibility, auto-bundled context)
3. **Phase 3 (Future):** Consider making smart tools the default after validation
4. **Phase 4 (Future):** Deprecate legacy tools if smart tools prove superior

## Notes

- The toggle requires **server restart** to change modes (not runtime-switchable)
- Both modes share the same underlying `BrowserManager` and tool implementations
- DOM tools are identical in both modes (no consolidation needed)
- Smart mode includes new features (`hide_tools`, `show_tools`) not available in legacy
