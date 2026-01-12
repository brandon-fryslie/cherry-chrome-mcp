/**
 * Browser & Connection Management for Cherry Chrome MCP
 * Ported from Python CDPConnectionManager
 *
 * Manages multiple Chrome connections via Puppeteer.
 * Each connection has its own Browser, Page, and CDP session.
 */

import puppeteer from 'puppeteer';
import type { Browser, Page, CDPSession } from 'puppeteer';
import { spawn } from 'child_process';
import { tmpdir } from 'os';
import { mkdtempSync } from 'fs';
import { join } from 'path';

import { DEBUG, CHROME_LAUNCH_WAIT } from './config.js';
import type {
  Connection,
  ConnectionStatus,
  DebuggerPausedEvent,
  BreakpointInfo,
  ConsoleMessage,
} from './types.js';

/**
 * Log debug messages to stderr
 */
function debug(message: string, ...args: unknown[]): void {
  if (DEBUG) {
    console.error(`[DEBUG] ${message}`, ...args);
  }
}

/**
 * Log info messages to stderr
 */
function info(message: string): void {
  console.error(`[INFO] ${message}`);
}

/**
 * Get platform-specific Chrome executable path
 */
function getChromePath(): string {
  switch (process.platform) {
    case 'darwin':
      return '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
    case 'linux':
      return 'google-chrome';
    case 'win32':
      return 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
    default:
      throw new Error(`Unsupported platform: ${process.platform}`);
  }
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Browser Manager - handles multiple Chrome connections
 * Ported from Python CDPConnectionManager
 */
export class BrowserManager {
  private connections: Map<string, Connection> = new Map();
  private activeConnectionId: string | null = null;
  private hiddenTools: Set<string> = new Set();
  private toolListChangedCallback: (() => void) | null = null;

  /**
   * Set callback for tool list changes (used for P1: Dynamic Tool Visibility).
   * This callback is invoked when connection state changes that affect tool visibility.
   */
  setToolListChangedCallback(callback: () => void): void {
    this.toolListChangedCallback = callback;
  }

  /**
   * Notify that tool list has changed (P1: Dynamic Tool Visibility)
   */
  private notifyToolListChanged(): void {
    if (this.toolListChangedCallback) {
      this.toolListChangedCallback();
    }
  }

  /**
   * Connect to an existing Chrome instance running with remote debugging.
   *
   * @param connectionId - Unique identifier for this connection
   * @param host - Chrome host (default: localhost)
   * @param port - Chrome remote debugging port (default: 9222)
   * @returns Success message
   */
  async connect(
    connectionId: string,
    host = 'localhost',
    port = 9222
  ): Promise<string> {
    debug(`Connecting to Chrome at ${host}:${port} with ID: ${connectionId}`);

    if (this.connections.has(connectionId)) {
      return `Error: Connection '${connectionId}' already exists. Use chrome_disconnect first.`;
    }

    try {
      const browserURL = `http://${host}:${port}`;
      info(`Connecting to ${browserURL}...`);

      // First fetch the WebSocket URL from the debug endpoint
      const versionResponse = await fetch(`${browserURL}/json/version`);
      if (!versionResponse.ok) {
        throw new Error(`Failed to fetch browser info: ${versionResponse.status}`);
      }

      const versionData = (await versionResponse.json()) as {
        webSocketDebuggerUrl?: string;
      };
      const wsUrl = versionData.webSocketDebuggerUrl;

      if (!wsUrl) {
        throw new Error(
          'Could not find webSocketDebuggerUrl in response. Is Chrome running with --remote-debugging-port?'
        );
      }

      // Connect via Puppeteer
      const browser = await puppeteer.connect({
        browserWSEndpoint: wsUrl,
        defaultViewport: null,
      });

      info(`Connected to Chrome via WebSocket: ${wsUrl}`);

      // Get the active page
      const pages = await browser.pages();
      if (pages.length === 0) {
        throw new Error('No pages found in browser');
      }

      const page = pages[0];
      info(`Using page: ${page.url()}`);

      // Enable console capture
      const consoleLogs: ConsoleMessage[] = [];
      page.on('console', (msg) => {
        consoleLogs.push({
          level: msg.type(),
          text: msg.text(),
          timestamp: Date.now(),
        });
      });

      // Store connection
      this.connections.set(connectionId, {
        browser,
        page,
        cdpSession: null,
        wsUrl,
        pausedData: null,
        breakpoints: new Map(),
        debuggerEnabled: false,
        consoleLogs,
        consoleEnabled: true,
      });

      // Set as active if first connection
      if (!this.activeConnectionId) {
        this.activeConnectionId = connectionId;
      }

      // Notify tool list changed (P1: state transition to "connected")
      this.notifyToolListChanged();

      return `Connected to Chrome at ${host}:${port} (ID: ${connectionId})\nURL: ${page.url()}`;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown error';
      return `Error: Failed to connect to Chrome at ${host}:${port}: ${message}`;
    }
  }

  /**
   * Launch a new Chrome instance with remote debugging enabled.
   *
   * @param debugPort - Port for remote debugging
   * @param connectionId - Unique identifier (auto if not specified)
   * @param headless - Run in headless mode
   * @param userDataDir - Custom user data directory
   * @param extraArgs - Additional Chrome flags
   * @returns Success message with connection info
   */
  async launch(
    debugPort = 9222,
    connectionId?: string,
    headless = false,
    userDataDir?: string,
    extraArgs?: string
  ): Promise<string> {
    const connId = connectionId === 'auto' ? `port-${debugPort}` : connectionId || `port-${debugPort}`;

    if (this.connections.has(connId)) {
      return `Error: Connection '${connId}' already exists. Use chrome_disconnect first.`;
    }

    try {
      // Create temp user data dir if not specified
      const userDir = userDataDir || mkdtempSync(join(tmpdir(), 'chrome-debug-'));

      // Parse extra args if provided
      const extraArgsArray = extraArgs
        ? extraArgs.split(' ').filter((arg) => arg.trim())
        : [];

      // Launch Chrome
      const args = [
        `--remote-debugging-port=${debugPort}`,
        `--user-data-dir=${userDir}`,
        '--no-first-run',
        '--no-default-browser-check',
        ...extraArgsArray,
      ];

      if (headless) {
        args.push('--headless=new');
      }

      const chromePath = getChromePath();
      info(`Launching Chrome: ${chromePath} ${args.join(' ')}`);

      const chromeProcess = spawn(chromePath, args, {
        detached: true,
        stdio: 'ignore',
      });
      chromeProcess.unref();

      // Wait for Chrome to start
      info(`Waiting ${CHROME_LAUNCH_WAIT}ms for Chrome to start...`);
      await sleep(CHROME_LAUNCH_WAIT);

      // Now connect to it
      const result = await this.connect(connId, 'localhost', debugPort);

      if (result.startsWith('Error:')) {
        return result;
      }

      // Notify tool list changed (P1: state transition to "connected")
      // (already called by connect(), but defensive)
      this.notifyToolListChanged();

      return `Launched Chrome on port ${debugPort} (ID: ${connId})\n${result}`;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown error';
      return `Error: Failed to launch Chrome: ${message}`;
    }
  }

  /**
   * Disconnect from a Chrome connection.
   *
   * @param connectionId - Connection ID to disconnect
   * @returns Success message
   */
  async disconnect(connectionId: string): Promise<string> {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      return `Error: No connection found with ID '${connectionId}'`;
    }

    try {
      // Disable debugger if enabled
      if (connection.debuggerEnabled && connection.cdpSession) {
        try {
          await connection.cdpSession.send('Debugger.disable');
        } catch (error) {
          // Ignore errors during cleanup
          debug(`Error disabling debugger: ${error}`);
        }
      }

      // Disconnect browser
      await connection.browser.disconnect();
      this.connections.delete(connectionId);

      // If this was the active connection, switch to another
      if (this.activeConnectionId === connectionId) {
        const remaining = Array.from(this.connections.keys());
        this.activeConnectionId = remaining.length > 0 ? remaining[0] : null;

        if (this.activeConnectionId) {
          info(`Switched active connection to: ${this.activeConnectionId}`);
        }
      }

      // Notify tool list changed (P1: state transition - may go to "not connected")
      this.notifyToolListChanged();

      return `Disconnected from Chrome (ID: ${connectionId})`;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown error';
      return `Error: Failed to disconnect: ${message}`;
    }
  }

  /**
   * Switch the active connection.
   *
   * @param connectionId - Connection ID to make active
   * @returns Success message
   */
  switchActive(connectionId: string): string {
    if (!this.connections.has(connectionId)) {
      return `Error: No connection found with ID '${connectionId}'`;
    }

    this.activeConnectionId = connectionId;
    return `Switched active connection to '${connectionId}'`;
  }

  /**
   * Get information about all connections.
   *
   * @returns Map of connection IDs to their status
   */
  async getConnectionsStatus(): Promise<Map<string, ConnectionStatus>> {
    const statuses = new Map<string, ConnectionStatus>();

    for (const [id, conn] of this.connections.entries()) {
      try {
        const url = conn.page.url();
        statuses.set(id, {
          url,
          active: id === this.activeConnectionId,
          paused: conn.pausedData !== null,
          debuggerEnabled: conn.debuggerEnabled,
        });
      } catch (error) {
        statuses.set(id, {
          url: 'Error getting URL',
          active: id === this.activeConnectionId,
          paused: false,
          debuggerEnabled: false,
        });
      }
    }

    return statuses;
  }

  /**
   * Check if there are any connections.
   */
  hasConnections(): boolean {
    return this.connections.size > 0;
  }

  /**
   * Get active connection ID.
   *
   * @returns Active connection ID or null if none
   */
  getActiveId(): string | null {
    return this.activeConnectionId;
  }

  /**
   * Switch to a different page within a connection.
   *
   * @param connectionId - Optional connection ID
   * @param page - New page to switch to
   */
  async switchPage(connectionId: string | undefined, page: Page): Promise<void> {
    const connection = this.getConnection(connectionId);
    if (!connection) {
      throw new Error('No connection found');
    }

    // Update the page reference
    connection.page = page;

    // Re-setup console capture on new page
    connection.consoleLogs = [];
    page.on('console', (msg) => {
      connection.consoleLogs.push({
        level: msg.type(),
        text: msg.text(),
        timestamp: Date.now(),
      });
    });

    // If debugger was enabled, need to recreate CDP session for new page
    if (connection.debuggerEnabled) {
      const newClient = await page.createCDPSession();
      connection.cdpSession = newClient;

      // Re-setup event handlers
      newClient.on('Debugger.paused', (params) => {
        connection.pausedData = params as unknown as DebuggerPausedEvent;
        debug(`Debugger paused: ${params.reason}`);
        this.notifyToolListChanged();
      });

      newClient.on('Debugger.resumed', () => {
        connection.pausedData = null;
        debug('Debugger resumed');
        this.notifyToolListChanged();
      });

      // Re-enable debugger
      await newClient.send('Debugger.enable');
    }
  }

  /**
   * Enable debugger for a connection and set up CDP session.
   *
   * @param connectionId - Optional connection ID
   * @returns CDP session
   */
  async enableDebugger(connectionId?: string): Promise<CDPSession> {
    const connection = this.getConnection(connectionId);
    if (!connection) {
      const id = connectionId || 'active';
      throw new Error(
        `No Chrome connection '${id}' found. Use chrome_connect() or chrome_launch() first.`
      );
    }

    // Create CDP session if not exists
    if (!connection.cdpSession) {
      const client = await connection.page.createCDPSession();
      connection.cdpSession = client;

      // Set up event handlers
      client.on('Debugger.paused', (params) => {
        // Cast to our type - CDP types are compatible
        connection.pausedData = params as unknown as DebuggerPausedEvent;
        debug(`Debugger paused: ${params.reason}`);
        // Notify tool list changed (P1: state transition to "paused")
        this.notifyToolListChanged();
      });

      client.on('Debugger.resumed', () => {
        connection.pausedData = null;
        debug('Debugger resumed');
        // Notify tool list changed (P1: state transition from "paused")
        this.notifyToolListChanged();
      });
    }

    // Enable debugger if not already
    if (!connection.debuggerEnabled) {
      await connection.cdpSession.send('Debugger.enable');
      connection.debuggerEnabled = true;
      debug('Debugger enabled');
      // Notify tool list changed (P1: state transition to "debugger enabled")
      this.notifyToolListChanged();
    }

    return connection.cdpSession;
  }

  /**
   * Get CDP session for a connection (must call enableDebugger first).
   *
   * @param connectionId - Optional connection ID
   * @returns CDP session or null if not enabled
   */
  getCDPSession(connectionId?: string): CDPSession | null {
    const connection = this.getConnection(connectionId);
    return connection?.cdpSession || null;
  }

  /**
   * Get connection by ID or active connection.
   *
   * @param connectionId - Optional connection ID
   * @returns Connection or null if not found
   */
  getConnection(connectionId?: string): Connection | null {
    if (connectionId) {
      return this.connections.get(connectionId) || null;
    }
    if (!this.activeConnectionId) {
      return null;
    }
    return this.connections.get(this.activeConnectionId) || null;
  }

  /**
   * Get paused debugger data for a connection.
   *
   * @param connectionId - Optional connection ID
   * @returns Paused data or null if not paused
   */
  getPausedData(connectionId?: string): DebuggerPausedEvent | null {
    const connection = this.getConnection(connectionId);
    return connection?.pausedData || null;
  }

  /**
   * Check if execution is paused.
   *
   * @param connectionId - Optional connection ID
   * @returns True if paused
   */
  isPaused(connectionId?: string): boolean {
    return this.getPausedData(connectionId) !== null;
  }

  /**
   * Get page for a connection.
   *
   * @param connectionId - Optional connection ID
   * @returns Page or null if not found
   */
  getPage(connectionId?: string): Page | null {
    const connection = this.getConnection(connectionId);
    return connection?.page || null;
  }

  /**
   * Set breakpoint for tracking.
   *
   * @param connectionId - Optional connection ID
   * @param breakpointId - Breakpoint ID from CDP
   * @param info - Breakpoint information
   */
  setBreakpoint(
    connectionId: string | undefined,
    breakpointId: string,
    info: BreakpointInfo
  ): void {
    const connection = this.getConnection(connectionId);
    if (connection) {
      connection.breakpoints.set(breakpointId, info);
    }
  }

  /**
   * Remove breakpoint from tracking.
   *
   * @param connectionId - Optional connection ID
   * @param breakpointId - Breakpoint ID
   */
  removeBreakpoint(
    connectionId: string | undefined,
    breakpointId: string
  ): void {
    const connection = this.getConnection(connectionId);
    if (connection) {
      connection.breakpoints.delete(breakpointId);
    }
  }

  /**
   * Get all breakpoints for a connection.
   *
   * @param connectionId - Optional connection ID
   * @returns Map of breakpoint IDs to info
   */
  getBreakpoints(
    connectionId?: string
  ): Map<string, BreakpointInfo> | null {
    const connection = this.getConnection(connectionId);
    return connection?.breakpoints || null;
  }

  /**
   * Get console logs for a connection.
   *
   * @param connectionId - Optional connection ID
   * @returns Console logs or empty array
   */
  getConsoleLogs(connectionId?: string): ConsoleMessage[] {
    const connection = this.getConnection(connectionId);
    return connection?.consoleLogs || [];
  }

  /**
   * Clear console logs for a connection.
   *
   * @param connectionId - Optional connection ID
   */
  clearConsoleLogs(connectionId?: string): void {
    const connection = this.getConnection(connectionId);
    if (connection) {
      connection.consoleLogs = [];
    }
  }

  /**
   * Hide tools by pattern or names.
   *
   * @param pattern - Pattern to match (e.g., "chrome_*")
   * @param toolNames - Specific tool names to hide
   * @returns Number of tools hidden
   */
  hideTools(pattern?: string, toolNames?: string[]): number {
    let hiddenCount = 0;

    if (pattern) {
      this.hiddenTools.add(pattern);
      hiddenCount++;
    }

    if (toolNames) {
      for (const toolName of toolNames) {
        this.hiddenTools.add(toolName);
        hiddenCount++;
      }
    }

    // Notify tool list changed
    this.notifyToolListChanged();

    return hiddenCount;
  }

  /**
   * Show (restore) hidden tools.
   *
   * @param all - Restore all hidden tools
   * @param toolNames - Specific tool names to restore
   * @returns Number of tools restored
   */
  showTools(all?: boolean, toolNames?: string[]): number {
    let restoredCount = 0;

    if (all) {
      restoredCount = this.hiddenTools.size;
      this.hiddenTools.clear();
    } else if (toolNames) {
      for (const toolName of toolNames) {
        if (this.hiddenTools.delete(toolName)) {
          restoredCount++;
        }
      }
    }

    // Notify tool list changed if anything was restored
    if (restoredCount > 0) {
      this.notifyToolListChanged();
    }

    return restoredCount;
  }

  /**
   * Check if a tool should be hidden based on hidden patterns.
   *
   * @param toolName - Tool name to check
   * @returns True if tool should be hidden
   */
  isToolHidden(toolName: string): boolean {
    // Check exact match first
    if (this.hiddenTools.has(toolName)) {
      return true;
    }

    // Check pattern matches
    for (const pattern of this.hiddenTools) {
      if (pattern.includes('*')) {
        const regexPattern = pattern.replace(/\*/g, '.*');
        const regex = new RegExp(`^${regexPattern}$`);
        if (regex.test(toolName)) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Check if debugger is enabled for active connection.
   */
  isDebuggerEnabled(connectionId?: string): boolean {
    const connection = this.getConnection(connectionId);
    return connection?.debuggerEnabled ?? false;
  }
}

// Global browser manager instance
export const browserManager = new BrowserManager();
