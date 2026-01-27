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
import { compressLogs, formatCompressedLogs } from './console-pattern.js';
// ============================================================================
// Pure Functions - Data Transformation
// ============================================================================
/**
 * Filter logs by level
 *
 * @param logs - Raw console logs
 * @param level - Level to filter by ('all' for no filter)
 * @returns Filtered logs
 */
export function filterLogsByLevel(logs, level) {
    if (level === 'all') {
        return logs;
    }
    return logs.filter((log) => log.level === level);
}
/**
 * Apply limit to logs (takes most recent)
 *
 * @param logs - Logs to limit
 * @param limit - Maximum number of logs
 * @returns Limited logs (most recent)
 */
export function limitLogs(logs, limit) {
    return logs.slice(-limit);
}
/**
 * Determine page state change status
 *
 * @param connection - Connection state
 * @returns Change status
 */
export function determineChangeStatus(connection) {
    const { lastQueryEpoch, lastConsoleQuery, navigationEpoch, hmrUpdateCount, lastHmrTime } = connection;
    if (lastQueryEpoch === null || lastConsoleQuery === null) {
        return 'first_query';
    }
    if (lastQueryEpoch < navigationEpoch) {
        return 'reloaded';
    }
    if (hmrUpdateCount > 0 && lastHmrTime !== null && lastHmrTime > lastConsoleQuery) {
        return 'hmr_updated';
    }
    return 'unchanged';
}
/**
 * Extract page state from connection (pure read)
 *
 * @param connection - Connection to read from
 * @returns Page state information
 */
export function extractPageState(connection) {
    return {
        changeStatus: determineChangeStatus(connection),
        navigationEpoch: connection.navigationEpoch,
        lastNavigationTime: connection.lastNavigationTime,
        hmrUpdateCount: connection.hmrUpdateCount,
        lastHmrTime: connection.lastHmrTime,
    };
}
/**
 * Process logs through filtering, compression (optional), and limiting
 *
 * @param logs - Raw console logs
 * @param query - Query parameters
 * @returns Processed log data
 */
export function processLogs(logs, query) {
    const { filterLevel, limit, expandErrors } = query;
    // Step 1: Filter by level
    const filtered = filterLogsByLevel(logs, filterLevel);
    // Step 2: Either expand errors (skip compression) or compress then limit
    if (expandErrors) {
        // When expanding errors, skip compression and apply limit to raw logs
        const limited = limitLogs(filtered, limit);
        return {
            logs: limited,
            totalBeforeFilter: logs.length,
            totalAfterFilter: filtered.length,
            shown: limited.length,
            filterLevel,
            expandErrors: true,
        };
    }
    // Step 3: Compress ALL logs first
    const compressionResult = compressLogs(filtered);
    // Step 4: Apply limit to compressed items (from the end, most recent)
    const limitedItems = compressionResult.compressed.slice(-limit);
    // Create limited compression result for formatting
    const limitedCompressionResult = {
        ...compressionResult,
        compressed: limitedItems,
    };
    return {
        logs: filtered,
        compressionResult: limitedCompressionResult,
        totalBeforeFilter: logs.length,
        totalAfterFilter: filtered.length,
        shown: limitedItems.length,
        filterLevel,
        expandErrors: false,
    };
}
// ============================================================================
// Pure Functions - Formatting
// ============================================================================
/**
 * Format time difference as human-readable string
 */
export function formatTimeSince(timestamp, now = Date.now()) {
    const seconds = Math.floor((now - timestamp) / 1000);
    if (seconds < 60)
        return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60)
        return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24)
        return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
}
/**
 * Format page state header
 *
 * @param state - Page state
 * @param now - Current timestamp (for testing)
 * @returns Formatted header lines
 */
