# Handoff: CDP Debugger Integration

**Created**: 2026-01-10
**For**: Implementation agent or developer
**Status**: ready-to-start (WebSocket client needed)

---

## Objective

Integrate Chrome DevTools Protocol (CDP) Debugger domain via direct WebSocket connection to enable proper debugging workflows in the MCP wrapper, replacing placeholder implementations with real debugger functionality.

## Current State

### What's Been Done
- ✅ Created Python FastMCP wrapper server with 7 core element tools
- ✅ Implemented CSS selector-based query with DOM depth filtering (max 3, hard limit 10)
- ✅ Added smart size limits with deterministic analysis (rejects oversized results with suggestions)
- ✅ Implemented native Chrome DevTools click/fill using server-side ref resolution
- ✅ Added inline elision messages for filtered child elements
- ✅ Hidden `execute_script` tool (renamed to `_internal_execute_script`) to prevent abuse
- ✅ Designed 11 CDP debugger tool signatures with full documentation
- ✅ Added websockets and aiohttp dependencies to requirements.txt

### What's In Progress
- 🔄 CDP WebSocket client implementation (ready to start)

### What Remains
- [ ] Implement `CDPClient` class with WebSocket connection
- [ ] Wire up all 11 debugger tools to real CDP commands
- [ ] Handle CDP events (especially `Debugger.paused`)
- [ ] Test debugger workflow end-to-end
- [ ] Update documentation with CDP setup instructions

## Context & Background

### Why We're Doing This

The agent was using `execute_script()` for everything - bypassing depth limits, size checks, and smart analysis. This led to random code execution instead of methodical debugging. We need to force proper debugging workflows by:
1. Hiding arbitrary script execution
2. Exposing only structured debugger tools that require file paths, line numbers, and breakpoints

### Key Decisions Made

| Decision | Rationale | Date |
|----------|-----------|------|
| Hide `execute_script` | Agents were bypassing all safety features | 2026-01-10 |
| Use direct WebSocket CDP | Simpler than depending on Chrome DevTools MCP exposing CDP | 2026-01-10 |
| Placeholder implementations first | Get tool signatures right before wiring | 2026-01-10 |
| Hard depth limit of 10 | Prevents massive data returns from deep DOM queries | 2026-01-10 |
| Default depth limit of 3 | Forces agents to use specific CSS selectors | 2026-01-10 |

### Important Constraints

- **Must not break existing tools**: Core element tools (query_elements, click_element, fill_element) must continue working
- **WebSocket URL discovery**: Need to get CDP WebSocket URL (typically from `http://localhost:9222/json`)
- **Event handling required**: CDP sends async events (`Debugger.paused`) that must be captured
- **Placeholder fallback**: If CDP unavailable, tools should gracefully degrade with helpful error messages
- **No new external dependencies**: Using only websockets and aiohttp (already added)

## Acceptance Criteria

How we'll know this is complete:

- [ ] Agent can enable debugger with `debugger_enable()`
- [ ] Agent can set breakpoint with file URL and line number
- [ ] When breakpoint is hit, execution pauses
- [ ] Agent can get call stack showing function names and locations
- [ ] Agent can evaluate expressions in paused call frame context
- [ ] Agent can step over/into/out of code
- [ ] Agent can resume execution
- [ ] All 11 debugger tools work with real CDP commands
- [ ] Tools fail gracefully if CDP unavailable
- [ ] Documentation updated with CDP setup

## Scope

### Files to Modify

- `server.py` - Add `CDPClient` class and wire up debugger tools (lines 80-116, 607-947)
- `requirements.txt` - Already updated with websockets, aiohttp ✅
- `CDP_IMPLEMENTATION.md` - Update from placeholder status to implementation guide
- `README.md` - Add debugger workflow examples and CDP setup
- `config.py` - Add CDP WebSocket URL configuration

### Related Components

- `ChromeDevToolsClient` (lines 32-122) - MCP client for UI tools
- `CDPClient` (to be added) - WebSocket client for debugger
- Debugger tools (lines 607-947) - All need CDP wiring

### Out of Scope

- Performance profiling tools (stick to Debugger domain only)
- Source map handling (nice-to-have, not MVP)
- Multi-page/multi-target debugging (single page is enough)
- Persisting breakpoints across sessions (ephemeral is fine)

## Implementation Approach

### Recommended Steps

1. **Add CDPClient class** (after `ChromeDevToolsClient` around line 123)
   - WebSocket connection to Chrome
   - JSON-RPC message handling (id, method, params, result)
   - Event listener for `Debugger.paused` and other events
   - Store paused state for `debugger_get_call_stack()`

