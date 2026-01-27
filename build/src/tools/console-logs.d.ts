/**
 * Console Logs Module
 *
 * Separated into pure functions for data transformation and formatting,
 * with side effects pushed to the edges.
 *
 * Architecture:
 * - Pure functions: filterLogs, limitLogs, buildPageState, formatLogs
 * - Side effects: getConsoleLogs (the exported tool handler)
 */
import type { ConsoleMessage, Connection } from '../types.js';
import { compressLogs } from './console-pattern.js';
/**
 * Page state information derived from connection
 */
export interface PageState {
    /** Change status since last query */
    changeStatus: 'reloaded' | 'hmr_updated' | 'unchanged' | 'first_query';
    /** Current navigation epoch */
    navigationEpoch: number;
    /** Time since last navigation */
    lastNavigationTime: number;
    /** HMR update count (0 if none) */
    hmrUpdateCount: number;
    /** Time of last HMR update (null if none) */
    lastHmrTime: number | null;
}
/**
 * Processed log data ready for formatting
 */
export interface ProcessedLogs {
    /** Filtered and limited logs or compressed result */
    logs: ConsoleMessage[];
    /** Compression result (if compression was applied) */
    compressionResult?: ReturnType<typeof compressLogs>;
    /** Total logs before filtering */
    totalBeforeFilter: number;
    /** Total logs after filtering */
    totalAfterFilter: number;
    /** Number of logs shown */
    shown: number;
    /** Active filter level */
    filterLevel: string;
    /** Whether stack traces should be expanded */
    expandErrors: boolean;
}
/**
 * Query parameters for console logs
 */
export interface ConsoleLogsQuery {
    filterLevel: string;
    limit: number;
    expandErrors: boolean;
}
/**
 * Filter logs by level
 *
 * @param logs - Raw console logs
 * @param level - Level to filter by ('all' for no filter)
 * @returns Filtered logs
 */
export declare function filterLogsByLevel(logs: ConsoleMessage[], level: string): ConsoleMessage[];
/**
 * Apply limit to logs (takes most recent)
 *
 * @param logs - Logs to limit
 * @param limit - Maximum number of logs
 * @returns Limited logs (most recent)
 */
export declare function limitLogs(logs: ConsoleMessage[], limit: number): ConsoleMessage[];
/**
 * Determine page state change status
 *
 * @param connection - Connection state
 * @returns Change status
 */
export declare function determineChangeStatus(connection: Pick<Connection, 'lastQueryEpoch' | 'lastConsoleQuery' | 'navigationEpoch' | 'hmrUpdateCount' | 'lastHmrTime'>): PageState['changeStatus'];
/**
 * Extract page state from connection (pure read)
 *
 * @param connection - Connection to read from
 * @returns Page state information
 */
export declare function extractPageState(connection: Pick<Connection, 'lastQueryEpoch' | 'lastConsoleQuery' | 'navigationEpoch' | 'lastNavigationTime' | 'hmrUpdateCount' | 'lastHmrTime'>): PageState;
/**
 * Process logs through filtering, compression (optional), and limiting
 *
 * @param logs - Raw console logs
 * @param query - Query parameters
 * @returns Processed log data
 */
export declare function processLogs(logs: ConsoleMessage[], query: ConsoleLogsQuery): ProcessedLogs;
/**
 * Format time difference as human-readable string
 */
export declare function formatTimeSince(timestamp: number, now?: number): string;
/**
 * Format page state header
 *
 * @param state - Page state
 * @param now - Current timestamp (for testing)
 * @returns Formatted header lines
 */
export declare function formatPageStateHeader(state: PageState, now?: number): string[];
/**
 * Format a single log with optional stack trace expansion
 */
export declare function formatLogWithStack(log: ConsoleMessage, expandErrors: boolean): string[];
/**
 * Format processed logs for display
 *
 * @param processed - Processed log data
 * @returns Formatted log lines
 */
export declare function formatProcessedLogs(processed: ProcessedLogs): string[];
/**
 * Format complete console logs output
 *
 * @param pageState - Page state information
 * @param processed - Processed log data
 * @param now - Current timestamp (for testing)
 * @returns Complete formatted output
 */
export declare function formatConsoleLogsOutput(pageState: PageState, processed: ProcessedLogs, now?: number): string;
/**
 * Update connection query tracking state (side effect)
 *
 * @param connection - Connection to update
 * @param now - Current timestamp
 */
export declare function updateQueryTracking(connection: Pick<Connection, 'lastConsoleQuery' | 'lastQueryEpoch' | 'navigationEpoch'>, now?: number): void;
//# sourceMappingURL=console-logs.d.ts.map