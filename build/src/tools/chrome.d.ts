/**
 * Chrome Connection Management Tools
 * Ported from Python chrome_connect, chrome_launch, etc.
 */
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
export declare function connect(args: {
    url: string;
    port?: number;
    connection_id?: string;
    headless?: boolean;
    user_data_dir?: string;
    extra_args?: string;
}): Promise<{
    content: Array<{
        type: 'text';
        text: string;
    }>;
    isError?: boolean;
}>;
/**
 * List all active Chrome connections.
 *
 * Shows connection ID, WebSocket URL, active status, and paused state for each connection.
 */
export declare function chromeListConnections(): Promise<{
    content: Array<{
        type: 'text';
        text: string;
    }>;
}>;
/**
 * Switch the active Chrome connection.
 *
 * All debugger and DOM tools will use the active connection.
 */
export declare function chromeSwitchConnection(args: {
    connection_id: string;
}): Promise<{
    content: Array<{
        type: 'text';
        text: string;
    }>;
    isError?: boolean;
}>;
/**
 * Disconnect from a specific Chrome instance.
 *
 * If you disconnect the active connection, the next available connection
 * will become active automatically.
 */
export declare function chromeDisconnect(args: {
    connection_id: string;
}): Promise<{
    content: Array<{
        type: 'text';
        text: string;
    }>;
    isError?: boolean;
}>;
/**
 * List all targets (pages, workers, service workers) for a connection.
 *
 * Shows which target is currently active. Use switch_target to change.
 */
export declare function listTargets(args: {
    connection_id?: string;
}): Promise<{
    content: Array<{
        type: 'text';
        text: string;
    }>;
    isError?: boolean;
}>;
/**
 * Switch to a different target (page, worker) within the current connection.
 *
 * Can switch by index number, title pattern, or URL pattern.
 */
export declare function switchTarget(args: {
    index?: number;
    title?: string;
    url?: string;
    connection_id?: string;
}): Promise<{
    content: Array<{
        type: 'text';
        text: string;
    }>;
    isError?: boolean;
}>;
/**
 * target - List or switch browser targets (pages).
 *
 * action: "list" shows all targets; "switch" switches by index/title/url.
 */
export declare function target(args: {
    action: 'list' | 'switch';
    index?: number;
    title?: string;
    url?: string;
    connection_id?: string;
}): Promise<{
    content: Array<{
        type: 'text';
        text: string;
    }>;
    isError?: boolean;
}>;
/**
 * META TOOL: Enable debug tools
 *
 * Shows debugger tools by enabling the debugger.
 * This provides semantic intent for showing debugging capabilities.
 */
export declare function enableDebugTools(args: {
    connection_id?: string;
}): Promise<{
    content: Array<{
        type: 'text';
        text: string;
    }>;
    isError?: boolean;
}>;
//# sourceMappingURL=chrome.d.ts.map