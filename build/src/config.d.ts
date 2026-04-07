/**
 * Configuration constants for Cherry Chrome MCP
 * Ported from Python config.py
 */
/**
 * Maximum result size in characters.
 * Results larger than this will be REJECTED with a helpful error message
 * (not truncated - that would waste tokens on incomplete data).
 * 5000 chars approximately equals 1250 tokens.
 */
export declare const MAX_RESULT_SIZE = 5000;
/**
 * Enable debug logging to stderr.
 */
export declare const DEBUG: boolean;
/**
 * CDP command timeout in milliseconds.
 */
export declare const CDP_TIMEOUT = 10000;
/**
 * Wait time after launching Chrome before connecting (ms).
 */
export declare const CHROME_LAUNCH_WAIT = 2000;
//# sourceMappingURL=config.d.ts.map