/**
 * Chrome Connection Management Tools
 * Ported from Python chrome_connect, chrome_launch, etc.
 */
/**
 * Connect to a Chrome instance running with remote debugging enabled.
 *
 * Chrome must be launched with --remote-debugging-port flag.
 * You can connect to multiple Chrome instances by specifying different connection_ids.
 */
export declare function chromeConnect(args: {
    port?: number;
    connection_id?: string;
    host?: string;
}): Promise<{
    content: Array<{
        type: 'text';
        text: string;
    }>;
    isError?: boolean;
}>;
/**
 * Launch a new Chrome instance with remote debugging enabled.
 *
 * Automatically connects to the launched instance after startup.
 */
export declare function chromeLaunch(args: {
    debug_port?: number;
    headless?: boolean;
    user_data_dir?: string;
    extra_args?: string;
    connection_id?: string;
}): Promise<{
    content: Array<{
        type: 'text';
        text: string;
    }>;
    isError?: boolean;
}>;
/**
 * CONSOLIDATED: chrome - Connect or launch Chrome
 *
 * Replaces chrome_connect and chrome_launch with a single tool.
 */
export declare function chrome(args: {
    action: 'connect' | 'launch';
    port?: number;
    host?: string;
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
 * CONSOLIDATED: target - List or switch targets (pages)
 *
 * Replaces list_targets and switch_target with a single tool.
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