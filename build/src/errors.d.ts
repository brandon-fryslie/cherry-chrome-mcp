/**
 * Custom error classes for Chrome connection state handling.
 *
 * Error Classification System:
 * Each custom error class includes errorInfo metadata for classification:
 * - errorType: One of CONNECTION, DEBUGGER, STATE, EXECUTION
 * - recoverable: Whether user action can resolve the error
 * - suggestion: Specific tool/action to resolve the error
 *
 * Error Types:
 * CONNECTION: User needs to connect to Chrome (chrome() tool)
 * DEBUGGER: User needs to enable debugger (enable_debug_tools())
 * STATE: Execution not in required state (pause/resume/breakpoint)
 * EXECUTION: Operation failed during execution (check parameters)
 *
 * These errors provide clear, actionable messages for common failure modes:
 * - ChromeNotConnectedError: No browser connection exists
 * - DebuggerNotEnabledError: Connection exists but debugger not enabled
 * - ExecutionNotPausedError: Debugger enabled but not paused at breakpoint
 */
/**
 * Error metadata for classification and recovery guidance.
 */
interface ErrorInfo {
    readonly errorType: 'CONNECTION' | 'DEBUGGER' | 'STATE' | 'EXECUTION' | 'UNKNOWN';
    readonly recoverable: boolean;
    readonly suggestion?: string;
}
/**
 * Thrown when a tool requires a Chrome connection but none exists.
 */
export declare class ChromeNotConnectedError extends Error {
    readonly errorInfo: ErrorInfo;
    constructor(connectionId?: string);
}
/**
 * Thrown when a tool requires the JavaScript debugger but it hasn't been enabled.
 */
export declare class DebuggerNotEnabledError extends Error {
    readonly errorInfo: ErrorInfo;
    constructor(connectionId?: string);
}
/**
 * Thrown when a tool requires execution to be paused but it isn't.
 */
export declare class ExecutionNotPausedError extends Error {
    readonly errorInfo: ErrorInfo;
    constructor();
}
/**
 * Thrown when execution is already paused but the operation requires it to be running.
 */
export declare class ExecutionAlreadyPausedError extends Error {
    readonly errorInfo: ErrorInfo;
    constructor();
}
export {};
//# sourceMappingURL=errors.d.ts.map