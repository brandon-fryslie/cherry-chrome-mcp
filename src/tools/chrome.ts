/**
 * Chrome Connection Management Tools
 * Ported from Python chrome_connect, chrome_launch, etc.
 */

import { createConnection } from 'net';
import { browserManager } from '../browser.js';
import { successResponse, errorResponse } from '../response.js';
import { gatherNavigateContext } from './context.js';

/**
 * Generate a random port in the 15000-18000 range
 */
function getRandomPort(): number {
  return Math.floor(Math.random() * (18000 - 15000 + 1)) + 15000;
}

/**
 * Check if something is listening on a given port
 * Returns true if port is in use, false if available
 */
async function isPortInUse(port: number, host = 'localhost'): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = createConnection({ port, host });

    socket.once('connect', () => {
      socket.destroy();
      resolve(true);
    });

    socket.once('error', () => {
      socket.destroy();
      resolve(false);
    });

    // Timeout after 1 second
    socket.setTimeout(1000, () => {
      socket.destroy();
      resolve(false);
    });
  });
}

/**
 * connect - Smart Chrome connection
 *
 * Behavior depends on whether port is provided:
 * - If port IS provided: verify something is running on that port and connect to it
 * - If port is NOT provided: launch a new Chrome on a random port (15000-18000),
 *   navigate to the required URL, and return useful page context
 *
 * This replaces both chrome_connect and chrome_launch with unified, smarter behavior.
 */
