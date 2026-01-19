/**
 * Chrome Debugger Tools
 * Ported from Python debugger tools
 *
 * Full JavaScript debugger support via CDP.
 */

import { browserManager } from '../browser.js';
import { successResponse, errorResponse } from '../response.js';
import { gatherPauseContext, gatherStepContext } from './context.js';

/**
 * Enable the Chrome debugger for the current connection.
 *
 * Must be called before using any debugger features.
 */
export async function debuggerEnable(args: {
  connection_id?: string;
}): Promise<{ content: Array<{ type: 'text'; text: string }>; isError?: boolean }> {
  try {
    await browserManager.enableDebugger(args.connection_id);
    return successResponse(
      'Debugger enabled successfully.\n\nYou can now set breakpoints, step through code, and inspect variables.'
    );
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : String(error));
  }
}

/**
 * Set a breakpoint at a specific line in a script.
 *
 * You can optionally add a condition (breakpoint only triggers when condition is true).
 */
export async function debuggerSetBreakpoint(args: {
  url: string;
  line_number: number;
  column_number?: number;
  condition?: string;
  connection_id?: string;
}): Promise<{ content: Array<{ type: 'text'; text: string }>; isError?: boolean }> {
  const { url, line_number, column_number, condition, connection_id } = args;

  try {
    const cdpSession = await browserManager.enableDebugger(connection_id);

    // Set breakpoint via CDP (line numbers are 0-indexed in CDP)
    const result = await cdpSession.send('Debugger.setBreakpointByUrl', {
      url,
      lineNumber: line_number - 1, // Convert to 0-indexed
      columnNumber: column_number,
      condition,
    });

    const breakpointId = result.breakpointId as string;
    const locations = (result.locations as Array<{
      lineNumber: number;
      columnNumber: number;
    }>) || [];

    // Store breakpoint info - Fix: use setBreakpoint instead of storeBreakpoint
    browserManager.setBreakpoint(connection_id, breakpointId, {
      url,
      lineNumber: line_number,
      columnNumber: column_number,
      condition,
    });

    let response = `Breakpoint set successfully

Breakpoint ID: ${breakpointId}
URL: ${url}
Line: ${line_number}`;

    if (condition) {
      response += `\nCondition: ${condition}`;
    }

    if (locations.length > 0) {
      const loc = locations[0];
      const actualLine = loc.lineNumber + 1; // Convert back to 1-indexed
      response += `\n\nActual location: Line ${actualLine}, Column ${loc.columnNumber}`;
    }

    return successResponse(response);
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : String(error));
  }
}

/**
 * Remove a breakpoint by its ID.
 *
 * You can see breakpoint IDs in the debugger_get_call_stack output or when you set the breakpoint.
 */
export async function debuggerRemoveBreakpoint(args: {
  breakpoint_id: string;
  connection_id?: string;
}): Promise<{ content: Array<{ type: 'text'; text: string }>; isError?: boolean }> {
  const { breakpoint_id, connection_id } = args;

  try {
    const cdpSession = browserManager.getCDPSessionOrThrow(connection_id);

    await cdpSession.send('Debugger.removeBreakpoint', {
      breakpointId: breakpoint_id,
    });

    // Remove from tracking
    browserManager.removeBreakpoint(connection_id, breakpoint_id);

    return successResponse(`Breakpoint ${breakpoint_id} removed successfully.`);
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : String(error));
  }
}

/**
 * Get the current call stack when execution is paused.
 *
 * Shows all stack frames with function names, locations, and scope information.
 */
export async function debuggerGetCallStack(args: {
  connection_id?: string;
}): Promise<{ content: Array<{ type: 'text'; text: string }>; isError?: boolean }> {
  try {
    const pausedData = browserManager.requirePaused(args.connection_id);

    const frames = pausedData.callFrames;
    if (!frames || frames.length === 0) {
      return successResponse('No call stack available.');
    }

    const lines: string[] = ['Call Stack:', '='.repeat(80), ''];

    for (let i = 0; i < frames.length; i++) {
      const frame = frames[i];
      const location = frame.location;
      const functionName = frame.functionName || '(anonymous)';
      const url = frame.url || '(unknown)';
      const line = location.lineNumber + 1; // Convert to 1-indexed
      const col = location.columnNumber;

      lines.push(`[${i}] ${functionName}`);
      lines.push(`    at ${url}:${line}:${col}`);
      lines.push(`    callFrameId: ${frame.callFrameId}`);
      lines.push('');
    }

    lines.push('Use debugger_evaluate_on_call_frame(call_frame_id, expression) to inspect variables.');

    return successResponse(lines.join('\n'));
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : String(error));
  }
}

/**
 * Evaluate a JavaScript expression in the context of a specific call frame.
 *
 * Useful for inspecting variables while paused at a breakpoint.
 */
