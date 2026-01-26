/**
 * Browser & Connection Management for Cherry Chrome MCP
 * Ported from Python CDPConnectionManager
 *
 * Manages multiple Chrome connections via Puppeteer.
 * Each connection has its own Browser, Page, and CDP session.
 */
import puppeteer from 'puppeteer';
import { spawn } from 'child_process';
import { tmpdir } from 'os';
import { mkdtempSync } from 'fs';
import { join } from 'path';
import { DEBUG, CHROME_LAUNCH_WAIT } from './config.js';
import { ChromeNotConnectedError, DebuggerNotEnabledError, ExecutionNotPausedError, ExecutionAlreadyPausedError, } from './errors.js';
/**
 * Log debug messages to stderr
 */
function debug(message, ...args) {
    if (DEBUG) {
        console.error(`[DEBUG] ${message}`, ...args);
    }
}
/**
 * Log info messages to stderr
 */
function info(message) {
    console.error(`[INFO] ${message}`);
}
/**
 * Get platform-specific Chrome executable path
 */
function getChromePath() {
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
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
/**
 * Check if console message is from HMR framework
 */
function isHmrMessage(text) {
    return /^\[(HMR|WDS|vite)\]/.test(text);
}
/**
 * Check if HMR message indicates a module update
 */
function isHmrUpdateMessage(text) {
    return isHmrMessage(text) && /updat(e|ed|ing)/i.test(text);
}
/**
 * Browser Manager - handles multiple Chrome connections
 * Ported from Python CDPConnectionManager
 */
export class BrowserManager {
    connections = new Map();
    activeConnectionId = null;
    /**
     * Setup console capture and navigation tracking for a page
     */
    setupPageListeners(connection, page) {
        // Clear any existing listeners to prevent duplicates
        page.removeAllListeners('console');
        page.removeAllListeners('load');
        // Enable console capture with HMR detection
        // NOTE: Handler must be synchronous for immediate capture; stack traces are extracted async
        page.on('console', (msg) => {
            const text = msg.text();
            const level = msg.type();
            // Track HMR updates
            if (isHmrUpdateMessage(text)) {
                connection.hmrUpdateCount++;
                connection.lastHmrTime = Date.now();
                debug(`HMR update detected (count: ${connection.hmrUpdateCount}): ${text}`);
            }
            // Get stack trace locations from Puppeteer (synchronous)
            const puppeteerStack = msg.stackTrace();
            const stackLocations = puppeteerStack.length > 0
                ? puppeteerStack.map(loc => ({
                    url: loc.url,
                    lineNumber: loc.lineNumber !== undefined ? loc.lineNumber + 1 : undefined, // Convert to 1-based
                    columnNumber: loc.columnNumber,
                }))
                : undefined;
            // Get source location from first stack frame if available
            const firstLocation = puppeteerStack[0];
            // Create log entry immediately (synchronous) to preserve ordering
            const logEntry = {
                level,
                text,
                stackLocations,
                timestamp: Date.now(),
                url: firstLocation?.url,
                lineNumber: firstLocation?.lineNumber !== undefined ? firstLocation.lineNumber + 1 : undefined,
                navigationEpoch: connection.navigationEpoch,
            };
            connection.consoleLogs.push(logEntry);
            // For error messages, asynchronously extract the full stack trace from Error objects
            // This enriches the log entry after it's been captured
            if (level === 'error') {
                const args = msg.args();
                (async () => {
                    try {
                        for (const arg of args) {
                            // Try to get the stack property from Error objects
                            const stack = await arg.evaluate((obj) => {
                                if (obj instanceof Error) {
                                    return obj.stack;
                                }
                                // Check if it's an error-like object with a stack property
                                if (obj && typeof obj === 'object' && 'stack' in obj) {
                                    return String(obj.stack);
                                }
                                return null;
                            }).catch(() => null);
                            if (stack) {
                                logEntry.stackTrace = stack;
                                break;
                            }
                        }
                    }
                    catch (err) {
                        // Ignore errors during stack trace extraction
                        debug(`Failed to extract stack trace: ${err}`);
                    }
                })();
            }
        });
        // Track page navigations/reloads
        page.on('load', () => {
            connection.navigationEpoch++;
            connection.lastNavigationTime = Date.now();
            connection.hmrUpdateCount = 0;
            connection.lastHmrTime = null;
            // Clear pre-navigation messages
            connection.consoleLogs = [];
            debug(`Navigation detected (epoch: ${connection.navigationEpoch})`);
        });
    }
    /**
     * Connect to an existing Chrome instance running with remote debugging.
     *
     * @param connectionId - Unique identifier for this connection
     * @param host - Chrome host (default: localhost)
     * @param port - Chrome remote debugging port (default: 9222)
     * @returns Success message
     */
    async connect(connectionId, host = 'localhost', port = 9222) {
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
            const versionData = (await versionResponse.json());
            const wsUrl = versionData.webSocketDebuggerUrl;
            if (!wsUrl) {
                throw new Error('Could not find webSocketDebuggerUrl in response. Is Chrome running with --remote-debugging-port?');
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
            // Initialize connection
            const now = Date.now();
            const connection = {
                browser,
                page,
                cdpSession: null,
                wsUrl,
                pausedData: null,
                breakpoints: new Map(),
                debuggerEnabled: false,
                consoleLogs: [],
                consoleEnabled: true,
                navigationEpoch: 0,
                lastNavigationTime: now,
                hmrUpdateCount: 0,
                lastHmrTime: null,
                lastConsoleQuery: null,
                lastQueryEpoch: null,
                lastDOMSnapshot: null,
            };
            // Setup console capture and navigation tracking
            this.setupPageListeners(connection, page);
            // Store connection
            this.connections.set(connectionId, connection);
            // Set as active if first connection
            if (!this.activeConnectionId) {
                this.activeConnectionId = connectionId;
            }
            return `Connected to Chrome at ${host}:${port} (ID: ${connectionId})\nURL: ${page.url()}`;
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
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
    async launch(debugPort = 9222, connectionId, headless = false, userDataDir, extraArgs) {
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
            return `Launched Chrome on port ${debugPort} (ID: ${connId})\n${result}`;
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            return `Error: Failed to launch Chrome: ${message}`;
        }
    }
    /**
     * Disconnect from a Chrome connection.
     *
     * @param connectionId - Connection ID to disconnect
     * @returns Success message
     */
    async disconnect(connectionId) {
        const connection = this.connections.get(connectionId);
        if (!connection) {
            return `Error: No connection found with ID '${connectionId}'`;
        }
        try {
            // Disable debugger if enabled
            if (connection.debuggerEnabled && connection.cdpSession) {
                try {
                    await connection.cdpSession.send('Debugger.disable');
                }
                catch (error) {
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
            return `Disconnected from Chrome (ID: ${connectionId})`;
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            return `Error: Failed to disconnect: ${message}`;
        }
    }
    /**
     * Switch the active connection.
     *
     * @param connectionId - Connection ID to make active
     * @returns Success message
     */
    switchActive(connectionId) {
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
    async getConnectionsStatus() {
        const statuses = new Map();
        for (const [id, conn] of this.connections.entries()) {
            try {
                const url = conn.page.url();
                statuses.set(id, {
                    url,
                    active: id === this.activeConnectionId,
                    paused: conn.pausedData !== null,
                    debuggerEnabled: conn.debuggerEnabled,
                });
            }
            catch (error) {
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
    hasConnections() {
        return this.connections.size > 0;
    }
    /**
     * Get active connection ID.
     *
     * @returns Active connection ID or null if none
     */
    getActiveId() {
        return this.activeConnectionId;
    }
    /**
     * Switch to a different page within a connection.
     *
     * @param connectionId - Optional connection ID
     * @param page - New page to switch to
     */
    async switchPage(connectionId, page) {
        const connection = this.getConnection(connectionId);
        if (!connection) {
            throw new Error('No connection found');
        }
        // Update the page reference
        connection.page = page;
        // Increment navigation epoch and reset state
        connection.navigationEpoch++;
        connection.lastNavigationTime = Date.now();
        connection.hmrUpdateCount = 0;
        connection.lastHmrTime = null;
        connection.consoleLogs = [];
        connection.lastDOMSnapshot = null;
        // Re-setup console capture and navigation tracking on new page
        this.setupPageListeners(connection, page);
        // If debugger was enabled, need to recreate CDP session for new page
        if (connection.debuggerEnabled) {
            const newClient = await page.createCDPSession();
            connection.cdpSession = newClient;
            // Re-setup event handlers
            newClient.on('Debugger.paused', (params) => {
                connection.pausedData = params;
                debug(`Debugger paused: ${params.reason}`);
            });
            newClient.on('Debugger.resumed', () => {
                connection.pausedData = null;
                debug('Debugger resumed');
            });
            // Re-enable debugger
            await newClient.send('Debugger.enable');
        }
        debug(`Switched to new page (epoch: ${connection.navigationEpoch})`);
    }
    /**
     * Enable debugger for a connection and set up CDP session.
     *
     * @param connectionId - Optional connection ID
     * @returns CDP session
     */
    async enableDebugger(connectionId) {
        const connection = this.getConnection(connectionId);
        if (!connection) {
            const id = connectionId || 'active';
            throw new Error(`No Chrome connection '${id}' found. Use chrome_connect() or chrome_launch() first.`);
        }
        // Create CDP session if not exists
        if (!connection.cdpSession) {
            const client = await connection.page.createCDPSession();
            connection.cdpSession = client;
            // Set up event handlers
            client.on('Debugger.paused', (params) => {
                // Cast to our type - CDP types are compatible
                connection.pausedData = params;
                debug(`Debugger paused: ${params.reason}`);
            });
            client.on('Debugger.resumed', () => {
                connection.pausedData = null;
                debug('Debugger resumed');
            });
        }
        // Enable debugger if not already
        if (!connection.debuggerEnabled) {
            await connection.cdpSession.send('Debugger.enable');
            connection.debuggerEnabled = true;
            debug('Debugger enabled');
        }
        return connection.cdpSession;
    }
    /**
     * Get CDP session for a connection (must call enableDebugger first).
     *
     * @param connectionId - Optional connection ID
     * @returns CDP session or null if not enabled
     */
    getCDPSession(connectionId) {
        const connection = this.getConnection(connectionId);
        return connection?.cdpSession || null;
    }
    /**
     * Get connection by ID or active connection.
     *
     * @param connectionId - Optional connection ID
     * @returns Connection or null if not found
     */
    getConnection(connectionId) {
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
    getPausedData(connectionId) {
        const connection = this.getConnection(connectionId);
        return connection?.pausedData || null;
    }
    /**
     * Check if execution is paused.
     *
     * @param connectionId - Optional connection ID
     * @returns True if paused
     */
    isPaused(connectionId) {
        return this.getPausedData(connectionId) !== null;
    }
    /**
     * Get page for a connection.
     *
     * @param connectionId - Optional connection ID
     * @returns Page or null if not found
     */
    getPage(connectionId) {
        const connection = this.getConnection(connectionId);
        return connection?.page || null;
    }
    /**
     * SINGLE ENFORCER: Get connection or throw with clear error message.
     * All tools that need a connection should call this.
     *
     * @param connectionId - Optional connection ID
     * @returns Connection (never null)
     * @throws {ChromeNotConnectedError} If no connection exists
     */
    getConnectionOrThrow(connectionId) {
        const connection = this.getConnection(connectionId);
        if (!connection) {
            throw new ChromeNotConnectedError(connectionId);
        }
        return connection;
    }
    /**
     * Get page or throw with clear error message.
     * Uses getConnectionOrThrow internally.
     *
     * @param connectionId - Optional connection ID
     * @returns Page (never null)
     * @throws {ChromeNotConnectedError} If no connection exists
     */
    getPageOrThrow(connectionId) {
        const connection = this.getConnectionOrThrow(connectionId);
        return connection.page;
    }
    /**
     * Get CDP session or throw with DIFFERENTIATED error messages.
     * Distinguishes between "no connection" vs "debugger not enabled".
     *
     * @param connectionId - Optional connection ID
     * @returns CDP session (never null)
     * @throws {ChromeNotConnectedError} If no connection exists
     * @throws {DebuggerNotEnabledError} If debugger not enabled
     */
    getCDPSessionOrThrow(connectionId) {
        const connection = this.getConnectionOrThrow(connectionId); // Throws if no connection
        if (!connection.cdpSession || !connection.debuggerEnabled) {
            throw new DebuggerNotEnabledError(connectionId);
        }
        return connection.cdpSession;
    }
    /**
     * Verify execution is paused or throw.
     *
     * @param connectionId - Optional connection ID
     * @returns Paused data (never null)
     * @throws {ChromeNotConnectedError} If no connection exists
     * @throws {DebuggerNotEnabledError} If debugger not enabled
     * @throws {ExecutionNotPausedError} If not paused
     */
    requirePaused(connectionId) {
        this.getCDPSessionOrThrow(connectionId); // Ensures debugger is enabled first
        const pausedData = this.getPausedData(connectionId);
        if (!pausedData) {
            throw new ExecutionNotPausedError();
        }
        return pausedData;
    }
    /**
     * Verify execution is NOT paused or throw.
     *
     * @param connectionId - Optional connection ID
     * @throws {ChromeNotConnectedError} If no connection exists
     * @throws {DebuggerNotEnabledError} If debugger not enabled
     * @throws {ExecutionAlreadyPausedError} If already paused
     */
    requireNotPaused(connectionId) {
        this.getCDPSessionOrThrow(connectionId); // Ensures debugger is enabled first
        const pausedData = this.getPausedData(connectionId);
        if (pausedData) {
            throw new ExecutionAlreadyPausedError();
        }
    }
    /**
     * Set breakpoint for tracking.
     *
     * @param connectionId - Optional connection ID
     * @param breakpointId - Breakpoint ID from CDP
     * @param info - Breakpoint information
     */
    setBreakpoint(connectionId, breakpointId, info) {
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
    removeBreakpoint(connectionId, breakpointId) {
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
    getBreakpoints(connectionId) {
        const connection = this.getConnection(connectionId);
        return connection?.breakpoints || null;
    }
    /**
     * Get console logs for a connection.
     *
     * @param connectionId - Optional connection ID
     * @returns Console logs or empty array
     */
    getConsoleLogs(connectionId) {
        const connection = this.getConnection(connectionId);
        return connection?.consoleLogs || [];
    }
    /**
     * Clear console logs for a connection.
     *
     * @param connectionId - Optional connection ID
     */
    clearConsoleLogs(connectionId) {
        const connection = this.getConnection(connectionId);
        if (connection) {
            connection.consoleLogs = [];
        }
    }
    /**
     * Get previous step variables for change tracking (P2).
     *
     * @param connectionId - Optional connection ID
     * @returns Previous variables or undefined if none
     */
    getPreviousStepVars(connectionId) {
        const connection = this.getConnection(connectionId);
        return connection?.previousStepVars;
    }
    /**
     * Set previous step variables for change tracking (P2).
     *
     * @param connectionId - Optional connection ID
     * @param vars - Variable name to value mapping
     */
    setPreviousStepVars(connectionId, vars) {
        const connection = this.getConnection(connectionId);
        if (connection) {
            connection.previousStepVars = vars;
        }
    }
    /**
     * Check if debugger is enabled for active connection.
     */
    isDebuggerEnabled(connectionId) {
        const connection = this.getConnection(connectionId);
        return connection?.debuggerEnabled ?? false;
    }
}
// Global browser manager instance
export const browserManager = new BrowserManager();
//# sourceMappingURL=browser.js.map