export async function connect(args: {
  url: string;
  port?: number;
  connection_id?: string;
  headless?: boolean;
  user_data_dir?: string;
  extra_args?: string;
}): Promise<{ content: Array<{ type: 'text'; text: string }>; isError?: boolean }> {
  // [LAW:verifiable-goals] Validate required input at the trust boundary.
  // Without this, a missing/misnamed url flows into page.goto() and surfaces
  // as an opaque CDP "Failed to deserialize params.url" error.
  if (typeof args.url !== 'string' || args.url.trim() === '') {
    return errorResponse(
      `connect requires a non-empty 'url' parameter.\n\n` +
      `Received: ${JSON.stringify(args.url)}\n\n` +
      `The correct parameter name is 'url' (not 'initialUrl' or similar).\n` +
      `Example: connect({ url: 'https://example.com' })`
    );
  }

  const connectionId = args.connection_id ?? 'default';
  const headless = args.headless ?? true;

  // Check if connection already exists - if so, reuse it
  const existingPage = browserManager.getPage(connectionId);
  if (existingPage) {
    console.error(`[cherry-chrome] Connection '${connectionId}' already exists, reusing...`);

    try {
      // Navigate to the new URL using the existing connection
      await existingPage.goto(args.url, { waitUntil: 'networkidle2' });

      // Gather context about the page
      const context = await gatherNavigateContext(existingPage, connectionId);

      const response = [
        `Using existing connection '${connectionId}'`,
        `Navigated to: ${args.url}`,
        '',
        context || '',
      ].filter(Boolean).join('\n');

      return successResponse(response);
    } catch (error) {
      return errorResponse(
        `Failed to navigate existing connection: ${error}\n\n` +
        `Try disconnecting first: chrome_disconnect({ connection_id: '${connectionId}' })`
      );
    }
  }

  // Case 1: Port explicitly provided - try to connect to existing Chrome
  if (args.port !== undefined) {
    const port = args.port;
    const host = 'localhost';

    console.error(`[cherry-chrome] Port ${port} specified, checking if Chrome is running...`);

    // Check if something is actually running on that port
    const portInUse = await isPortInUse(port, host);

    if (!portInUse) {
      return errorResponse(
        `Nothing is running on port ${port}.\n\n` +
        `RECOMMENDED NEXT STEP — launch a fresh Chrome automatically:\n` +
        `  connect({ url: "${args.url}" })    // omit the port entirely\n\n` +
        `Only use a manual port if you specifically need to attach to an existing Chrome.\n` +
        `To do that, start Chrome yourself first with:\n` +
        `  chrome --remote-debugging-port=${port}\n` +
        `then call: connect({ url: "${args.url}", port: ${port} })`
      );
    }

    console.error(`[cherry-chrome] Port ${port} is in use, attempting to connect...`);

    try {
      const result = await browserManager.connect(connectionId, host, port);

      if (result.startsWith('Error:')) {
        return errorResponse(result);
      }

      // Now navigate to the URL
      const page = browserManager.getPage(connectionId);
      if (!page) {
        return errorResponse('Connected but failed to get page reference');
      }

      await page.goto(args.url, { waitUntil: 'networkidle2' });

      // Gather context about the page
      const context = await gatherNavigateContext(page, connectionId);

      const response = [
        `Connected to Chrome at ${host}:${port} (ID: ${connectionId})`,
        `Navigated to: ${args.url}`,
        '',
        context || '',
      ].filter(Boolean).join('\n');

      return successResponse(response);
    } catch (error) {
      console.error(`[cherry-chrome] Connection failed: ${error}`);

      // Check if port is still in use but connection failed
      const stillInUse = await isPortInUse(port, host);
      const suggestion = stillInUse
        ? `Port ${port} is in use but connection failed. The process may be unresponsive.\n` +
          `Try killing it: lsof -i :${port} | grep -v PID | awk '{print $2}' | xargs kill -9`
        : `Port ${port} is no longer in use. Chrome may have crashed or been killed.\n` +
          `Try launching fresh: connect({ url: '${args.url}' })`;

      return errorResponse(
        `Failed to connect to Chrome at ${host}:${port}: ${error}\n\n` +
        `${suggestion}\n\n` +
        `Or to launch new Chrome on a fresh random port:\n` +
        `  connect({ url: '${args.url}' })`
      );
    }
  }

  // Case 2: No port provided - launch new Chrome on random port
  let randomPort = getRandomPort();
  let attempts = 0;
  const maxAttempts = 10;

  // Retry if port is already in use
  while (attempts < maxAttempts) {
    const portInUse = await isPortInUse(randomPort);
    if (!portInUse) {
      break;
    }

    console.error(
      `[cherry-chrome] Port ${randomPort} is in use, trying another random port (attempt ${attempts + 1}/${maxAttempts})...`
    );
    randomPort = getRandomPort();
    attempts++;
  }

  if (attempts >= maxAttempts) {
    return errorResponse(
      `Failed to find an available port after ${maxAttempts} attempts.\n\n` +
      `This may indicate that many Chrome processes are still running.\n` +
      `Try:\n` +
      `1. Kill existing Chrome processes: killall chrome\n` +
      `2. Or specify an explicit port: connect({ url: '...', port: 9222 })`
    );
  }

  console.error(`[cherry-chrome] No port specified, launching Chrome on random port ${randomPort}...`);

  try {
    const launchResult = await browserManager.launch(
      randomPort,
      connectionId,
      headless,
      args.user_data_dir,
      args.extra_args
    );

    if (launchResult.startsWith('Error:')) {
      return errorResponse(launchResult);
    }

    // Navigate to the URL
    const page = browserManager.getPage(connectionId);
    if (!page) {
      return errorResponse('Launched Chrome but failed to get page reference');
    }

    await page.goto(args.url, { waitUntil: 'networkidle2' });

    // Gather context about the page
    const context = await gatherNavigateContext(page, connectionId);

    const response = [
      `Launched Chrome on port ${randomPort} (ID: ${connectionId})`,
      `Navigated to: ${args.url}`,
      '',
      context || '',
    ].filter(Boolean).join('\n');

    return successResponse(response);
  } catch (error) {
    return errorResponse(`Error launching Chrome: ${error}`);
  }
}

/**
 * List all active Chrome connections.
 *
 * Shows connection ID, WebSocket URL, active status, and paused state for each connection.
 */