export async function debuggerEvaluateOnCallFrame(args: {
  call_frame_id: string;
  expression: string;
  connection_id?: string;
}): Promise<{ content: Array<{ type: 'text'; text: string }>; isError?: boolean }> {
  const { call_frame_id, expression, connection_id } = args;

  try {
    const cdpSession = browserManager.getCDPSessionOrThrow(connection_id);

    const result = await cdpSession.send('Debugger.evaluateOnCallFrame', {
      callFrameId: call_frame_id,
      expression,
    });

    const value = result.result;
    const resultText = JSON.stringify(value, null, 2);

    return successResponse(`Expression: ${expression}\n\nResult:\n${resultText}`);
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : String(error));
  }
}

/**
 * Step over the current line of code.
 *
 * Continues to the next line in the current function.
 */
export async function debuggerStepOver(args: {
  connection_id?: string;
}): Promise<{ content: Array<{ type: 'text'; text: string }>; isError?: boolean }> {
  try {
    browserManager.requirePaused(args.connection_id);
    const cdpSession = browserManager.getCDPSessionOrThrow(args.connection_id);

    await cdpSession.send('Debugger.stepOver');
    return successResponse('Stepped over to next line. Execution will pause at the next statement.');
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : String(error));
  }
}

/**
 * Step into a function call.
 *
 * Enters the function being called on the current line.
 */
export async function debuggerStepInto(args: {
  connection_id?: string;
}): Promise<{ content: Array<{ type: 'text'; text: string }>; isError?: boolean }> {
  try {
    browserManager.requirePaused(args.connection_id);
    const cdpSession = browserManager.getCDPSessionOrThrow(args.connection_id);

    await cdpSession.send('Debugger.stepInto');
    return successResponse('Stepped into function. Execution will pause at the first statement inside.');
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : String(error));
  }
}

/**
 * Step out of the current function.
 *
 * Returns to the calling function.
 */
export async function debuggerStepOut(args: {
  connection_id?: string;
}): Promise<{ content: Array<{ type: 'text'; text: string }>; isError?: boolean }> {
  try {
    browserManager.requirePaused(args.connection_id);
    const cdpSession = browserManager.getCDPSessionOrThrow(args.connection_id);

    await cdpSession.send('Debugger.stepOut');
    return successResponse('Stepped out of function. Execution will pause after returning to caller.');
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : String(error));
  }
}

/**
 * Resume execution after being paused.
 *
 * Continues until the next breakpoint or debugger statement.
 */
export async function debuggerResume(args: {
  connection_id?: string;
}): Promise<{ content: Array<{ type: 'text'; text: string }>; isError?: boolean }> {
  try {
    browserManager.requirePaused(args.connection_id);
    const cdpSession = browserManager.getCDPSessionOrThrow(args.connection_id);

    await cdpSession.send('Debugger.resume');
    return successResponse('Execution resumed. Will pause at next breakpoint or debugger statement.');
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : String(error));
  }
}

/**
 * Pause execution immediately.
 *
 * Stops at the next JavaScript statement.
 */
export async function debuggerPause(args: {
  connection_id?: string;
}): Promise<{ content: Array<{ type: 'text'; text: string }>; isError?: boolean }> {
  try {
    browserManager.requireNotPaused(args.connection_id);
    const cdpSession = browserManager.getCDPSessionOrThrow(args.connection_id);

    await cdpSession.send('Debugger.pause');
    return successResponse('Pause requested. Execution will stop at the next JavaScript statement.');
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : String(error));
  }
}

/**
 * Configure whether to pause on exceptions.
 *
 * Options: 'none' (default), 'uncaught', or 'all'.
 */
export async function debuggerSetPauseOnExceptions(args: {
  state: 'none' | 'uncaught' | 'all';
  connection_id?: string;
}): Promise<{ content: Array<{ type: 'text'; text: string }>; isError?: boolean }> {
  const { state, connection_id } = args;

  try {
    const cdpSession = browserManager.getCDPSessionOrThrow(connection_id);

    await cdpSession.send('Debugger.setPauseOnExceptions', {
      state,
    });

    const messages: Record<string, string> = {
      none: 'Debugger will not pause on exceptions.',
      uncaught: 'Debugger will pause on uncaught exceptions only.',
      all: 'Debugger will pause on all exceptions (caught and uncaught).',
    };

    return successResponse(`Pause on exceptions set to: ${state}\n\n${messages[state]}`);
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : String(error));
  }
}

/**
 * CONSOLIDATED: breakpoint - Set or remove breakpoints
 *
 * Replaces debugger_set_breakpoint and debugger_remove_breakpoint with a single tool.
 */
export async function breakpoint(args: {
  action: 'set' | 'remove';
  url?: string;
  line_number?: number;
  column_number?: number;
  condition?: string;
  breakpoint_id?: string;
  connection_id?: string;
}): Promise<{ content: Array<{ type: 'text'; text: string }>; isError?: boolean }> {
  if (args.action === 'set') {
    if (!args.url || !args.line_number) {
      return errorResponse('action="set" requires url and line_number parameters.');
    }
    return debuggerSetBreakpoint({
      url: args.url,
      line_number: args.line_number,
      column_number: args.column_number,
      condition: args.condition,
      connection_id: args.connection_id,
    });
  } else if (args.action === 'remove') {
    if (!args.breakpoint_id) {
      return errorResponse('action="remove" requires breakpoint_id parameter.');
    }
    return debuggerRemoveBreakpoint({
      breakpoint_id: args.breakpoint_id,
      connection_id: args.connection_id,
    });
  } else {
    return errorResponse(`Invalid action: ${args.action}. Must be 'set' or 'remove'.`);
  }
}

