/**
 * Chrome Debugger Tools
 * Ported from Python debugger tools
 *
 * Full JavaScript debugger support via CDP.
 */
/**
 * Enable the Chrome debugger for the current connection.
 *
 * Must be called before using any debugger features.
 */
export declare function debuggerEnable(args: {
    connection_id?: string;
}): Promise<{
    content: Array<{
        type: 'text';
        text: string;
    }>;
    isError?: boolean;
}>;
/**
 * Set a breakpoint at a specific line in a script.
 *
 * You can optionally add a condition (breakpoint only triggers when condition is true).
 */
export declare function debuggerSetBreakpoint(args: {
    url: string;
    line_number: number;
    column_number?: number;
    condition?: string;
    connection_id?: string;
}): Promise<{
    content: Array<{
        type: 'text';
        text: string;
    }>;
    isError?: boolean;
}>;
/**
 * Remove a breakpoint by its ID.
 *
 * You can see breakpoint IDs in the debugger_get_call_stack output or when you set the breakpoint.
 */
export declare function debuggerRemoveBreakpoint(args: {
    breakpoint_id: string;
    connection_id?: string;
}): Promise<{
    content: Array<{
        type: 'text';
        text: string;
    }>;
    isError?: boolean;
}>;
/**
 * Get the current call stack when execution is paused.
 *
 * Shows all stack frames with function names, locations, and scope information.
 */
export declare function debuggerGetCallStack(args: {
    connection_id?: string;
}): Promise<{
    content: Array<{
        type: 'text';
        text: string;
    }>;
    isError?: boolean;
}>;
/**
 * Evaluate a JavaScript expression in the context of a specific call frame.
 *
 * Useful for inspecting variables while paused at a breakpoint.
 */
export declare function debuggerEvaluateOnCallFrame(args: {
    call_frame_id: string;
    expression: string;
    connection_id?: string;
}): Promise<{
    content: Array<{
        type: 'text';
        text: string;
    }>;
    isError?: boolean;
}>;
/**
 * Step over the current line of code.
 *
 * Continues to the next line in the current function.
 */
export declare function debuggerStepOver(args: {
    connection_id?: string;
}): Promise<{
    content: Array<{
        type: 'text';
        text: string;
    }>;
    isError?: boolean;
}>;
/**
 * Step into a function call.
 *
 * Enters the function being called on the current line.
 */
export declare function debuggerStepInto(args: {
    connection_id?: string;
}): Promise<{
    content: Array<{
        type: 'text';
        text: string;
    }>;
    isError?: boolean;
}>;
/**
 * Step out of the current function.
 *
 * Returns to the calling function.
 */
export declare function debuggerStepOut(args: {
    connection_id?: string;
}): Promise<{
    content: Array<{
        type: 'text';
        text: string;
    }>;
    isError?: boolean;
}>;
/**
 * Resume execution after being paused.
 *
 * Continues until the next breakpoint or debugger statement.
 */
export declare function debuggerResume(args: {
    connection_id?: string;
}): Promise<{
    content: Array<{
        type: 'text';
        text: string;
    }>;
    isError?: boolean;
}>;
/**
 * Pause execution immediately.
 *
 * Stops at the next JavaScript statement.
 */
export declare function debuggerPause(args: {
    connection_id?: string;
}): Promise<{
    content: Array<{
        type: 'text';
        text: string;
    }>;
    isError?: boolean;
}>;
/**
 * Configure whether to pause on exceptions.
 *
 * Options: 'none' (default), 'uncaught', or 'all'.
 */
export declare function debuggerSetPauseOnExceptions(args: {
    state: 'none' | 'uncaught' | 'all';
    connection_id?: string;
}): Promise<{
    content: Array<{
        type: 'text';
        text: string;
    }>;
    isError?: boolean;
}>;
/**
 * CONSOLIDATED: breakpoint - Set or remove breakpoints
 *
 * Replaces debugger_set_breakpoint and debugger_remove_breakpoint with a single tool.
 */
export declare function breakpoint(args: {
    action: 'set' | 'remove';
    url?: string;
    line_number?: number;
    column_number?: number;
    condition?: string;
    breakpoint_id?: string;
    connection_id?: string;
}): Promise<{
    content: Array<{
        type: 'text';
        text: string;
    }>;
    isError?: boolean;
}>;
/**
 * CONSOLIDATED (P2): step - Step through code with smart context
 *
 * Replaces debugger_step_over, debugger_step_into, and debugger_step_out.
 * Auto-includes new location, local variables with [CHANGED] markers, and new console logs.
 */
export declare function step(args: {
    direction: 'over' | 'into' | 'out';
    include_context?: boolean;
    connection_id?: string;
}): Promise<{
    content: Array<{
        type: 'text';
        text: string;
    }>;
    isError?: boolean;
}>;
/**
 * CONSOLIDATED (P2): execution - Resume or pause with smart context
 *
 * Replaces debugger_resume and debugger_pause.
 * When paused, auto-includes call stack, local variables, and console logs.
 */
export declare function execution(args: {
    action: 'resume' | 'pause';
    include_context?: boolean;
    connection_id?: string;
}): Promise<{
    content: Array<{
        type: 'text';
        text: string;
    }>;
    isError?: boolean;
}>;
/**
 * CONSOLIDATED: evaluate - Evaluate expression in call frame or global scope
 *
 * Replaces debugger_evaluate_on_call_frame with a more flexible tool.
 */
export declare function evaluate(args: {
    expression: string;
    call_frame_id?: string;
    connection_id?: string;
}): Promise<{
    content: Array<{
        type: 'text';
        text: string;
    }>;
    isError?: boolean;
}>;
/**
 * CONSOLIDATED: call_stack - Get current call stack
 *
 * Alias for debugger_get_call_stack with shorter name.
 */
export declare function callStack(args: {
    connection_id?: string;
}): Promise<{
    content: Array<{
        type: 'text';
        text: string;
    }>;
    isError?: boolean;
}>;
/**
 * CONSOLIDATED: pause_on_exceptions - Configure exception breaking
 *
 * Alias for debugger_set_pause_on_exceptions with shorter name.
 */
export declare function pauseOnExceptions(args: {
    state: 'none' | 'uncaught' | 'all';
    connection_id?: string;
}): Promise<{
    content: Array<{
        type: 'text';
        text: string;
    }>;
    isError?: boolean;
}>;
//# sourceMappingURL=debugger.d.ts.map