2. **Implement WebSocket URL discovery**
   - Fetch `http://localhost:9222/json` to get WebSocket URL
   - Parse JSON and extract `webSocketDebuggerUrl`
   - Handle case where Chrome isn't running with DevTools enabled

3. **Wire up each debugger tool** (lines 607-947)
   - Replace placeholder `_execute_script()` calls with `cdp_client.send_command()`
   - Map tool parameters to CDP method parameters
   - Format CDP responses for agent consumption

4. **Handle CDP events**
   - Listen for `Debugger.paused` event
   - Store call frames when paused
   - Return stored frames in `debugger_get_call_stack()`

5. **Update lifespan** (lines 189-203)
   - Initialize `cdp_client` alongside `chrome_client`
   - Connect to CDP WebSocket on startup
   - Clean disconnect on shutdown

### Patterns to Follow

- **Error handling**: Wrap CDP calls in try/except, return helpful error messages
- **JSON-RPC format**: `{"id": <int>, "method": "<Domain.method>", "params": {...}}`
- **Event format**: `{"method": "<Domain.event>", "params": {...}}` (no id field)
- **Async/await**: CDP client methods should be async
- **Global client**: Use global `cdp_client` variable like `chrome_client`

### Known Gotchas

- **CDP requires DevTools open**: Chrome must be started with `--remote-debugging-port=9222`
- **Event vs response**: Events have no `id` field, responses do
- **Paused state**: `Debugger.paused` event must be stored, not returned directly
- **Call frame IDs**: IDs from paused event are needed for `evaluateOnCallFrame`
- **Breakpoint resolution**: `setBreakpointByUrl` returns actual location (may differ from requested)
- **Multiple messages**: WebSocket may receive multiple messages before response arrives

## Reference Materials

### Planning Documents

- `CDP_IMPLEMENTATION.md` - Current implementation guide (needs updating post-implementation)
- `README.md` - Main project documentation
- `SETUP.md` - Setup instructions

### Codebase References

- `server.py:32-122` - `ChromeDevToolsClient` class (good reference for async client pattern)
- `server.py:607-947` - Debugger tool placeholders (need CDP wiring)
- `server.py:189-203` - Lifespan handler (where to init/cleanup CDP client)

### External Resources