/**
 * CONSOLIDATED (P2): step - Step through code with smart context
 *
 * Replaces debugger_step_over, debugger_step_into, and debugger_step_out.
 * Auto-includes new location, local variables with [CHANGED] markers, and new console logs.
 */
export async function step(args: {
  direction: 'over' | 'into' | 'out';
  include_context?: boolean;
  connection_id?: string;
}): Promise<{ content: Array<{ type: 'text'; text: string }>; isError?: boolean }> {
  const includeContext = args.include_context ?? true;

  try {
    browserManager.requirePaused(args.connection_id);
    const cdpSession = browserManager.getCDPSessionOrThrow(args.connection_id);

    // Get previous vars before stepping (for change detection)
    const previousVars = browserManager.getPreviousStepVars(args.connection_id);

    // Execute step command
    const stepMethod: Record<string, string> = {
      over: 'Debugger.stepOver',
      into: 'Debugger.stepInto',
      out: 'Debugger.stepOut',
    };

    const method = stepMethod[args.direction];
    if (!method) {
      return errorResponse(`Invalid direction: ${args.direction}. Must be 'over', 'into', or 'out'.`);
    }

    await cdpSession.send(method as any);

    // Wait a bit for debugger to pause at new location
    await new Promise(resolve => setTimeout(resolve, 100));

    let response = `Stepped ${args.direction} successfully.`;

    // Add context if requested
    if (includeContext && browserManager.isPaused(args.connection_id)) {
      try {
        const context = await gatherStepContext(args.connection_id, previousVars);
        response += context;
      } catch (err) {
        // Context gathering failed, continue without it
      }
    }

    return successResponse(response);
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : String(error));
  }
}

/**
 * CONSOLIDATED (P2): execution - Resume or pause with smart context
 *
 * Replaces debugger_resume and debugger_pause.
 * When paused, auto-includes call stack, local variables, and console logs.
 */
export async function execution(args: {
  action: 'resume' | 'pause';
  include_context?: boolean;
  connection_id?: string;
}): Promise<{ content: Array<{ type: 'text'; text: string }>; isError?: boolean }> {
  const includeContext = args.include_context ?? true;

  try {
    const cdpSession = browserManager.getCDPSessionOrThrow(args.connection_id);

    if (args.action === 'resume') {
      browserManager.requirePaused(args.connection_id);

      await cdpSession.send('Debugger.resume');
      return successResponse('Execution resumed. Will pause at next breakpoint or debugger statement.');

    } else if (args.action === 'pause') {
      browserManager.requireNotPaused(args.connection_id);

      await cdpSession.send('Debugger.pause');

      // Wait a bit for debugger to pause
      await new Promise(resolve => setTimeout(resolve, 100));

      let response = 'Execution paused.';

      // Add context if requested and now paused
      if (includeContext && browserManager.isPaused(args.connection_id)) {
        try {
          const context = await gatherPauseContext(args.connection_id);
          response += context;
        } catch (err) {
          // Context gathering failed, continue without it
        }
      }

      return successResponse(response);

    } else {
      return errorResponse(`Invalid action: ${args.action}. Must be 'resume' or 'pause'.`);
    }
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : String(error));
  }
}

/**
 * CONSOLIDATED: evaluate - Evaluate expression in call frame or global scope
 *
 * Replaces debugger_evaluate_on_call_frame with a more flexible tool.
 */
export async function evaluate(args: {
  expression: string;
  call_frame_id?: string;
  connection_id?: string;
}): Promise<{ content: Array<{ type: 'text'; text: string }>; isError?: boolean }> {
  if (args.call_frame_id) {
    return debuggerEvaluateOnCallFrame({
      call_frame_id: args.call_frame_id,
      expression: args.expression,
      connection_id: args.connection_id,
    });
  } else {
    return errorResponse('call_frame_id is required. Use call_stack to see available frame IDs.');
  }
}

/**
 * CONSOLIDATED: call_stack - Get current call stack
 *
 * Alias for debugger_get_call_stack with shorter name.
 */
export async function callStack(args: {
  connection_id?: string;
}): Promise<{ content: Array<{ type: 'text'; text: string }>; isError?: boolean }> {
  return debuggerGetCallStack({ connection_id: args.connection_id });
}

/**
 * CONSOLIDATED: pause_on_exceptions - Configure exception breaking
 *
 * Alias for debugger_set_pause_on_exceptions with shorter name.
 */
export async function pauseOnExceptions(args: {
  state: 'none' | 'uncaught' | 'all';
  connection_id?: string;
}): Promise<{ content: Array<{ type: 'text'; text: string }>; isError?: boolean }> {
  return debuggerSetPauseOnExceptions({
    state: args.state,
    connection_id: args.connection_id,
  });
}
