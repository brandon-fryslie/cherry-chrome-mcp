/**
 * Tool Handler Registration
 *
 * Creates handler mappings for MCP tool routing.
 * Separate from server setup for maintainability.
 *
 * Architecture:
 * - Imports all tool functions from ./tools/
 * - Creates Map<string, ToolHandler> based on feature toggle
 * - Handles both legacy (24 tools) and smart (18 tools) modes
 */

import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import type { ToolHandler } from './toolRegistry.js';
import type { ToolResult } from './types.js';

// Import all tool functions
import {
  chromeConnect,
  chromeLaunch,
  chromeListConnections,
  chromeSwitchConnection,
  chromeDisconnect,
  listTargets,
  switchTarget,
  connect,
  target,
  enableDebugTools,
  queryElements,
  clickElement,
  fillElement,
  navigate,
  getConsoleLogs,
  inspectElement,
  debuggerEnable,
  debuggerSetBreakpoint,
  debuggerGetCallStack,
  debuggerEvaluateOnCallFrame,
  debuggerStepOver,
  debuggerStepInto,
  debuggerStepOut,
  debuggerResume,
  debuggerPause,
  debuggerRemoveBreakpoint,
  debuggerSetPauseOnExceptions,
  step,
  execution,
  breakpoint,
  callStack,
  evaluate,
  pauseOnExceptions,
} from './tools/index.js';

/**
 * Find tool definition by name.
 * @throws Error if tool not found
 */
function findTool(tools: Tool[], name: string): Tool {
  const tool = tools.find(t => t.name === name);
  if (!tool) {
    throw new Error(`Tool definition not found: ${name}`);
  }
  return tool;
}

/**
 * Register a tool handler with automatic name deduplication.
 * Reduces triple-name pattern to single name usage.
 *
 * @param handlers - The handler map to register into
 * @param name - Tool name (appears once, not three times)
 * @param tools - Tool definition array to search
 * @param fn - Tool implementation function
 */
function addHandler<F extends (...args: any[]) => Promise<ToolResult>>(
  handlers: Map<string, ToolHandler>,
  name: string,
  tools: Tool[],
  fn: F
): void {
  handlers.set(name, {
    name,
    definition: findTool(tools, name),
    invoke: async (args: unknown) => fn(args as Parameters<F>[0]),
  });
}

/**
 * Create tool handlers based on feature toggle.
 *
 * Phase 2: Handler Mappings
 * - Creates Map of tool name → ToolHandler
 * - Preserves type casting pattern from original switch statements
 * - Shared tools (6 DOM + 3 connection = 9 total) present in both modes
 * - Legacy mode: 24 handlers (9 shared + 15 legacy-specific)
 * - Smart mode: 18 handlers (9 shared + 9 smart-specific)
 *
 * Type Safety: Each handler casts args using Parameters<typeof toolFn>[0]
 */
export function createToolHandlers(
  useLegacy: boolean,
  legacyTools: Tool[],
  smartTools: Tool[]
): Map<string, ToolHandler> {
  const handlers = new Map<string, ToolHandler>();
  const tools = useLegacy ? legacyTools : smartTools;

  /**
   * Shared DOM tools (6 tools)
   *
   * Element query, interaction, navigation, and console operations.
   * Available in both legacy and smart modes.
   *
   * Tools: query_elements, click_element, fill_element, navigate,
   *        get_console_logs, inspect_element
   */
  addHandler(handlers, 'query_elements', tools, queryElements);
  addHandler(handlers, 'click_element', tools, clickElement);
  addHandler(handlers, 'fill_element', tools, fillElement);
  addHandler(handlers, 'navigate', tools, navigate);
  addHandler(handlers, 'get_console_logs', tools, getConsoleLogs);
  addHandler(handlers, 'inspect_element', tools, inspectElement);

  /**
   * Shared connection tools (3 tools)
   *
   * Chrome instance management operations available in both modes.
   *
   * Tools: chrome_list_connections, chrome_switch_connection, chrome_disconnect
   */
  addHandler(handlers, 'chrome_list_connections', tools, chromeListConnections);
  addHandler(handlers, 'chrome_switch_connection', tools, chromeSwitchConnection);
  addHandler(handlers, 'chrome_disconnect', tools, chromeDisconnect);

  if (useLegacy) {
    /**
     * Legacy-specific tools (15 tools)
     *
     * Granular Chrome connection and debugger operations.
     * Only available when USE_LEGACY_TOOLS=true.
     *
     * Connection: chrome_connect, chrome_launch, list_targets, switch_target
     * Debugger: debugger_enable, debugger_set_breakpoint, debugger_get_call_stack,
     *           debugger_evaluate_on_call_frame, debugger_step_over, debugger_step_into,
     *           debugger_step_out, debugger_resume, debugger_pause,
     *           debugger_remove_breakpoint, debugger_set_pause_on_exceptions
     */
    addHandler(handlers, 'chrome_connect', tools, chromeConnect);
    addHandler(handlers, 'chrome_launch', tools, chromeLaunch);
    addHandler(handlers, 'list_targets', tools, listTargets);
    addHandler(handlers, 'switch_target', tools, switchTarget);
    addHandler(handlers, 'debugger_enable', tools, debuggerEnable);
    addHandler(handlers, 'debugger_set_breakpoint', tools, debuggerSetBreakpoint);
    addHandler(handlers, 'debugger_get_call_stack', tools, debuggerGetCallStack);
    addHandler(handlers, 'debugger_evaluate_on_call_frame', tools, debuggerEvaluateOnCallFrame);
    addHandler(handlers, 'debugger_step_over', tools, debuggerStepOver);
    addHandler(handlers, 'debugger_step_into', tools, debuggerStepInto);
    addHandler(handlers, 'debugger_step_out', tools, debuggerStepOut);
    addHandler(handlers, 'debugger_resume', tools, debuggerResume);
    addHandler(handlers, 'debugger_pause', tools, debuggerPause);
    addHandler(handlers, 'debugger_remove_breakpoint', tools, debuggerRemoveBreakpoint);
    addHandler(handlers, 'debugger_set_pause_on_exceptions', tools, debuggerSetPauseOnExceptions);
  } else {
    /**
     * Smart-specific tools (9 tools)
     *
     * Consolidated action-based Chrome connection and debugger operations.
     * Only available when USE_LEGACY_TOOLS=false (default).
     *
     * Connection: connect, target
     * Debugger: enable_debug_tools, breakpoint, step, execution,
     *           call_stack, evaluate, pause_on_exceptions
     */
    addHandler(handlers, 'connect', tools, connect);
    addHandler(handlers, 'target', tools, target);
    addHandler(handlers, 'enable_debug_tools', tools, enableDebugTools);
    addHandler(handlers, 'breakpoint', tools, breakpoint);
    addHandler(handlers, 'step', tools, step);
    addHandler(handlers, 'execution', tools, execution);
    addHandler(handlers, 'call_stack', tools, callStack);
    addHandler(handlers, 'evaluate', tools, evaluate);
    addHandler(handlers, 'pause_on_exceptions', tools, pauseOnExceptions);
  }

  return handlers;
}
