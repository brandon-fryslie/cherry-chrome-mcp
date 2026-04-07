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
export const MAX_RESULT_SIZE = 5000;
/**
 * Enable debug logging to stderr.
 */
export const DEBUG = process.env.DEBUG === 'true' || process.env.DEBUG === '1';
/**
 * CDP command timeout in milliseconds.
 */
export const CDP_TIMEOUT = 10_000;
/**
 * Wait time after launching Chrome before connecting (ms).
 */
export const CHROME_LAUNCH_WAIT = 2000;
//# sourceMappingURL=config.js.map