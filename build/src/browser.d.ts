/**
 * Browser & Connection Management for Cherry Chrome MCP
 * Ported from Python CDPConnectionManager
 *
 * Manages multiple Chrome connections via Puppeteer.
 * Each connection has its own Browser, Page, and CDP session.
 */
import type { Page, CDPSession } from 'puppeteer';
import type { Connection, ConnectionStatus, DebuggerPausedEvent, BreakpointInfo, ConsoleMessage } from './types.js';
/**
 * Browser Manager - handles multiple Chrome connections
 * Ported from Python CDPConnectionManager
 */
export declare class BrowserManager {
    private connections;
    private activeConnectionId;
    /**
     * Setup console capture and navigation tracking for a page
     */
    private setupPageListeners;
    /**
     * Connect to an existing Chrome instance running with remote debugging.
     *
     * @param connectionId - Unique identifier for this connection
     * @param host - Chrome host (default: localhost)
     * @param port - Chrome remote debugging port (default: 9222)
     * @returns Success message
     */
    connect(connectionId: string, host?: string, port?: number): Promise<string>;
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
    launch(debugPort?: number, connectionId?: string, headless?: boolean, userDataDir?: string, extraArgs?: string): Promise<string>;
    /**
     * Disconnect from a Chrome connection.
     *
     * @param connectionId - Connection ID to disconnect
     * @returns Success message
     */
    disconnect(connectionId: string): Promise<string>;
    /**
     * Switch the active connection.
     *
     * @param connectionId - Connection ID to make active
     * @returns Success message
     */
    switchActive(connectionId: string): string;
    /**
     * Get information about all connections.
     *
     * @returns Map of connection IDs to their status
     */
    getConnectionsStatus(): Promise<Map<string, ConnectionStatus>>;
    /**
     * Check if there are any connections.
     */
    hasConnections(): boolean;
    /**
     * Get active connection ID.
     *
     * @returns Active connection ID or null if none
     */
    getActiveId(): string | null;
    /**
     * Switch to a different page within a connection.
     *
     * @param connectionId - Optional connection ID
     * @param page - New page to switch to
     */
    switchPage(connectionId: string | undefined, page: Page): Promise<void>;
    /**
     * Enable debugger for a connection and set up CDP session.
     *
     * @param connectionId - Optional connection ID
     * @returns CDP session
     */
    enableDebugger(connectionId?: string): Promise<CDPSession>;
    /**
     * Get CDP session for a connection (must call enableDebugger first).
     *
     * @param connectionId - Optional connection ID
     * @returns CDP session or null if not enabled
     */
    getCDPSession(connectionId?: string): CDPSession | null;
    /**
     * Get connection by ID or active connection.
     *
     * @param connectionId - Optional connection ID
     * @returns Connection or null if not found
     */
    getConnection(connectionId?: string): Connection | null;
    /**
     * Get paused debugger data for a connection.
     *
     * @param connectionId - Optional connection ID
     * @returns Paused data or null if not paused
     */
    getPausedData(connectionId?: string): DebuggerPausedEvent | null;
    /**
     * Check if execution is paused.
     *
     * @param connectionId - Optional connection ID
     * @returns True if paused
     */
    isPaused(connectionId?: string): boolean;
    /**
     * Get page for a connection.
     *
     * @param connectionId - Optional connection ID
     * @returns Page or null if not found
     */
    getPage(connectionId?: string): Page | null;
    /**
     * SINGLE ENFORCER: Get connection or throw with clear error message.
     * All tools that need a connection should call this.
     *
     * @param connectionId - Optional connection ID
     * @returns Connection (never null)
     * @throws {ChromeNotConnectedError} If no connection exists
     */
    getConnectionOrThrow(connectionId?: string): Connection;
    /**
     * Get page or throw with clear error message.
     * Uses getConnectionOrThrow internally.
     *
     * @param connectionId - Optional connection ID
     * @returns Page (never null)
     * @throws {ChromeNotConnectedError} If no connection exists
     */
    getPageOrThrow(connectionId?: string): Page;
    /**
     * Get CDP session or throw with DIFFERENTIATED error messages.
     * Distinguishes between "no connection" vs "debugger not enabled".
     *
     * @param connectionId - Optional connection ID
     * @returns CDP session (never null)
     * @throws {ChromeNotConnectedError} If no connection exists
     * @throws {DebuggerNotEnabledError} If debugger not enabled
     */
    getCDPSessionOrThrow(connectionId?: string): CDPSession;
    /**
     * Verify execution is paused or throw.
     *
     * @param connectionId - Optional connection ID
     * @returns Paused data (never null)
     * @throws {ChromeNotConnectedError} If no connection exists
     * @throws {DebuggerNotEnabledError} If debugger not enabled
     * @throws {ExecutionNotPausedError} If not paused
     */
    requirePaused(connectionId?: string): DebuggerPausedEvent;
    /**
     * Verify execution is NOT paused or throw.
     *
     * @param connectionId - Optional connection ID
     * @throws {ChromeNotConnectedError} If no connection exists
     * @throws {DebuggerNotEnabledError} If debugger not enabled
     * @throws {ExecutionAlreadyPausedError} If already paused
     */
    requireNotPaused(connectionId?: string): void;
    /**
     * Set breakpoint for tracking.
     *
     * @param connectionId - Optional connection ID
     * @param breakpointId - Breakpoint ID from CDP
     * @param info - Breakpoint information
     */
    setBreakpoint(connectionId: string | undefined, breakpointId: string, info: BreakpointInfo): void;
    /**
     * Remove breakpoint from tracking.
     *
     * @param connectionId - Optional connection ID
     * @param breakpointId - Breakpoint ID
     */
    removeBreakpoint(connectionId: string | undefined, breakpointId: string): void;
    /**
     * Get all breakpoints for a connection.
     *
     * @param connectionId - Optional connection ID
     * @returns Map of breakpoint IDs to info
     */
    getBreakpoints(connectionId?: string): Map<string, BreakpointInfo> | null;
    /**
     * Get console logs for a connection.
     *
     * @param connectionId - Optional connection ID
     * @returns Console logs or empty array
     */
    getConsoleLogs(connectionId?: string): ConsoleMessage[];
    /**
     * Clear console logs for a connection.
     *
     * @param connectionId - Optional connection ID
     */
    clearConsoleLogs(connectionId?: string): void;
    /**
     * Get previous step variables for change tracking (P2).
     *
     * @param connectionId - Optional connection ID
     * @returns Previous variables or undefined if none
     */
    getPreviousStepVars(connectionId?: string): Record<string, string> | undefined;
    /**
     * Set previous step variables for change tracking (P2).
     *
     * @param connectionId - Optional connection ID
     * @param vars - Variable name to value mapping
     */
    setPreviousStepVars(connectionId: string | undefined, vars: Record<string, string>): void;
    /**
     * Check if debugger is enabled for active connection.
     */
    isDebuggerEnabled(connectionId?: string): boolean;
}
export declare const browserManager: BrowserManager;
//# sourceMappingURL=browser.d.ts.map