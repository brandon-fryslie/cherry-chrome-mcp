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
/**
 * Feature toggle: Use legacy granular tools instead of smart consolidated tools.
 *
 * When false (default): Uses new consolidated smart tools
 *   - chrome (replaces chrome_connect, chrome_launch)
 *   - target (replaces list_targets, switch_target)
 *   - step (replaces debugger_step_over, debugger_step_into, debugger_step_out)
 *   - execution (replaces debugger_resume, debugger_pause)
 *   - breakpoint (replaces debugger_set_breakpoint, debugger_remove_breakpoint)
 *   - enable_debug_tools (replaces debugger_enable with semantic intent)
 *   - call_stack, evaluate, pause_on_exceptions (renamed for consistency)
 *
 * When true: Uses original granular tools for backward compatibility
 *   - chrome_connect, chrome_launch, chrome_disconnect, etc.
 *   - debugger_enable, debugger_step_over, debugger_step_into, etc.
 *
 * Set via environment variable: USE_LEGACY_TOOLS=true
 */
export declare const USE_LEGACY_TOOLS: boolean;
//# sourceMappingURL=config.d.ts.map