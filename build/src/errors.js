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
export class ChromeNotConnectedError extends Error {
    constructor(connectionId) {
        const id = connectionId || 'default';
        super(`No Chrome connection '${id}' found.\n\n` +
            `To connect:\n` +
            `  1. Start Chrome with: google-chrome --remote-debugging-port=9222\n` +
            `  2. Call: chrome({ action: "connect" }) or chrome({ action: "launch" })`);
        this.name = 'ChromeNotConnectedError';
    }
}
/**
 * Thrown when a tool requires the JavaScript debugger but it hasn't been enabled.
 */
export class DebuggerNotEnabledError extends Error {
    constructor(connectionId) {
        const id = connectionId || 'default';
        super(`Debugger not enabled for connection '${id}'.\n\n` +
            `Call enable_debug_tools() first to enable the JavaScript debugger.`);
        this.name = 'DebuggerNotEnabledError';
    }
}
/**
 * Thrown when a tool requires execution to be paused but it isn't.
 */
export class ExecutionNotPausedError extends Error {
    constructor() {
        super(`Execution is not paused.\n\n` +
            `To pause:\n` +
            `  - Set a breakpoint: breakpoint({ action: "set", url: "...", line_number: N })\n` +
            `  - Or call: execution({ action: "pause" })`);
        this.name = 'ExecutionNotPausedError';
    }
}
/**
 * Thrown when execution is already paused but the operation requires it to be running.
 */
export class ExecutionAlreadyPausedError extends Error {
    constructor() {
        super(`Execution is already paused.\n\n` +
            `To resume:\n` +
            `  - Call: execution({ action: "resume" })\n` +
            `  - Or step through code: step({ direction: "over" | "into" | "out" })`);
        this.name = 'ExecutionAlreadyPausedError';
    }
}
//# sourceMappingURL=errors.js.map