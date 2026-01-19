/**
 * Custom error classes for Chrome connection state handling.
 *
 * These errors provide clear, actionable messages for common failure modes:
 * - ChromeNotConnectedError: No browser connection exists
 * - DebuggerNotEnabledError: Connection exists but debugger not enabled
 * - ExecutionNotPausedError: Debugger enabled but not paused at breakpoint
 */
/**
 * Thrown when a tool requires a Chrome connection but none exists.
 */
export declare class ChromeNotConnectedError extends Error {
    constructor(connectionId?: string);
}
/**
 * Thrown when a tool requires the JavaScript debugger but it hasn't been enabled.
 */
export declare class DebuggerNotEnabledError extends Error {
    constructor(connectionId?: string);
}
/**
 * Thrown when a tool requires execution to be paused but it isn't.
 */
export declare class ExecutionNotPausedError extends Error {
    constructor();
}
/**
 * Thrown when execution is already paused but the operation requires it to be running.
 */
export declare class ExecutionAlreadyPausedError extends Error {
    constructor();
}
//# sourceMappingURL=errors.d.ts.map