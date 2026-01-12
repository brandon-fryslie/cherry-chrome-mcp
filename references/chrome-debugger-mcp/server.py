#!/usr/bin/env python3
"""
MCP Wrapper Server for Chrome DevTools
Selector-based debugging tools for web/Electron applications
Uses native Chrome DevTools tools with server-side ref resolution
"""

import asyncio
import json
import re
import logging
import sys
from pathlib import Path
from typing import Any, Optional, List, Tuple, Dict
from contextlib import asynccontextmanager

import websockets
import aiohttp

from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client
from fastmcp import FastMCP

# Import configuration
from config import (
    CHROME_DEVTOOLS_COMMAND,
    CHROME_DEVTOOLS_ARGS,
    MAX_RESULT_SIZE,
    MAX_DOM_DEPTH,
    HARD_MAX_DOM_DEPTH,
    DEBUG
)

# Set up logging
log_dir = Path(__file__).parent / "logs"
log_dir.mkdir(exist_ok=True)
log_file = log_dir / "chrome-debugger-mcp.log"

# Configure logger
logger = logging.getLogger("chrome-debugger-mcp")
logger.setLevel(logging.DEBUG if DEBUG else logging.INFO)

# File handler - always logs everything
file_handler = logging.FileHandler(log_file, mode='a')
file_handler.setLevel(logging.DEBUG)
file_formatter = logging.Formatter(
    '%(asctime)s [%(levelname)s] %(name)s: %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
file_handler.setFormatter(file_formatter)

# Stderr handler - for MCP client to capture
stderr_handler = logging.StreamHandler(sys.stderr)
stderr_handler.setLevel(logging.DEBUG if DEBUG else logging.WARNING)
stderr_formatter = logging.Formatter('[%(levelname)s] %(message)s')
stderr_handler.setFormatter(stderr_formatter)

logger.addHandler(file_handler)
logger.addHandler(stderr_handler)

logger.info("="*80)
logger.info("Chrome Debugger MCP Server Starting")
logger.info(f"Log file: {log_file}")
logger.info(f"Debug mode: {DEBUG}")
logger.info(f"Chrome DevTools command: {CHROME_DEVTOOLS_COMMAND}")
logger.info(f"Chrome DevTools args: {CHROME_DEVTOOLS_ARGS}")
logger.info("="*80)


class CDPClient:
    """Direct Chrome DevTools Protocol client via WebSocket"""

    def __init__(self):
        self.ws = None
        self.ws_url = None
        self.msg_id = 0
        self.pending_responses = {}
        self.paused_data = None
        self.event_handlers = {}
        self.receive_task = None
        self.breakpoints = {}  # Map breakpoint IDs to their info

    async def connect(self, chrome_host: str = "localhost", chrome_port: int = 9222):
        """
        Connect to Chrome via CDP WebSocket.

        Args:
            chrome_host: Chrome host (default: localhost)
            chrome_port: Chrome DevTools port (default: 9222)
        """
        logger.debug(f"CDPClient.connect: Connecting to {chrome_host}:{chrome_port}")
        try:
            # Get list of available targets from Chrome
            logger.debug(f"Fetching targets from http://{chrome_host}:{chrome_port}/json")
            timeout = aiohttp.ClientTimeout(total=5)  # 5 second timeout
            async with aiohttp.ClientSession(timeout=timeout) as session:
                async with session.get(f"http://{chrome_host}:{chrome_port}/json") as resp:
                    targets = await resp.json()
                    logger.debug(f"Found {len(targets)} targets")

            # Find the first page target
            page_target = None
            for target in targets:
                if target.get("type") == "page":
                    page_target = target
                    logger.debug(f"Found page target: {target.get('title', 'Untitled')}")
                    break

            if not page_target:
                error_msg = "No page target found. Open a Chrome window/tab."
                logger.error(error_msg)
                raise RuntimeError(error_msg)

            self.ws_url = page_target["webSocketDebuggerUrl"]
            logger.debug(f"Connecting to WebSocket: {self.ws_url}")

            # Connect to WebSocket
            self.ws = await websockets.connect(self.ws_url)

            # Start receiving messages
            self.receive_task = asyncio.create_task(self._receive_loop())

            logger.info(f"✓ Connected to Chrome CDP at {chrome_host}:{chrome_port}")
            if DEBUG:
                print(f"Connected to Chrome CDP: {self.ws_url}")

        except Exception as e:
            error_msg = f"Failed to connect to Chrome CDP at {chrome_host}:{chrome_port}: {e}"
            logger.error(error_msg)
            raise RuntimeError(error_msg)

    async def disconnect(self):
        """Disconnect from Chrome CDP"""
        if self.receive_task:
            self.receive_task.cancel()
            try:
                await self.receive_task
            except asyncio.CancelledError:
                pass

        if self.ws:
            await self.ws.close()

    async def _receive_loop(self):
        """Receive and handle messages from Chrome"""
        try:
            async for message in self.ws:
                data = json.loads(message)

                # Response to a command
                if "id" in data:
                    msg_id = data["id"]
                    if msg_id in self.pending_responses:
                        self.pending_responses[msg_id].set_result(data)

                # Event
                elif "method" in data:
                    await self._handle_event(data)

        except asyncio.CancelledError:
            pass
        except Exception as e:
            if DEBUG:
                print(f"CDP receive loop error: {e}")

    async def _handle_event(self, event: dict):
        """Handle CDP events"""
        method = event["method"]
        params = event.get("params", {})

        # Store paused data for debugger_get_call_stack
        if method == "Debugger.paused":
            self.paused_data = params
            if DEBUG:
                reason = params.get("reason", "unknown")
                print(f"Debugger paused: {reason}")

        # Clear paused data on resume
        elif method == "Debugger.resumed":
            self.paused_data = None
            if DEBUG:
                print("Debugger resumed")

        # Call custom event handlers
        if method in self.event_handlers:
            await self.event_handlers[method](params)

    async def send_command(self, method: str, params: dict = None) -> dict:
        """
        Send a CDP command and wait for response.

        Args:
            method: CDP method name (e.g., "Debugger.enable")
            params: Method parameters

        Returns:
            Response from Chrome
        """
        if not self.ws:
            raise RuntimeError("Not connected to Chrome CDP")

        self.msg_id += 1
        msg_id = self.msg_id

        message = {
            "id": msg_id,
            "method": method,
            "params": params or {}
        }

        # Create future for response
        future = asyncio.Future()
        self.pending_responses[msg_id] = future

        # Send command
        await self.ws.send(json.dumps(message))

        # Wait for response (with timeout)
        try:
            response = await asyncio.wait_for(future, timeout=10.0)
            del self.pending_responses[msg_id]

            if "error" in response:
                raise RuntimeError(f"CDP error: {response['error']}")

            return response.get("result", {})

        except asyncio.TimeoutError:
            del self.pending_responses[msg_id]
            raise RuntimeError(f"CDP command timeout: {method}")


class CDPConnectionManager:
    """Manages multiple CDP connections to different Chrome instances"""

    def __init__(self):
        self.connections: Dict[str, CDPClient] = {}
        self.active_connection_id: Optional[str] = None

    async def connect(self, connection_id: str, host: str = "localhost", port: int = 9222) -> str:
        """
        Connect to a Chrome instance.

        Args:
            connection_id: Unique identifier for this connection
            host: Chrome host (default: localhost)
            port: Chrome debug port (default: 9222)

        Returns:
            Success message
        """
        logger.debug(f"CDPConnectionManager.connect: connection_id={connection_id}, host={host}, port={port}")

        if connection_id in self.connections:
            error_msg = f"Error: Connection '{connection_id}' already exists. Use chrome_disconnect first."
            logger.warning(error_msg)
            return error_msg

        cdp = CDPClient()
        try:
            logger.debug(f"Creating new CDPClient for connection '{connection_id}'")
            await cdp.connect(chrome_host=host, chrome_port=port)
            self.connections[connection_id] = cdp
            logger.debug(f"Added connection '{connection_id}' to connections dict")

            # Set as active if it's the first connection
            if self.active_connection_id is None:
                self.active_connection_id = connection_id
                logger.debug(f"Set '{connection_id}' as active connection")

            success_msg = f"✓ Connected to Chrome at {host}:{port} (ID: {connection_id})"
            logger.info(success_msg)
            return success_msg
        except Exception as e:
            error_msg = f"Failed to connect to Chrome at {host}:{port}: {e}"
            logger.error(error_msg, exc_info=True)
            raise RuntimeError(error_msg)

    async def disconnect(self, connection_id: str) -> str:
        """Disconnect a specific Chrome instance"""
        if connection_id not in self.connections:
            return f"Error: Connection '{connection_id}' not found"

        cdp = self.connections[connection_id]
        await cdp.disconnect()
        del self.connections[connection_id]

        # Switch active connection if we disconnected the active one
        if self.active_connection_id == connection_id:
            self.active_connection_id = next(iter(self.connections.keys()), None)

        return f"✓ Disconnected from '{connection_id}'"

    async def disconnect_all(self):
        """Disconnect all Chrome instances"""
        for cdp in self.connections.values():
            await cdp.disconnect()
        self.connections.clear()
        self.active_connection_id = None

    def get_active(self) -> Optional[CDPClient]:
        """Get the active CDP client"""
        if self.active_connection_id:
            return self.connections.get(self.active_connection_id)
        return None

    def get(self, connection_id: str) -> Optional[CDPClient]:
        """Get a specific CDP client by ID"""
        return self.connections.get(connection_id)

    def switch_active(self, connection_id: str) -> str:
        """Switch the active connection"""
        if connection_id not in self.connections:
            return f"Error: Connection '{connection_id}' not found"

        self.active_connection_id = connection_id
        return f"✓ Switched to connection '{connection_id}'"

    def list_connections(self) -> Dict[str, Dict]:
        """List all connections with their status"""
        result = {}
        for conn_id, cdp in self.connections.items():
            result[conn_id] = {
                "url": cdp.ws_url,
                "active": conn_id == self.active_connection_id,
                "paused": cdp.paused_data is not None
            }
        return result

    def get_connection(self, connection_id: Optional[str] = None) -> Optional[CDPClient]:
        """
        Get a CDP connection by ID, or the active connection if ID is None.

        Args:
            connection_id: Optional connection ID. If None, returns active connection.

        Returns:
            CDPClient instance or None if not found
        """
        if connection_id is None:
            return self.get_active()
        return self.get(connection_id)


class ChromeDevToolsClient:
    """Client wrapper for Chrome DevTools MCP server"""

    def __init__(self):
        self.session: Optional[ClientSession] = None
        self.exit_stack = None
        self._snapshot_cache = None
        self._snapshot_cache_time = 0
        self.cdp_manager = CDPConnectionManager()  # Multi-instance CDP manager

    async def connect(self):
        """Connect to the Chrome DevTools MCP server"""
        logger.info(f"Connecting to Chrome DevTools MCP server: {CHROME_DEVTOOLS_COMMAND} {' '.join(CHROME_DEVTOOLS_ARGS)}")

        try:
            server_params = StdioServerParameters(
                command=CHROME_DEVTOOLS_COMMAND,
                args=CHROME_DEVTOOLS_ARGS,
                env=None
            )

            logger.debug("Creating stdio client...")
            stdio_transport = await stdio_client(server_params).__aenter__()
            self.exit_stack = stdio_transport

            stdio, write = stdio_transport
            self.session = ClientSession(stdio, write)
            await self.session.__aenter__()

            # Initialize the session
            logger.debug("Initializing MCP session...")
            await self.session.initialize()

            logger.info("✓ Connected to Chrome DevTools MCP server")

            # Try to auto-connect to default Chrome instance (optional)
            # Disabled for now - let users connect manually to avoid hanging
            # try:
            #     logger.debug("Attempting auto-connect to Chrome at localhost:9222...")
            #     await self.cdp_manager.connect("default", "localhost", 9222)
            #     logger.info("✓ Auto-connected to Chrome at localhost:9222")
            # except Exception as e:
            #     logger.debug(f"Could not auto-connect to Chrome: {e}")
            #     logger.debug("Chrome can be connected manually later with chrome_connect()")
            logger.debug("Auto-connect disabled - use chrome_connect() to connect to Chrome")
        except Exception as e:
            logger.error(f"Failed to connect to Chrome DevTools MCP server: {e}", exc_info=True)
            raise

    async def disconnect(self):
        """Disconnect from the Chrome DevTools MCP server and all CDP connections"""
        await self.cdp_manager.disconnect_all()
        if self.session:
            await self.session.__aexit__(None, None, None)
        if self.exit_stack:
            await self.exit_stack.__aexit__(None, None, None)

    async def call_tool(self, tool_name: str, arguments: dict) -> Any:
        """Call a tool on the Chrome DevTools MCP server"""
        if not self.session:
            raise RuntimeError("Not connected to Chrome DevTools server")

        result = await self.session.call_tool(tool_name, arguments)
        return result

    async def evaluate(self, script: str) -> str:
        """Evaluate JavaScript and return result"""
        result = await self.call_tool("evaluate_script", {"script": script})
        content = result.content if hasattr(result, 'content') else result
        if isinstance(content, list) and len(content) > 0:
            return content[0].text if hasattr(content[0], 'text') else str(content[0])
        return str(content)

    async def call_cdp(self, method: str, params: dict = None) -> dict:
        """
        Call Chrome DevTools Protocol method directly.

        Args:
            method: CDP method name (e.g., "Debugger.enable", "Debugger.setBreakpoint")
            params: Method parameters as dict

        Returns:
            Result from CDP as dict
        """
        # Use evaluate_script to call CDP via chrome.debugger API
        # Note: This assumes Chrome DevTools MCP server exposes CDP access
        # We'll use the underlying evaluate to send CDP commands

        if params is None:
            params = {}

        # For now, we'll try using evaluate_script with a CDP command wrapper
        # This may need adjustment based on how Chrome DevTools MCP exposes CDP
        script = f"""
        (async () => {{
            // Try to access CDP if available
            if (window.__cdp) {{
                return await window.__cdp.send('{method}', {json.dumps(params)});
            }}
            throw new Error('CDP not available - this requires Chrome DevTools MCP server with CDP access');
        }})()
        """

        result = await self.evaluate(script)
        try:
            return json.loads(result)
        except json.JSONDecodeError:
            return {"error": "Failed to parse CDP response", "raw": result}

    async def get_snapshot(self) -> str:
        """Get accessibility snapshot"""
        result = await self.call_tool("take_snapshot", {})
        content = result.content if hasattr(result, 'content') else result
        if isinstance(content, list) and len(content) > 0:
            return content[0].text if hasattr(content[0], 'text') else str(content[0])
        return str(content)

    async def find_element_ref(self, selector: str, index: int = 0) -> Tuple[Optional[str], str]:
        """
        Find element ref by CSS selector for use with native Chrome DevTools tools.
        Returns (ref, debug_info) tuple.

        Strategy:
        1. Mark matching elements with temporary data attribute
        2. Take snapshot to get refs
        3. Find marked elements in snapshot
        4. Clean up markers
        5. Return ref
        """
        try:
            # Generate unique marker ID
            marker_id = f"mcp-wrapper-{id(self)}-{index}"

            # Escape selector for JavaScript
            escaped_selector = selector.replace("'", "\\'")

            # Step 1: Mark the target element
            mark_script = f"""
            (() => {{
                const elements = document.querySelectorAll('{escaped_selector}');
                if (elements.length === 0) return {{ success: false, error: 'No elements found' }};
                if ({index} >= elements.length) return {{ success: false, error: `Only ${{elements.length}} found` }};

                const target = elements[{index}];
                target.setAttribute('data-mcp-marker', '{marker_id}');

                return {{
                    success: true,
                    tag: target.tagName.toLowerCase(),
                    text: target.textContent.trim().substring(0, 50)
                }};
            }})()
            """

            mark_result = await self.evaluate(mark_script)
            mark_data = json.loads(mark_result)

            if not mark_data.get('success'):
                return None, mark_data.get('error', 'Unknown error')

            # Step 2: Take snapshot to get refs
            snapshot_text = await self.get_snapshot()

            # Step 3: Find the marker in snapshot and extract ref
            # The snapshot format has lines like: "- textbox "username" [ref=1234]"
            # We need to find our marker attribute
            ref = None
            debug_info = f"<{mark_data['tag']}>"

            # Look for data-mcp-marker in the snapshot
            # The snapshot might show it as an attribute or in the element description
            pattern = rf'\[ref=(\d+)\]'

            # Split snapshot into lines and search
            lines = snapshot_text.split('\n')
            for i, line in enumerate(lines):
                # Look for our marker ID in this line or nearby lines
                if marker_id in line or marker_id.replace('-', '') in line:
                    # Try to find ref in this line
                    match = re.search(pattern, line)
                    if match:
                        ref = match.group(1)
                        break
                    # Check next few lines in case ref is on a different line
                    for j in range(i, min(i + 5, len(lines))):
                        match = re.search(pattern, lines[j])
                        if match:
                            ref = match.group(1)
                            break
                    if ref:
                        break

            # Step 4: Clean up marker
            cleanup_script = f"""
            (() => {{
                const el = document.querySelector('[data-mcp-marker="{marker_id}"]');
                if (el) el.removeAttribute('data-mcp-marker');
            }})()
            """
            await self.evaluate(cleanup_script)

            if ref:
                return ref, f"{debug_info} [ref={ref}]"
            else:
                # Fallback: return debug info without ref
                return None, f"{debug_info} (ref not found in snapshot - falling back to JavaScript)"

        except Exception as e:
            return None, f"Error finding ref: {str(e)}"


# Initialize FastMCP server
mcp = FastMCP("Chrome DevTools Wrapper")

# Global client instance
chrome_client: Optional[ChromeDevToolsClient] = None


async def ensure_chrome_client():
    """Ensure chrome_client is initialized, creating it if necessary"""
    global chrome_client
    if chrome_client is None:
        logger.info("Initializing ChromeDevToolsClient...")
        try:
            chrome_client = ChromeDevToolsClient()
            await chrome_client.connect()
            logger.info("ChromeDevToolsClient initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize ChromeDevToolsClient: {e}", exc_info=True)
            raise
    return chrome_client


def analyze_query_elements_data(elements_json: dict) -> str:
    """
    Analyze query_elements JSON data and provide specific narrowing suggestions.
    This is deterministic - we control the JSON format.
    """
    elements = elements_json.get('elements', [])
    if not elements:
        return "No elements found"

    # Collect class, id, and tag data
    classes = []
    ids = []
    tags = []

    for el in elements:
        if el.get('classes'):
            classes.extend(el['classes'])
        if el.get('id'):
            ids.append(el['id'])
        if el.get('tag'):
            tags.append(el['tag'])

    suggestions = []
    total = len(elements)
    suggestions.append(f"Found {total} elements. Here's how to narrow it down:")

    # Suggest specific classes (most common)
    if classes:
        class_counts = {}
        for c in classes:
            class_counts[c] = class_counts.get(c, 0) + 1
        top_classes = sorted(class_counts.items(), key=lambda x: x[1], reverse=True)[:3]
        class_suggestions = [f'.{c[0]} ({c[1]} elements)' for c in top_classes]
        suggestions.append(f"  Most common classes: {', '.join(class_suggestions)}")

    # Suggest specific IDs
    if ids:
        id_suggestions = [f'#{i}' for i in ids[:5]]
        suggestions.append(f"  IDs available: {', '.join(id_suggestions)}")

    # Suggest tag narrowing
    if tags:
        tag_counts = {}
        for t in tags:
            tag_counts[t] = tag_counts.get(t, 0) + 1
        if len(tag_counts) > 1:
            tag_list = [f'{t} ({c})' for t, c in sorted(tag_counts.items(), key=lambda x: x[1], reverse=True)[:5]]
            suggestions.append(f"  Tag breakdown: {', '.join(tag_list)}")

    suggestions.append(f"\nTry: Combine selector with a class (e.g., 'yourselector.{top_classes[0][0] if classes else 'classname'}')")
    suggestions.append(f"Or: Reduce limit parameter (currently showing {total} elements)")

    return "\n".join(suggestions)


def check_result_size(result: str, max_size: int = MAX_RESULT_SIZE, context: str = "", analysis_data: Any = None) -> str:
    """
    Check if result is too large and return helpful error if so.

    Instead of truncating (which wastes tokens on useless partial data),
    reject oversized results with a smart error message that analyzes the data
    and provides specific suggestions for narrowing the query.

    Args:
        result: The result string to check
        max_size: Maximum allowed size in characters
        context: Tool context for suggestions (query_elements, console_logs, etc.)
        analysis_data: Optional structured data for deterministic analysis (e.g., JSON from query_elements)
    """
    if len(result) <= max_size:
        return result

    # Result is too large - provide smart suggestions
    size_kb = len(result) / 1024
    limit_kb = max_size / 1024

    # Perform deterministic analysis if we have structured data
    smart_analysis = ""
    if context == "query_elements" and analysis_data:
        smart_analysis = analyze_query_elements_data(analysis_data)
    else:
        # Generic but helpful suggestions for tools where we don't control the format
        generic_suggestions = {
            "console_logs": """Too many console messages.

Try filtering by level:
  - get_console_logs(filter_level='error') - Only errors
  - get_console_logs(filter_level='warning') - Warnings and errors
  - get_console_logs(filter_level='info') - Info, warnings, and errors""",

            "network_requests": """Too many network requests.

Try filtering by status:
  - get_network_requests(filter_status='4xx') - Client errors (404, etc.)
  - get_network_requests(filter_status='5xx') - Server errors
  - get_network_requests(filter_status='2xx') - Successful requests
  - get_network_requests(filter_status='3xx') - Redirects""",

            "execute_script": """Script returned too much data.

Try limiting the result in JavaScript:
  - Use .slice(0, 10) to get first 10 items
  - Use .filter() to get only specific items
  - Return summary data instead of full objects
  - Select only needed fields: .map(x => ({id: x.id, name: x.name}))""",

            "default": "Try to be more specific in your query or filter the results"
        }
        smart_analysis = generic_suggestions.get(context, generic_suggestions["default"])

    error_msg = f"""Result too large: {size_kb:.1f}KB (limit: {limit_kb:.1f}KB)

Returning {len(result):,} characters would waste tokens on potentially incomplete data.

{smart_analysis}

Size: {len(result):,} chars (max: {max_size:,})
"""

    return error_msg


#
# Chrome Connection Management Tools
#

@mcp.tool()
async def chrome_connect(port: int = 9222, connection_id: str = "default", host: str = "localhost") -> str:
    """
    Connect to a Chrome instance running with remote debugging enabled.

    Chrome must be launched with --remote-debugging-port flag.
    You can connect to multiple Chrome instances by specifying different connection_ids.

    Args:
        port: Chrome remote debugging port (default: 9222)
        connection_id: Unique identifier for this connection (default: "default")
        host: Chrome host (default: "localhost")

    Returns:
        Success message with connection details

    Example:
        chrome_connect(9222, "main")           # Connect to Chrome on port 9222
        chrome_connect(9300, "secondary")      # Connect to another Chrome on port 9300
    """
    logger.info(f"chrome_connect called: port={port}, connection_id={connection_id}, host={host}")

    await ensure_chrome_client()

    try:
        logger.debug(f"Calling cdp_manager.connect with connection_id={connection_id}, host={host}, port={port}")
        result = await chrome_client.cdp_manager.connect(connection_id, host, port)
        logger.info(f"✓ Successfully connected to Chrome at {host}:{port} (connection_id={connection_id})")
        return result
    except Exception as e:
        logger.error(f"Failed to connect to Chrome at {host}:{port}: {e}", exc_info=True)
        return f"Error connecting to Chrome: {str(e)}\n\nMake sure Chrome is running with:\nchrome --remote-debugging-port={port}"


@mcp.tool()
async def chrome_launch(debug_port: int = 9222, headless: bool = False, user_data_dir: Optional[str] = None, extra_args: Optional[str] = None, connection_id: str = "auto") -> str:
    """
    Launch a new Chrome instance with remote debugging enabled.

    Automatically connects to the launched instance after startup.

    Args:
        debug_port: Remote debugging port (default: 9222)
        headless: Run in headless mode (default: False)
        user_data_dir: Custom user data directory path (optional, creates temp if not specified)
        extra_args: Additional Chrome flags as space-separated string (e.g., "--disable-gpu --window-size=1920,1080")
        connection_id: Connection ID for this instance (default: auto-generate from port)

    Returns:
        Success message with process ID and connection details

    Example:
        chrome_launch(9300)                                    # Launch on port 9300
        chrome_launch(9400, headless=True)                     # Headless mode
        chrome_launch(9500, extra_args="--incognito --start-maximized")
    """
    logger.info(f"chrome_launch called: port={debug_port}, headless={headless}, user_data_dir={user_data_dir}, extra_args={extra_args}, connection_id={connection_id}")

    await ensure_chrome_client()

    import subprocess
    import platform
    import tempfile
    import os

    # Determine Chrome executable path
    system = platform.system()
    logger.debug(f"Platform: {system}")

    if system == "Darwin":  # macOS
        chrome_path = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
    elif system == "Linux":
        chrome_path = "google-chrome"
    elif system == "Windows":
        chrome_path = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
    else:
        error_msg = f"Error: Unsupported platform: {system}"
        logger.error(error_msg)
        return error_msg

    logger.info(f"Chrome executable path: {chrome_path}")

    # Build command
    cmd = [chrome_path, f"--remote-debugging-port={debug_port}"]

    # Add user data dir (required to avoid conflicts with existing Chrome)
    if user_data_dir:
        cmd.append(f"--user-data-dir={user_data_dir}")
        logger.debug(f"Using user data dir: {user_data_dir}")
    else:
        temp_dir = tempfile.mkdtemp(prefix="chrome-debug-")
        cmd.append(f"--user-data-dir={temp_dir}")
        logger.debug(f"Created temp user data dir: {temp_dir}")

    # Add headless mode
    if headless:
        cmd.append("--headless=new")
        logger.debug("Headless mode enabled")

    # Add extra args
    if extra_args:
        cmd.extend(extra_args.split())
        logger.debug(f"Extra args: {extra_args}")

    logger.info(f"Launching Chrome with command: {' '.join(cmd)}")

    try:
        # Launch Chrome
        process = subprocess.Popen(
            cmd,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            start_new_session=True
        )

        logger.info(f"Chrome process started with PID: {process.pid}")

        # Wait a bit for Chrome to start
        logger.debug("Waiting 2 seconds for Chrome to initialize...")
        await asyncio.sleep(2)

        # Auto-generate connection ID if needed
        if connection_id == "auto":
            connection_id = f"chrome-{debug_port}"
            logger.debug(f"Auto-generated connection ID: {connection_id}")

        # Connect to the launched instance
        try:
            logger.info(f"Attempting to connect to Chrome at localhost:{debug_port} with connection_id={connection_id}")
            await chrome_client.cdp_manager.connect(connection_id, "localhost", debug_port)
            success_msg = f"✓ Chrome launched successfully\n\nProcess ID: {process.pid}\nDebug Port: {debug_port}\nConnection ID: {connection_id}\n\nUse chrome_list_connections() to see all connections."
            logger.info(f"✓ Successfully connected to Chrome (PID: {process.pid}, port: {debug_port})")
            return success_msg
        except Exception as e:
            error_msg = f"⚠️  Chrome launched (PID: {process.pid}) but connection failed: {e}\n\nTry chrome_connect({debug_port}, \"{connection_id}\") manually after a few seconds."
            logger.warning(f"Chrome launched but connection failed: {e}")
            return error_msg

    except Exception as e:
        error_msg = f"Error launching Chrome: {str(e)}"
        logger.error(error_msg, exc_info=True)
        return error_msg


@mcp.tool()
async def chrome_list_connections() -> str:
    """
    List all active Chrome connections.

    Shows connection ID, WebSocket URL, active status, and paused state for each connection.

    Returns:
        Formatted list of all connections
    """
    await ensure_chrome_client()

    connections = chrome_client.cdp_manager.list_connections()

    if not connections:
        return "No active Chrome connections.\n\nUse chrome_connect() or chrome_launch() to create a connection."

    result = "Chrome Connections:\n"
    result += "=" * 80 + "\n\n"

    for conn_id, info in connections.items():
        marker = ">>> " if info["active"] else "    "
        result += f"{marker}[{conn_id}]\n"
        result += f"    URL: {info['url']}\n"
        result += f"    Active: {info['active']}\n"
        result += f"    Paused: {info['paused']}\n\n"

    if len(connections) > 1:
        result += "Use chrome_switch_connection(connection_id) to change the active connection.\n"
    result += "Use chrome_disconnect(connection_id) to close a connection."

    return result


@mcp.tool()
async def chrome_switch_connection(connection_id: str) -> str:
    """
    Switch the active Chrome connection.

    All debugger and DOM tools will use the active connection.

    Args:
        connection_id: ID of the connection to make active

    Returns:
        Success message
    """
    await ensure_chrome_client()

    result = chrome_client.cdp_manager.switch_active(connection_id)
    return result


@mcp.tool()
async def chrome_disconnect(connection_id: str) -> str:
    """
    Disconnect from a specific Chrome instance.

    If you disconnect the active connection, the next available connection
    will become active automatically.

    Args:
        connection_id: ID of the connection to disconnect

    Returns:
        Success message
    """
    await ensure_chrome_client()

    try:
        result = await chrome_client.cdp_manager.disconnect(connection_id)
        return result
    except Exception as e:
        return f"Error disconnecting: {str(e)}"


#
# DOM Interaction Tools
#

@mcp.tool()
async def query_elements(selector: str, limit: int = 20, max_depth: Optional[int] = None, connection_id: Optional[str] = None) -> str:
    """
    Find elements by CSS selector and return their details.

    Use this to explore the page and see what elements are available.
    Returns tag name, text content, id, classes, and visibility for each match.

    Automatically filters out deeply nested elements (depth > 3 from body) to prevent
    returning the entire page when using broad selectors like "div" or "*".
    This forces you to use specific selectors and keeps results compact.

    Elements at max depth that have children show inline elision messages:
    "[ELIDED 5 DIRECT CHILD ELEMENTS (12 elements total). INCREASE SELECTOR SPECIFICITY]"

    Examples:
    - query_elements("button") - Find all buttons (max depth 3)
    - query_elements(".login-form input") - Find inputs in login form
    - query_elements("#username") - Find element with id="username"
    - query_elements("div", max_depth=8) - Include deeper divs (max 10)

    Args:
        selector: CSS selector to query (e.g., ".class", "#id", "button")
        limit: Maximum number of elements to return (default: 20)
        max_depth: Maximum DOM depth from body (default: 3, hard limit: 10)
        connection_id: Chrome connection to use (uses default if not specified)

    """
    await ensure_chrome_client()

    try:
        # Use configured max depth if not specified
        if max_depth is None:
            max_depth = MAX_DOM_DEPTH

        # Enforce hard limit
        if max_depth > HARD_MAX_DOM_DEPTH:
            max_depth = HARD_MAX_DOM_DEPTH

        # Escape single quotes in selector
        escaped_selector = selector.replace("'", "\\'")

        script = f"""
        (() => {{
            const maxDepth = {max_depth};

            // Calculate depth from body
            function getDepth(el) {{
                let depth = 0;
                let current = el;
                while (current && current !== document.body) {{
                    depth++;
                    current = current.parentElement;
                }}
                return depth;
            }}

            // Count total descendants
            function countDescendants(el) {{
                let count = 0;
                function countRecursive(node) {{
                    for (const child of node.children) {{
                        count++;
                        countRecursive(child);
                    }}
                }}
                countRecursive(el);
                return count;
            }}

            // Get all matching elements
            const allElements = Array.from(document.querySelectorAll('{escaped_selector}'));

            // Filter by depth
            const elementsWithDepth = allElements.map(el => ({{
                element: el,
                depth: getDepth(el)
            }}));

            const filteredElements = elementsWithDepth.filter(item => item.depth <= maxDepth);
            const filtered = allElements.length - filteredElements.length;

            // Apply limit and extract data
            const limit = {limit};
            const limitedElements = filteredElements.slice(0, limit);

            return {{
                found: allElements.length,
                foundAfterDepthFilter: filteredElements.length,
                filteredByDepth: filtered,
                maxDepth: maxDepth,
                elements: limitedElements.map((item, idx) => {{
                    const el = item.element;
                    const rect = el.getBoundingClientRect();

                    // If this element is at max depth, count its children
                    let childInfo = null;
                    if (item.depth === maxDepth && el.children.length > 0) {{
                        childInfo = {{
                            directChildren: el.children.length,
                            totalDescendants: countDescendants(el)
                        }};
                    }}

                    return {{
                        index: idx,
                        selector: '{escaped_selector}',
                        tag: el.tagName.toLowerCase(),
                        text: el.textContent.trim().substring(0, 100),
                        id: el.id || null,
                        classes: el.className ? el.className.split(' ').filter(c => c) : [],
                        visible: el.offsetParent !== null,
                        depth: item.depth,
                        childInfo: childInfo,
                        position: {{
                            x: Math.round(rect.x),
                            y: Math.round(rect.y),
                            width: Math.round(rect.width),
                            height: Math.round(rect.height)
                        }},
                        attributes: {{
                            type: el.type || null,
                            name: el.name || null,
                            placeholder: el.placeholder || null,
                            value: el.value !== undefined ? el.value.substring(0, 100) : null
                        }}
                    }};
                }})
            }};
        }})()
        """

        result = await chrome_client.evaluate(script)

        # Parse the JSON result
        try:
            data = json.loads(result)
            if data.get('found', 0) == 0:
                return f"No elements found matching selector: {selector}"

            # Build output header
            found_total = data['found']
            found_filtered = data['foundAfterDepthFilter']
            filtered_count = data['filteredByDepth']
            max_depth_used = data['maxDepth']

            if filtered_count > 0:
                output = [f"Found {found_total} element(s) matching '{selector}'"]
                output.append(f"Filtered out {filtered_count} deeply nested element(s) (depth > {max_depth_used})")
                output.append(f"Showing first {min(found_filtered, limit)} of {found_filtered} remaining:")
            else:
                output = [f"Found {found_total} element(s) matching '{selector}' (showing first {min(found_total, limit)}):"]

            output.append("")

            for el in data.get('elements', []):
                depth_info = f" (depth: {el['depth']})" if el.get('depth') is not None else ""
                output.append(f"[{el['index']}] <{el['tag']}>{depth_info}")
                if el.get('id'):
                    output.append(f"    ID: #{el['id']}")
                if el.get('classes'):
                    output.append(f"    Classes: {', '.join(el['classes'])}")
                if el.get('text'):
                    output.append(f"    Text: {el['text']}")
                if el.get('attributes'):
                    attrs = el['attributes']
                    relevant_attrs = {k: v for k, v in attrs.items() if v is not None}
                    if relevant_attrs:
                        output.append(f"    Attributes: {relevant_attrs}")
                output.append(f"    Visible: {el['visible']}")

                # Show inline elision message if this element has children that were filtered
                if el.get('childInfo'):
                    child_info = el['childInfo']
                    direct = child_info['directChildren']
                    total = child_info['totalDescendants']
                    output.append(f"    [ELIDED {direct} DIRECT CHILD ELEMENT{'S' if direct != 1 else ''} ({total} element{'s' if total != 1 else ''} total). INCREASE SELECTOR SPECIFICITY]")

                output.append("")

            # No need for generic tip - inline elision messages are more specific

            return check_result_size("\n".join(output), context="query_elements", analysis_data=data)
        except json.JSONDecodeError:
            return check_result_size(result, context="query_elements")

    except Exception as e:
        return f"Error querying elements: {str(e)}"


@mcp.tool()
async def click_element(selector: str, index: int = 0, connection_id: Optional[str] = None) -> str:
    """
    Click an element matching the CSS selector.

    Use query_elements first to verify the element exists and get the correct index.

    Examples:
    - click_element("button.submit") - Click first submit button
    - click_element(".item", index=2) - Click third element with class "item"

    Args:
        selector: CSS selector for the element to click
        index: Which matching element to click if multiple exist (default: 0 = first)
        connection_id: Chrome connection to use (uses default if not specified)

    """
    await ensure_chrome_client()

    try:
        # Try to get element ref for native tool
        ref, debug_info = await chrome_client.find_element_ref(selector, index)

        if ref:
            # Use native Chrome DevTools click tool
            try:
                result = await chrome_client.call_tool("click", {"elementRef": ref})
                return f"✓ Clicked {debug_info}"
            except Exception as e:
                # Fall back to JavaScript if native tool fails
                if DEBUG:
                    print(f"Native click failed, falling back to JavaScript: {e}")

        # Fallback: Use JavaScript click
        escaped_selector = selector.replace("'", "\\'")
        script = f"""
        (() => {{
            const elements = document.querySelectorAll('{escaped_selector}');
            if (elements.length === 0) {{
                return {{ success: false, error: 'No elements found matching selector' }};
            }}
            if ({index} >= elements.length) {{
                return {{ success: false, error: `Only ${{elements.length}} element(s) found, index {index} out of range` }};
            }}

            const element = elements[{index}];
            element.click();

            return {{
                success: true,
                clicked: `<${{element.tagName.toLowerCase()}}> at index {index}`,
                text: element.textContent.trim().substring(0, 50)
            }};
        }})()
        """

        result = await chrome_client.evaluate(script)

        try:
            data = json.loads(result)
            if data.get('success'):
                return f"✓ Clicked {data['clicked']}: {data.get('text', '')}"
            else:
                return f"✗ Failed: {data.get('error', 'Unknown error')}"
        except json.JSONDecodeError:
            return result

    except Exception as e:
        return f"Error clicking element: {str(e)}"


@mcp.tool()
async def fill_element(selector: str, text: str, index: int = 0, submit: bool = False, connection_id: Optional[str] = None) -> str:
    """
    Fill text into an input element matching the CSS selector.

    Use query_elements first to verify the input exists and get the correct index.

    Examples:
    - fill_element("#username", "admin")
    - fill_element("input[name='password']", "secret123")
    - fill_element(".search-input", "query", submit=True) - Fill and press Enter

    Args:
        selector: CSS selector for the input element
        text: Text to enter into the field
        index: Which matching element to fill if multiple exist (default: 0 = first)
        submit: Whether to press Enter after filling (default: False)
        connection_id: Chrome connection to use (uses default if not specified)

    """
    await ensure_chrome_client()

    try:
        # Try to get element ref for native tool
        ref, debug_info = await chrome_client.find_element_ref(selector, index)

        if ref:
            # Use native Chrome DevTools fill tool
            try:
                result = await chrome_client.call_tool("fill", {
                    "elementRef": ref,
                    "value": text
                })

                # Handle submit if requested
                if submit:
                    # Press Enter using keyboard
                    await chrome_client.call_tool("press_key", {"key": "Enter"})
                    return f"✓ Filled {debug_info} and submitted"

                return f"✓ Filled {debug_info}"
            except Exception as e:
                # Fall back to JavaScript if native tool fails
                if DEBUG:
                    print(f"Native fill failed, falling back to JavaScript: {e}")

        # Fallback: Use JavaScript
        escaped_selector = selector.replace("'", "\\'")
        escaped_text = text.replace("'", "\\'").replace("\n", "\\n")

        script = f"""
        (() => {{
            const elements = document.querySelectorAll('{escaped_selector}');
            if (elements.length === 0) {{
                return {{ success: false, error: 'No elements found matching selector' }};
            }}
            if ({index} >= elements.length) {{
                return {{ success: false, error: `Only ${{elements.length}} element(s) found, index {index} out of range` }};
            }}

            const element = elements[{index}];

            // Set value
            element.value = '{escaped_text}';

            // Trigger input event
            element.dispatchEvent(new Event('input', {{ bubbles: true }}));
            element.dispatchEvent(new Event('change', {{ bubbles: true }}));

            // Submit if requested
            if ({str(submit).lower()}) {{
                element.dispatchEvent(new KeyboardEvent('keypress', {{ key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true }}));
            }}

            return {{
                success: true,
                filled: `<${{element.tagName.toLowerCase()}}> at index {index}`,
                type: element.type || 'text'
            }};
        }})()
        """

        result = await chrome_client.evaluate(script)

        try:
            data = json.loads(result)
            if data.get('success'):
                submit_msg = " and submitted" if submit else ""
                return f"✓ Filled {data['filled']} ({data['type']}){submit_msg}"
            else:
                return f"✗ Failed: {data.get('error', 'Unknown error')}"
        except json.JSONDecodeError:
            return result

    except Exception as e:
        return f"Error filling element: {str(e)}"


@mcp.tool(name="_internal_execute_script")
async def _execute_script(script: str) -> str:
    """
    INTERNAL ONLY - Execute arbitrary JavaScript.

    This tool is hidden and should not be used directly.
    Use proper debugging tools instead:
    - debugger_enable() to start debugging
    - debugger_set_breakpoint() to set breakpoints
    - debugger_evaluate_on_call_frame() to evaluate expressions when paused

    Args:
        script: JavaScript code to execute
    """
    await ensure_chrome_client()

    try:
        # Wrap script to ensure it returns a value
        wrapped_script = f"(() => {{ return {script}; }})()"
        result = await chrome_client.evaluate(wrapped_script)
        return check_result_size(result, context="execute_script")
    except Exception as e:
        return f"Error executing script: {str(e)}"


@mcp.tool()
async def get_console_logs(filter_level: str = "all", connection_id: Optional[str] = None) -> str:
    """
    Get console log messages from the browser.

    Use this to debug JavaScript errors and see console output.

    Args:
        filter_level: Filter by level - "all", "error", "warning", "info", or "debug"
        connection_id: Chrome connection to use (uses default if not specified)
    """
    await ensure_chrome_client()

    try:
        result = await chrome_client.call_tool(
            "list_console_messages",
            {"filterLevel": filter_level}
        )

        content = result.content if hasattr(result, 'content') else result
        if isinstance(content, list) and len(content) > 0:
            text_content = content[0].text if hasattr(content[0], 'text') else str(content[0])
        else:
            text_content = str(content)

        return check_result_size(text_content, context="console_logs")
    except Exception as e:
        return f"Error getting console logs: {str(e)}"


@mcp.tool()
async def navigate(url: str, connection_id: Optional[str] = None) -> str:
    """
    Navigate to a URL.

    Args:
        url: URL to navigate to (e.g., "https://example.com")
    """
    await ensure_chrome_client()

    try:
        result = await chrome_client.call_tool(
            "navigate_page",
            {"url": url}
        )

        return f"✓ Navigated to {url}"
    except Exception as e:
        return f"Error navigating: {str(e)}"


@mcp.tool()
async def get_network_requests(filter_status: Optional[str] = None, connection_id: Optional[str] = None) -> str:
    """
    Get network requests made by the browser.

    Use this to debug API calls and network issues.

    Args:
        filter_status: Optional filter by HTTP status code (e.g., "200", "404", "5xx")
    """
    await ensure_chrome_client()

    try:
        arguments = {}
        if filter_status:
            arguments["filterStatus"] = filter_status

        result = await chrome_client.call_tool(
            "list_network_requests",
            arguments
        )

        content = result.content if hasattr(result, 'content') else result
        if isinstance(content, list) and len(content) > 0:
            text_content = content[0].text if hasattr(content[0], 'text') else str(content[0])
        else:
            text_content = str(content)

        return check_result_size(text_content, context="network_requests")
    except Exception as e:
        return f"Error getting network requests: {str(e)}"


#  ============================================================================
# DEBUGGER TOOLS - Chrome DevTools Protocol Debugger Domain
# ============================================================================
#
# These tools expose the CDP Debugger for proper debugging workflows.
# Agents must:
# 1. Enable the debugger
# 2. Set breakpoints at specific lines in source files
# 3. Trigger the code path (click button, navigate, etc.)
# 4. When paused, inspect call stack and variables
# 5. Step through code or resume execution
#
# This forces proper debugging instead of random code execution.
#

@mcp.tool()
async def debugger_enable(connection_id: Optional[str] = None) -> str:
    """
    Enable the JavaScript debugger.

    This must be called before any other debugger operations.
    Enables debugging features like breakpoints, pausing, and stepping.

    Args:
        connection_id: Chrome connection to use (uses default if not specified)

    Returns:
        Success message with debugger status
    """
    await ensure_chrome_client()

    cdp = chrome_client.cdp_manager.get_connection(connection_id)
    if not cdp:
        conn_msg = f" '{connection_id}'" if connection_id else ""
        return f"Error: No Chrome connection{conn_msg} found. Use chrome_connect() or chrome_launch() first."

    try:
        # Enable the Debugger domain in CDP
        await cdp.send_command("Debugger.enable", {})

        return "✓ Debugger enabled successfully\n\nYou can now:\n- Set breakpoints with debugger_set_breakpoint()\n- Pause execution with debugger_pause()\n- Configure exception breaking with debugger_set_pause_on_exceptions()"
    except Exception as e:
        return f"Error enabling debugger: {str(e)}"


@mcp.tool()
async def debugger_set_breakpoint(url: str, line_number: int, column_number: int = 0, condition: Optional[str] = None, connection_id: Optional[str] = None) -> str:
    """
    Set a breakpoint at a specific line in a source file.

    The debugger must be enabled first (call debugger_enable()).

    When code execution reaches this breakpoint, it will pause, allowing you to:
    - Inspect the call stack (debugger_get_call_stack)
    - Evaluate expressions in the current scope (debugger_evaluate_on_call_frame)
    - Step through code (debugger_step_over, debugger_step_into, debugger_step_out)

    Args:
        url: Full URL or path of the script (e.g., "http://localhost:3000/main.js" or "file:///src/app.js")
        line_number: Line number to break on (1-indexed)
        column_number: Column number (0-indexed, default: 0)
        condition: Optional conditional expression (breakpoint only triggers if true)
        connection_id: Chrome connection to use (uses default if not specified)

    Returns:
        Breakpoint ID and location confirmation

    Example:
        debugger_set_breakpoint("http://localhost:3000/app.js", 42)
        debugger_set_breakpoint("http://localhost:3000/app.js", 42, condition="user.id === 123")
        debugger_set_breakpoint("app.js", 42, connection_id="staging")
    """
    await ensure_chrome_client()

    cdp = chrome_client.cdp_manager.get_connection(connection_id)
    if not cdp:
        conn_msg = f" '{connection_id}'" if connection_id else ""
        return f"Error: No Chrome connection{conn_msg} found. Use chrome_connect() or chrome_launch() first."

    try:
        # Set breakpoint using CDP
        params = {
            "url": url,
            "lineNumber": line_number - 1,  # CDP uses 0-indexed line numbers
            "columnNumber": column_number
        }

        if condition:
            params["condition"] = condition

        result = await cdp.send_command("Debugger.setBreakpointByUrl", params)

        breakpoint_id = result.get("breakpointId")
        locations = result.get("locations", [])

        # Store breakpoint info
        cdp.breakpoints[breakpoint_id] = {
            "url": url,
            "lineNumber": line_number,
            "columnNumber": column_number,
            "condition": condition
        }

        response = f"✓ Breakpoint set successfully\n\nBreakpoint ID: {breakpoint_id}\nURL: {url}\nLine: {line_number}"

        if condition:
            response += f"\nCondition: {condition}"

        if locations:
            loc = locations[0]
            actual_line = loc.get("lineNumber", 0) + 1  # Convert back to 1-indexed
            response += f"\n\nActual location: Line {actual_line}, Column {loc.get('columnNumber', 0)}"

        response += "\n\nTrigger the code path to pause at this breakpoint."

        return response
    except Exception as e:
        return f"Error setting breakpoint: {str(e)}"


@mcp.tool()
async def debugger_get_call_stack(connection_id: Optional[str] = None) -> str:
    """
    Get the current call stack when execution is paused.

    This only works when execution is paused at a breakpoint or after debugger_pause().

    Returns detailed information about each stack frame:
    - Function name
    - Script URL and location (line, column)
    - Scope chain
    - Call frame ID (needed for debugger_evaluate_on_call_frame)

    Returns:
        Call stack with frame details, or error if not paused
    """
    await ensure_chrome_client()

    cdp = chrome_client.cdp_manager.get_connection(connection_id)
    if not cdp:
        conn_msg = f" '{connection_id}'" if connection_id else ""
        return f"Error: No Chrome connection{conn_msg} found. Use chrome_connect() or chrome_launch() first."

    try:
        # Check if execution is paused
        if not cdp.paused_data:
            return "Not paused. Set a breakpoint with debugger_set_breakpoint() and trigger it, or use debugger_pause() to pause execution."

        call_frames = cdp.paused_data.get("callFrames", [])
        reason = cdp.paused_data.get("reason", "unknown")

        if not call_frames:
            return "Execution is paused but no call stack available."

        # Format call stack
        result = f"📍 Execution paused: {reason}\n\n"
        result += "Call Stack:\n"
        result += "=" * 60 + "\n\n"

        for i, frame in enumerate(call_frames):
            call_frame_id = frame.get("callFrameId", "unknown")
            func_name = frame.get("functionName") or "(anonymous)"
            location = frame.get("location", {})
            url = frame.get("url", "unknown")
            line_num = location.get("lineNumber", 0) + 1  # Convert to 1-indexed
            col_num = location.get("columnNumber", 0)

            result += f"[{i}] {func_name}\n"
            result += f"    Frame ID: {call_frame_id}\n"
            result += f"    Location: {url}:{line_num}:{col_num}\n"

            # Show scope chain
            scope_chain = frame.get("scopeChain", [])
            if scope_chain:
                scopes = [s.get("type", "unknown") for s in scope_chain]
                result += f"    Scopes: {', '.join(scopes)}\n"

            result += "\n"

        result += "\nUse debugger_evaluate_on_call_frame(call_frame_id, expression) to inspect variables."
        result += "\nUse debugger_step_over/into/out() to continue stepping, or debugger_resume() to continue execution."

        return result
    except Exception as e:
        return f"Error getting call stack: {str(e)}"


@mcp.tool()
async def debugger_evaluate_on_call_frame(call_frame_id: str, expression: str, connection_id: Optional[str] = None) -> str:
    """
    Evaluate a JavaScript expression in the context of a specific call frame.

    This only works when execution is paused. Use debugger_get_call_stack() to get call frame IDs.

    This is how you inspect variables and state when debugging:
    - Evaluate variable names: "user", "response.data", "this.state"
    - Check conditions: "user.id === 123"
    - Compute values: "items.length", "Math.max(...scores)"

    Args:
        call_frame_id: Call frame ID from debugger_get_call_stack() (e.g., "frame0")
        expression: JavaScript expression to evaluate in that frame's scope

    Returns:
        Result of the expression evaluation

    Example:
        # After pausing at a breakpoint:
        stack = debugger_get_call_stack()
        # See frame IDs in stack
        result = debugger_evaluate_on_call_frame("frame0", "user.name")
        result = debugger_evaluate_on_call_frame("frame0", "items.filter(i => i.active)")
    """
    await ensure_chrome_client()

    cdp = chrome_client.cdp_manager.get_connection(connection_id)
    if not cdp:
        conn_msg = f" '{connection_id}'" if connection_id else ""
        return f"Error: No Chrome connection{conn_msg} found. Use chrome_connect() or chrome_launch() first."

    try:
        # Check if execution is paused
        if not cdp.paused_data:
            return "Not paused. Cannot evaluate expressions outside of paused context."

        # Evaluate expression in the call frame
        params = {
            "callFrameId": call_frame_id,
            "expression": expression
        }

        result = await cdp.send_command("Debugger.evaluateOnCallFrame", params)

        if "exceptionDetails" in result:
            exception = result["exceptionDetails"]
            error_text = exception.get("text", "Unknown error")
            return f"❌ Evaluation error: {error_text}\n\nExpression: {expression}"

        result_obj = result.get("result", {})
        result_type = result_obj.get("type", "undefined")
        result_value = result_obj.get("value")
        result_description = result_obj.get("description")

        # Format the result nicely
        response = f"✓ Evaluated: {expression}\n\n"
        response += f"Type: {result_type}\n"

        if result_value is not None:
            response += f"Value: {json.dumps(result_value, indent=2)}"
        elif result_description:
            response += f"Description: {result_description}"
        else:
            response += f"Result: {result_type}"

        return response
    except Exception as e:
        return f"Error evaluating expression: {str(e)}"


@mcp.tool()
async def debugger_step_over(connection_id: Optional[str] = None) -> str:
    """
    Step over the current line (execute current line and pause at next line).

    Only works when execution is paused at a breakpoint.

    Use this to:
    - Execute the current line without stepping into function calls
    - Move to the next line in the current function
    - Skip over function calls while debugging

    Returns:
        Status message
    """
    await ensure_chrome_client()

    cdp = chrome_client.cdp_manager.get_connection(connection_id)
    if not cdp:
        conn_msg = f" '{connection_id}'" if connection_id else ""
        return f"Error: No Chrome connection{conn_msg} found. Use chrome_connect() or chrome_launch() first."

    try:
        if not cdp.paused_data:
            return "Not paused. Cannot step when execution is not paused."

        await cdp.send_command("Debugger.stepOver", {})
        return "✓ Stepped over. Execution will pause at next line.\nUse debugger_get_call_stack() to see current location."
    except Exception as e:
        return f"Error stepping over: {str(e)}"


@mcp.tool()
async def debugger_step_into(connection_id: Optional[str] = None) -> str:
    """
    Step into the current function call.

    Only works when execution is paused at a breakpoint on a function call.

    Use this to:
    - Enter a function and debug its internals
    - See how parameters are passed
    - Debug nested function calls

    Returns:
        Status message
    """
    await ensure_chrome_client()

    cdp = chrome_client.cdp_manager.get_connection(connection_id)
    if not cdp:
        conn_msg = f" '{connection_id}'" if connection_id else ""
        return f"Error: No Chrome connection{conn_msg} found. Use chrome_connect() or chrome_launch() first."

    try:
        if not cdp.paused_data:
            return "Not paused. Cannot step when execution is not paused."

        await cdp.send_command("Debugger.stepInto", {})
        return "✓ Stepped into function. Execution will pause at first line.\nUse debugger_get_call_stack() to see current location."
    except Exception as e:
        return f"Error stepping into: {str(e)}"


@mcp.tool()
async def debugger_step_out(connection_id: Optional[str] = None) -> str:
    """
    Step out of the current function (continue until function returns).

    Only works when execution is paused at a breakpoint inside a function.

    Use this to:
    - Finish executing current function
    - Return to the caller
    - Skip the rest of the current function

    Returns:
        Status message
    """
    await ensure_chrome_client()

    cdp = chrome_client.cdp_manager.get_connection(connection_id)
    if not cdp:
        conn_msg = f" '{connection_id}'" if connection_id else ""
        return f"Error: No Chrome connection{conn_msg} found. Use chrome_connect() or chrome_launch() first."

    try:
        if not cdp.paused_data:
            return "Not paused. Cannot step when execution is not paused."

        await cdp.send_command("Debugger.stepOut", {})
        return "✓ Stepped out of function. Execution will pause at caller.\nUse debugger_get_call_stack() to see current location."
    except Exception as e:
        return f"Error stepping out: {str(e)}"


@mcp.tool()
async def debugger_resume(connection_id: Optional[str] = None) -> str:
    """
    Resume execution after being paused at a breakpoint.

    Execution will continue until:
    - Another breakpoint is hit
    - An exception is thrown (if pause on exceptions is enabled)
    - debugger_pause() is called

    Returns:
        Status message
    """
    await ensure_chrome_client()

    cdp = chrome_client.cdp_manager.get_connection(connection_id)
    if not cdp:
        conn_msg = f" '{connection_id}'" if connection_id else ""
        return f"Error: No Chrome connection{conn_msg} found. Use chrome_connect() or chrome_launch() first."

    try:
        if not cdp.paused_data:
            return "Not paused. Nothing to resume."

        await cdp.send_command("Debugger.resume", {})
        return "✓ Execution resumed. Will pause at next breakpoint or exception."
    except Exception as e:
        return f"Error resuming: {str(e)}"


@mcp.tool()
async def debugger_pause(connection_id: Optional[str] = None) -> str:
    """
    Pause JavaScript execution as soon as possible.

    Use this to:
    - Pause execution to inspect current state
    - Interrupt long-running operations
    - Manually trigger a pause before a specific operation

    After pausing, use debugger_get_call_stack() to see where execution stopped.

    Returns:
        Status message
    """
    await ensure_chrome_client()

    cdp = chrome_client.cdp_manager.get_connection(connection_id)
    if not cdp:
        conn_msg = f" '{connection_id}'" if connection_id else ""
        return f"Error: No Chrome connection{conn_msg} found. Use chrome_connect() or chrome_launch() first."

    try:
        await cdp.send_command("Debugger.pause", {})
        return "✓ Pause requested. Execution will pause at next statement.\nUse debugger_get_call_stack() once paused."
    except Exception as e:
        return f"Error pausing: {str(e)}"


@mcp.tool()
async def debugger_remove_breakpoint(breakpoint_id: str, connection_id: Optional[str] = None) -> str:
    """
    Remove a previously set breakpoint.

    Args:
        breakpoint_id: Breakpoint ID returned from debugger_set_breakpoint()

    Returns:
        Confirmation message
    """
    await ensure_chrome_client()

    cdp = chrome_client.cdp_manager.get_connection(connection_id)
    if not cdp:
        conn_msg = f" '{connection_id}'" if connection_id else ""
        return f"Error: No Chrome connection{conn_msg} found. Use chrome_connect() or chrome_launch() first."

    try:
        await cdp.send_command("Debugger.removeBreakpoint", {"breakpointId": breakpoint_id})

        # Remove from our tracking
        if breakpoint_id in cdp.breakpoints:
            del cdp.breakpoints[breakpoint_id]

        return f"✓ Breakpoint {breakpoint_id} removed successfully"
    except Exception as e:
        return f"Error removing breakpoint: {str(e)}"


@mcp.tool()
async def debugger_set_pause_on_exceptions(state: str, connection_id: Optional[str] = None) -> str:
    """
    Configure whether to pause when exceptions are thrown.

    Args:
        state: One of "none", "uncaught", or "all"
            - "none": Don't pause on exceptions
            - "uncaught": Pause only on uncaught exceptions
            - "all": Pause on all exceptions (caught and uncaught)

    Returns:
        Confirmation message

    Example:
        debugger_set_pause_on_exceptions("all")  # Pause on any exception
    """
    await ensure_chrome_client()

    cdp = chrome_client.cdp_manager.get_connection(connection_id)
    if not cdp:
        conn_msg = f" '{connection_id}'" if connection_id else ""
        return f"Error: No Chrome connection{conn_msg} found. Use chrome_connect() or chrome_launch() first."

    if state not in ["none", "uncaught", "all"]:
        return f"Error: state must be 'none', 'uncaught', or 'all' (got '{state}')"

    try:
        await cdp.send_command("Debugger.setPauseOnExceptions", {"state": state})

        messages = {
            "none": "Will not pause on exceptions",
            "uncaught": "Will pause only on uncaught exceptions",
            "all": "Will pause on all exceptions (caught and uncaught)"
        }

        return f"✓ Exception breaking configured\n\n{messages[state]}"
    except Exception as e:
        return f"Error setting pause on exceptions: {str(e)}"


if __name__ == "__main__":
    mcp.run()