export function formatPageStateHeader(state, now = Date.now()) {
    const lines = [];
    lines.push('--- PAGE STATE ---');
    // Change status message
    switch (state.changeStatus) {
        case 'reloaded':
            lines.push('[PAGE RELOADED since your last query]');
            break;
        case 'hmr_updated':
            lines.push('[HMR UPDATE occurred since your last query]');
            break;
        case 'unchanged':
            lines.push('[No changes since your last query]');
            break;
        case 'first_query':
            // No status message for first query
            break;
    }
    // Current page state
    lines.push(`Navigation epoch: ${state.navigationEpoch}`);
    lines.push(`Last navigation: ${formatTimeSince(state.lastNavigationTime, now)}`);
    if (state.hmrUpdateCount > 0 && state.lastHmrTime !== null) {
        lines.push(`HMR updates since navigation: ${state.hmrUpdateCount}`);
        lines.push(`Last HMR update: ${formatTimeSince(state.lastHmrTime, now)}`);
    }
    lines.push('');
    return lines;
}
/**
 * Format a single log with optional stack trace expansion
 */
export function formatLogWithStack(log, expandErrors) {
    const lines = [];
    const timestamp = new Date(log.timestamp).toISOString().split('T')[1].slice(0, 12);
    const location = log.url ? ` (${log.url}${log.lineNumber ? `:${log.lineNumber}` : ''})` : '';
    lines.push(`[${timestamp}] [${log.level.toUpperCase()}] ${log.text}${location}`);
    // Include stack trace for errors when expand_errors is true
    if (expandErrors && log.level === 'error') {
        if (log.stackTrace) {
            // Full Error.stack string - indent each line
            const stackLines = log.stackTrace.split('\n').slice(1); // Skip first line (error message, already shown)
            for (const stackLine of stackLines) {
                if (stackLine.trim()) {
                    lines.push(`    ${stackLine.trim()}`);
                }
            }
        }
        else if (log.stackLocations && log.stackLocations.length > 0) {
            // Fall back to Puppeteer stack locations
            lines.push('    Stack trace:');
            for (const loc of log.stackLocations) {
                const file = loc.url?.split('/').pop() || loc.url || 'unknown';
                const line = loc.lineNumber !== undefined ? `:${loc.lineNumber}` : '';
                const col = loc.columnNumber !== undefined ? `:${loc.columnNumber}` : '';
                lines.push(`      at ${file}${line}${col}`);
            }
        }
    }
    return lines;
}
/**
 * Format processed logs for display
 *
 * @param processed - Processed log data
 * @returns Formatted log lines
 */
export function formatProcessedLogs(processed) {
    const { totalAfterFilter, shown, filterLevel, expandErrors, compressionResult, logs } = processed;
    if (totalAfterFilter === 0) {
        return [`No console messages captured${filterLevel !== 'all' ? ` (filter: ${filterLevel})` : ''}.`];
    }
    const lines = [];
    lines.push('--- CONSOLE MESSAGES ---');
    if (expandErrors) {
        // Format individual logs with stack traces
        lines.push(`Showing ${shown} of ${totalAfterFilter}${filterLevel !== 'all' ? ` (filter: ${filterLevel})` : ''} (with stack traces):`);
        lines.push('');
        const limitedLogs = logs.slice(-shown);
        for (const log of limitedLogs) {
            const logLines = formatLogWithStack(log, true);
            lines.push(...logLines);
        }
    }
    else if (compressionResult) {
        // Format compressed logs
        const formattedLogs = formatCompressedLogs(compressionResult);
        lines.push(...formattedLogs);
    }
    return lines;
}
/**
 * Format complete console logs output
 *
 * @param pageState - Page state information
 * @param processed - Processed log data
 * @param now - Current timestamp (for testing)
 * @returns Complete formatted output
 */
export function formatConsoleLogsOutput(pageState, processed, now = Date.now()) {
    const lines = [];
    // Page state header
    lines.push(...formatPageStateHeader(pageState, now));
    // Logs content
    lines.push(...formatProcessedLogs(processed));
    return lines.join('\n');
}
// ============================================================================
// Side Effect: Connection State Update
// ============================================================================
/**
 * Update connection query tracking state (side effect)
 *
 * @param connection - Connection to update
 * @param now - Current timestamp
 */
export function updateQueryTracking(connection, now = Date.now()) {
    connection.lastConsoleQuery = now;
    connection.lastQueryEpoch = connection.navigationEpoch;
}
//# sourceMappingURL=console-logs.js.map