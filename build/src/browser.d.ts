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
    private hiddenTools;
    private toolListChangedCallback;
    /**
     * Set callback for tool list changes (used for P1: Dynamic Tool Visibility).
     * This callback is invoked when connection state changes that affect tool visibility.
     */
    setToolListChangedCallback(callback: () => void): void;
    /**
     * Notify that tool list has changed (P1: Dynamic Tool Visibility)
     */
    private notifyToolListChanged;
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
     * Hide tools by pattern or names.
     *
     * @param pattern - Pattern to match (e.g., "chrome_*")
     * @param toolNames - Specific tool names to hide
     * @returns Number of tools hidden
     */
    hideTools(pattern?: string, toolNames?: string[]): number;
    /**
     * Show (restore) hidden tools.
     *
     * @param all - Restore all hidden tools
     * @param toolNames - Specific tool names to restore
     * @returns Number of tools restored
     */
    showTools(all?: boolean, toolNames?: string[]): number;
    /**
     * Check if a tool should be hidden based on hidden patterns.
     *
     * @param toolName - Tool name to check
     * @returns True if tool should be hidden
     */
    isToolHidden(toolName: string): boolean;
    /**
     * Check if debugger is enabled for active connection.
     */
    isDebuggerEnabled(connectionId?: string): boolean;
}
export declare const browserManager: BrowserManager;
//# sourceMappingURL=browser.d.ts.map