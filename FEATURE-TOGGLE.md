# Feature Toggle: Smart Consolidated Tools

Cherry Chrome MCP Server supports two tool modes via the `USE_LEGACY_TOOLS` environment variable.

## Modes

### Smart Mode (Default)

**When:** `USE_LEGACY_TOOLS` is not set or set to `false`

**Tools:** Consolidated action-based tools (17 tools)
- `chrome` (replaces `chrome_connect`, `chrome_launch`)
- `target` (replaces `list_targets`, `switch_target`)
- `enable_debug_tools` (replaces `debugger_enable` with semantic intent)
- `breakpoint` (replaces `debugger_set_breakpoint`, `debugger_remove_breakpoint`)
- `step` (replaces `debugger_step_over`, `debugger_step_into`, `debugger_step_out`)
- `execution` (replaces `debugger_resume`, `debugger_pause`)
- `call_stack`, `evaluate`, `pause_on_exceptions` (renamed for consistency)
- All DOM tools (unchanged)

**Use case:** Modern consolidated approach, cleaner API

### Legacy Mode

**When:** `USE_LEGACY_TOOLS=true`

**Tools:** Traditional granular tools (23 tools)
- `chrome_connect`, `chrome_launch`, `chrome_disconnect`
- `list_targets`, `switch_target`
- `debugger_enable`, `debugger_set_breakpoint`, `debugger_remove_breakpoint`
- `debugger_step_over`, `debugger_step_into`, `debugger_step_out`
- `debugger_resume`, `debugger_pause`
- All DOM tools (unchanged)

**Use case:** Backward compatibility, stable production use

## Usage

### Smart Mode (Default)

```bash
# Direct execution
node build/src/index.js

# With MCP inspector
npx @modelcontextprotocol/inspector node build/src/index.js

# With Claude Desktop
claude mcp add cherry-chrome -- node /path/to/build/src/index.js
```

### Legacy Mode

```bash
# Direct execution
USE_LEGACY_TOOLS=true node build/src/index.js

# With MCP inspector
USE_LEGACY_TOOLS=true npx @modelcontextprotocol/inspector node build/src/index.js

# With Claude Desktop (.mcp.json)
{
  "mcpServers": {
    "cherry-chrome": {
      "command": "node",
      "args": ["/path/to/build/src/index.js"],
      "env": {
        "USE_LEGACY_TOOLS": "true"
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

## Testing

Run the test script to verify both modes work:

```bash
./test-toggle.sh
```

Expected output:
- Smart mode (default): `[MODE: SMART TOOLS]` with 17 tools
- Legacy mode: `[MODE: LEGACY TOOLS]` with 23 tools

## Implementation Details

- **Config:** `USE_LEGACY_TOOLS` flag in `src/config.ts` (default: `false`)
- **Registration:** Conditional tool array selection in `src/index.ts`
- **Routing:** Separate switch statements for legacy vs smart tool handlers
- **Backward compatibility:** All legacy tool implementations remain intact
- **Server startup:** Logs active mode to stderr
- **Tool visibility:** All tools are statically registered (no dynamic filtering)

## Migration from Previous Version

If you were previously using `USE_SMART_TOOLS=true`:
- Remove the environment variable (smart tools are now the default)

If you were using the default (legacy tools):
- Set `USE_LEGACY_TOOLS=true` to maintain legacy behavior

## Notes

- The toggle requires **server restart** to change modes (not runtime-switchable)
- Both modes share the same underlying `BrowserManager` and tool implementations
- DOM tools are identical in both modes (no consolidation needed)
- All tools in each mode are always visible (no dynamic visibility filtering)