export async function chromeListConnections(): Promise<{
  content: Array<{ type: 'text'; text: string }>;
}> {
  // Fix: use getConnectionsStatus() instead of listConnections()
  const connections = await browserManager.getConnectionsStatus();

  if (connections.size === 0) {
    return successResponse(
      `No active Chrome connections.\n\n` +
      `NEXT STEP — call this exact tool to start:\n` +
      `  connect({ url: "https://the-url-you-want.com" })\n\n` +
      `That single call launches a fresh Chrome and navigates. No manual setup needed. ` +
      `The required parameter is exactly "url" (not "initialUrl").`
    );
  }

  const lines: string[] = ['Chrome Connections:', '='.repeat(80), ''];

  for (const [connId, info] of connections) {
    const marker = info.active ? '>>> ' : '    ';
    lines.push(`${marker}[${connId}]`);
    lines.push(`    URL: ${info.url}`);
    lines.push(`    Active: ${info.active}`);
    lines.push(`    Paused: ${info.paused}`);
    lines.push(`    Debugger: ${info.debuggerEnabled ? 'enabled' : 'disabled'}`);
    lines.push('');
  }

  if (connections.size > 1) {
    lines.push(
      'Use chrome_switch_connection(connection_id) to change the active connection.'
    );
  }
  lines.push('Use chrome_disconnect(connection_id) to close a connection.');

  return successResponse(lines.join('\n'));
}

/**
 * Switch the active Chrome connection.
 *
 * All debugger and DOM tools will use the active connection.
 */
export async function chromeSwitchConnection(args: {
  connection_id: string;
}): Promise<{ content: Array<{ type: 'text'; text: string }>; isError?: boolean }> {
  const result = browserManager.switchActive(args.connection_id);

  if (result.startsWith('Error')) {
    return errorResponse(result);
  }
  return successResponse(result);
}

/**
 * Disconnect from a specific Chrome instance.
 *
 * If you disconnect the active connection, the next available connection
 * will become active automatically.
 */
export async function chromeDisconnect(args: {
  connection_id: string;
}): Promise<{ content: Array<{ type: 'text'; text: string }>; isError?: boolean }> {
  try {
    const result = await browserManager.disconnect(args.connection_id);

    if (result.startsWith('Error')) {
      return errorResponse(result);
    }
    return successResponse(result);
  } catch (error) {
    return errorResponse(`Error disconnecting: ${error}`);
  }
}

/**
 * List all targets (pages, workers, service workers) for a connection.
 *
 * Shows which target is currently active. Use switch_target to change.
 */