- [CDP Debugger Domain](https://chromedevtools.github.io/devtools-protocol/tot/Debugger/) - Official CDP spec
- [CDP Overview](https://chromedevtools.github.io/devtools-protocol/) - Protocol basics
- [Websockets Python](https://websockets.readthedocs.io/) - Library docs
- [Chrome Remote Debugging](https://developer.chrome.com/docs/devtools/remote-debugging/) - How to start Chrome with debugging

## Questions & Blockers

### Open Questions

- [ ] Should we auto-discover WebSocket URL or require manual configuration?
- [ ] How to handle multiple Chrome instances (multiple WebSocket URLs)?
- [ ] Should we enable debugger automatically on first tool use or require explicit enable?
- [ ] What to do if Chrome closes while debugging?

### Current Blockers

None - ready to implement

### Need User Input On

- CDP WebSocket URL configuration strategy (auto-discover vs manual config)
- Behavior when Chrome/CDP unavailable (fail immediately vs retry?)

## Testing Strategy

### Existing Tests

None yet - this is a new project

### New Tests Needed

- [ ] CDPClient can connect to Chrome
- [ ] Breakpoint can be set at valid location
- [ ] Execution pauses when breakpoint hit
- [ ] Call stack retrieved when paused
- [ ] Expression evaluation works in paused context
- [ ] Step commands advance execution correctly
- [ ] Resume continues until next breakpoint

### Manual Testing

1. Start Chrome: `google-chrome --remote-debugging-port=9222`
2. Start wrapper: `python server.py`
3. Test in MCP Inspector:
   ```
   debugger_enable()
   debugger_set_breakpoint("http://localhost:3000/app.js", 42)
   navigate("http://localhost:3000")
   click_element("button.trigger")  # Triggers breakpoint
   debugger_get_call_stack()  # Should show paused location
   debugger_evaluate_on_call_frame("frame0", "user.name")
   debugger_step_over()
   debugger_resume()
   ```

## Success Metrics

How to validate implementation:

- All 11 debugger tools execute real CDP commands (no placeholders)
- Agent can set breakpoint, trigger it, inspect state, and step through code
- Tools fail gracefully with helpful errors when CDP unavailable
- Documentation shows end-to-end debugging workflow
- Zero token waste from agent using `execute_script` workarounds

---

## Next Steps for Agent

**Immediate actions**:

1. **Implement `CDPClient` class** (add after line 122 in server.py):
   ```python
   class CDPClient:
       def __init__(self):
           self.ws = None
           self.ws_url = None
           self.msg_id = 0
           self.paused_data = None  # Store Debugger.paused event data
           self.pending_responses = {}

       async def discover_ws_url(self):
           # Fetch http://localhost:9222/json
           # Parse and extract webSocketDebuggerUrl

       async def connect(self):
           # Connect to WebSocket
           # Start event listener task

       async def send_command(self, method: str, params: dict = None):
           # Send JSON-RPC message
           # Wait for response matching id

       async def _listen_events(self):
           # Background task listening for CDP events
           # Store Debugger.paused in self.paused_data
   ```

2. **Wire up `debugger_enable()`** (line 607):
   - Replace placeholder with `await cdp_client.send_command("Debugger.enable")`

3. **Wire up `debugger_set_breakpoint()`** (line 638):
   - Replace placeholder with `await cdp_client.send_command("Debugger.setBreakpointByUrl", {...})`
   - Return breakpoint ID from response

**Before starting implementation**:
- [ ] Read [CDP Debugger spec](https://chromedevtools.github.io/devtools-protocol/tot/Debugger/)
- [ ] Understand JSON-RPC format (id, method, params, result)
- [ ] Start Chrome with `--remote-debugging-port=9222` for testing

**When complete**:
- [ ] Update `CDP_IMPLEMENTATION.md` with "Implementation Complete" status
- [ ] Add debugger workflow example to README
- [ ] Test all 11 tools manually
- [ ] Mark handoff as complete

---

## Code Skeleton

Here's starter code for the `CDPClient`:

```python
import asyncio
import json
import websockets
import aiohttp

class CDPClient:
    """WebSocket client for Chrome DevTools Protocol Debugger domain"""

    def __init__(self, port: int = 9222):
        self.port = port
        self.ws = None
        self.ws_url = None
        self.msg_id = 0
        self.paused_data = None  # Stores Debugger.paused event
        self.pending = {}  # id -> asyncio.Future for responses
        self.listen_task = None

    async def discover_ws_url(self) -> str:
        """Discover CDP WebSocket URL from Chrome"""
        url = f"http://localhost:{self.port}/json"
        async with aiohttp.ClientSession() as session:
            async with session.get(url) as resp:
                targets = await resp.json()
                # Find first page target
                for target in targets:
                    if target.get("type") == "page":
                        return target["webSocketDebuggerUrl"]
        raise RuntimeError("No CDP target found")

    async def connect(self):
        """Connect to Chrome via WebSocket"""
        self.ws_url = await self.discover_ws_url()
        self.ws = await websockets.connect(self.ws_url)
        self.listen_task = asyncio.create_task(self._listen())

    async def disconnect(self):
        """Clean disconnect"""
        if self.listen_task:
            self.listen_task.cancel()
        if self.ws:
            await self.ws.close()

    async def send_command(self, method: str, params: dict = None) -> dict:
        """Send CDP command and wait for response"""
        self.msg_id += 1
        msg_id = self.msg_id

        message = {
            "id": msg_id,
            "method": method,
            "params": params or {}
        }

        # Create future for response
        future = asyncio.Future()
        self.pending[msg_id] = future

        # Send message
        await self.ws.send(json.dumps(message))

        # Wait for response
        response = await future

        if "error" in response:
            raise RuntimeError(f"CDP error: {response['error']}")

        return response.get("result", {})

    async def _listen(self):
        """Background task to listen for CDP messages"""
        async for message in self.ws:
            data = json.loads(message)

            # Check if it's a response (has id) or event (no id)
            if "id" in data:
                # Response to our command
                msg_id = data["id"]
                if msg_id in self.pending:
                    self.pending[msg_id].set_result(data)
                    del self.pending[msg_id]
            else:
                # Event
                await self._handle_event(data)

    async def _handle_event(self, event: dict):
        """Handle CDP events"""
        method = event.get("method")
        params = event.get("params", {})

        if method == "Debugger.paused":
            # Store paused state for debugger_get_call_stack()
            self.paused_data = params
        elif method == "Debugger.resumed":
            self.paused_data = None

        if DEBUG:
            print(f"CDP Event: {method}")

# Global CDP client instance
cdp_client: Optional[CDPClient] = None
```

Then in lifespan handler:

```python
@asynccontextmanager
async def lifespan(app):
    global chrome_client, cdp_client

    # Startup
    chrome_client = ChromeDevToolsClient()
    await chrome_client.connect()

    cdp_client = CDPClient()
    try:
        await cdp_client.connect()
    except Exception as e:
        print(f"Warning: CDP not available: {e}")
        # Continue without CDP - debugger tools will fail gracefully

    yield

    # Shutdown
    if chrome_client:
        await chrome_client.disconnect()
    if cdp_client:
        await cdp_client.disconnect()
```