export async function listTargets(args: {
  connection_id?: string;
}): Promise<{ content: Array<{ type: 'text'; text: string }>; isError?: boolean }> {
  try {
    const connection = browserManager.getConnection(args.connection_id);
    if (!connection) {
      const id = args.connection_id || 'active';
      return errorResponse(
        `No Chrome connection '${id}' found. Call connect({ url: "..." }) first.`
      );
    }

    // Get the debug port from the WebSocket URL
    const wsUrl = connection.wsUrl;
    const portMatch = wsUrl.match(/:(\d+)\//);
    if (!portMatch) {
      return errorResponse('Could not determine debug port from connection');
    }
    const port = portMatch[1];

    // Fetch targets from CDP
    const response = await fetch(`http://localhost:${port}/json/list`);
    if (!response.ok) {
      return errorResponse(`Failed to list targets: ${response.status}`);
    }

    const targets = await response.json() as Array<{
      id: string;
      type: string;
      title: string;
      url: string;
      webSocketDebuggerUrl?: string;
    }>;

    if (targets.length === 0) {
      return successResponse('No targets found.');
    }

    // Get current page's target ID to mark as active
    const currentUrl = connection.page.url();

    const lines: string[] = [];
    // Fix: use getActiveId() instead of accessing private property
    const connId = args.connection_id || browserManager.getActiveId() || 'unknown';
    lines.push(`Targets for connection '${connId}':`);
    lines.push('');

    for (let i = 0; i < targets.length; i++) {
      const t = targets[i];
      const isActive = t.url === currentUrl;
      const marker = isActive ? '>>> ' : '    ';
      const activeLabel = isActive ? ' (active)' : '';

      lines.push(`${marker}[${i}] ${t.type}: "${t.title || '(untitled)'}"${activeLabel}`);
      lines.push(`        ${t.url.substring(0, 70)}${t.url.length > 70 ? '...' : ''}`);
    }

    lines.push('');
    lines.push('Use switch_target(index) or switch_target(title="...") to change target.');

    return successResponse(lines.join('\n'));
  } catch (error) {
    return errorResponse(`Error listing targets: ${error}`);
  }
}

/**
 * Switch to a different target (page, worker) within the current connection.
 *
 * Can switch by index number, title pattern, or URL pattern.
 */
export async function switchTarget(args: {
  index?: number;
  title?: string;
  url?: string;
  connection_id?: string;
}): Promise<{ content: Array<{ type: 'text'; text: string }>; isError?: boolean }> {
  try {
    const connection = browserManager.getConnection(args.connection_id);
    if (!connection) {
      const id = args.connection_id || 'active';
      return errorResponse(
        `No Chrome connection '${id}' found. Call connect({ url: "..." }) first.`
      );
    }

    // Get the debug port from the WebSocket URL
    const wsUrl = connection.wsUrl;
    const portMatch = wsUrl.match(/:(\d+)\//);
    if (!portMatch) {
      return errorResponse('Could not determine debug port from connection');
    }
    const port = portMatch[1];

    // Fetch targets from CDP
    const response = await fetch(`http://localhost:${port}/json/list`);
    if (!response.ok) {
      return errorResponse(`Failed to list targets: ${response.status}`);
    }

    const targets = await response.json() as Array<{
      id: string;
      type: string;
      title: string;
      url: string;
      webSocketDebuggerUrl?: string;
    }>;

    // Find the target
    let target: typeof targets[0] | undefined;
    let matchDesc: string;

    if (args.index !== undefined) {
      if (args.index < 0 || args.index >= targets.length) {
        return errorResponse(`Index ${args.index} out of range. Found ${targets.length} targets.`);
      }
      target = targets[args.index];
      matchDesc = `index ${args.index}`;
    } else if (args.title) {
      const pattern = args.title.toLowerCase();
      target = targets.find(t => t.title.toLowerCase().includes(pattern));
      matchDesc = `title "${args.title}"`;
    } else if (args.url) {
      const pattern = args.url.toLowerCase().replace(/\*/g, '.*');
      const regex = new RegExp(pattern);
      target = targets.find(t => regex.test(t.url.toLowerCase()));
      matchDesc = `url "${args.url}"`;
    } else {
      return errorResponse('Must specify index, title, or url to switch target.');
    }

    if (!target) {
      return errorResponse(`No target found matching ${matchDesc}`);
    }

    if (target.type !== 'page') {
      return errorResponse(
        `Target "${target.title}" is a ${target.type}, not a page. Can only switch to page targets.`
      );
    }

    // Switch to the new page using browser.pages()
    const pages = await connection.browser.pages();
    const newPage = pages.find(p => p.url() === target!.url);

    if (!newPage) {
      return errorResponse(
        `Could not find page for target "${target.title}". It may have closed.`
      );
    }

    // Update connection's page reference using switchPage method
    await browserManager.switchPage(args.connection_id, newPage);

    return successResponse(
      `Switched to: "${target.title}"\n${target.url.substring(0, 80)}${target.url.length > 80 ? '...' : ''}`
    );
  } catch (error) {
    return errorResponse(`Error switching target: ${error}`);
  }
}

/**
 * target - List or switch browser targets (pages).
 *
 * action: "list" shows all targets; "switch" switches by index/title/url.
 */
export async function target(args: {
  action: 'list' | 'switch';
  index?: number;
  title?: string;
  url?: string;
  connection_id?: string;
}): Promise<{ content: Array<{ type: 'text'; text: string }>; isError?: boolean }> {
  if (args.action === 'list') {
    return listTargets({
      connection_id: args.connection_id,
    });
  } else if (args.action === 'switch') {
    return switchTarget({
      index: args.index,
      title: args.title,
      url: args.url,
      connection_id: args.connection_id,
    });
  } else {
    return errorResponse(`Invalid action: ${args.action}. Must be 'list' or 'switch'.`);
  }
}

/**
 * META TOOL: Enable debug tools
 *
 * Shows debugger tools by enabling the debugger.
 * This provides semantic intent for showing debugging capabilities.
 */
export async function enableDebugTools(args: {
  connection_id?: string;
}): Promise<{ content: Array<{ type: 'text'; text: string }>; isError?: boolean }> {
  try {
    await browserManager.enableDebugger(args.connection_id);

    return successResponse(
      `Debug tools enabled successfully

You can now:
- Set breakpoints with breakpoint(action="set", ...)
- Pause execution with execution(action="pause")
- Configure exception breaking with pause_on_exceptions(...)`
    );
  } catch (error) {
    return errorResponse(`Error enabling debug tools: ${error}`);
  }
}
