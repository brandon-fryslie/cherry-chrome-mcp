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
  scroll,
  getPageText,
  rightClick,
  doubleClick,
  focus,
  blur,
  pressKey,
  selectOption,
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
 * Dispatcher for unified 'interact' tool.
 * Routes click and scroll actions to their respective implementations.
 */
async function interact(args: unknown): Promise<ToolResult> {
  const arg = args as {
    action: 'click' | 'scroll' | 'right-click' | 'double-click' | 'focus' | 'blur' | 'press-key' | 'select-option';
    selector?: string;
    index?: number;
    include_context?: boolean;
    direction?: 'top' | 'bottom' | 'up' | 'down';
    pixels?: number;
    key?: string;
    option_text?: string;
    option_index?: number;
    option_value?: string;
    connection_id?: string;
  };

  switch (arg.action) {
    case 'click':
      if (!arg.selector) {
        return {
          content: [{ type: 'text', text: 'Error: click action requires "selector" parameter' }],
          isError: true,
        };
      }
      return clickElement({
        selector: arg.selector,
        index: arg.index,
        include_context: arg.include_context,
        connection_id: arg.connection_id,
      });

    case 'scroll':
      if (!arg.direction && !arg.selector) {
        return {
          content: [
            {
              type: 'text',
              text: 'Error: scroll action requires either "direction" or "selector" parameter',
            },
          ],
          isError: true,
        };
      }
      return scroll({
        direction: arg.direction,
        pixels: arg.pixels,
        selector: arg.selector,
        connection_id: arg.connection_id,
      });

    case 'right-click':
      if (!arg.selector) {
        return {
          content: [{ type: 'text', text: 'Error: right-click action requires "selector" parameter' }],
          isError: true,
        };
      }
      return rightClick({
        selector: arg.selector,
        index: arg.index,
        connection_id: arg.connection_id,
      });

    case 'double-click':
      if (!arg.selector) {
        return {
          content: [{ type: 'text', text: 'Error: double-click action requires "selector" parameter' }],
          isError: true,
        };
      }
      return doubleClick({
        selector: arg.selector,
        index: arg.index,
        connection_id: arg.connection_id,
      });

    case 'focus':
      if (!arg.selector) {
        return {
          content: [{ type: 'text', text: 'Error: focus action requires "selector" parameter' }],
          isError: true,
        };
      }
      return focus({
        selector: arg.selector,
        index: arg.index,
        connection_id: arg.connection_id,
      });

    case 'blur':
      if (!arg.selector) {
        return {
          content: [{ type: 'text', text: 'Error: blur action requires "selector" parameter' }],
          isError: true,
        };
      }
      return blur({
        selector: arg.selector,
        index: arg.index,
        connection_id: arg.connection_id,
      });

    case 'press-key':
      if (!arg.key) {
        return {
          content: [{ type: 'text', text: 'Error: press-key action requires "key" parameter' }],
          isError: true,
        };
      }
      return pressKey({
        key: arg.key,
        selector: arg.selector,
        index: arg.index,
        connection_id: arg.connection_id,
      });

    case 'select-option':
      if (!arg.selector) {
        return {
          content: [{ type: 'text', text: 'Error: select-option action requires "selector" parameter' }],
          isError: true,
        };
      }
      if (!arg.option_text && arg.option_index === undefined && !arg.option_value) {
        return {
          content: [{ type: 'text', text: 'Error: select-option requires one of: option_text, option_index, or option_value' }],
          isError: true,
        };
      }
      return selectOption({
        selector: arg.selector,
        index: arg.index,
        option_text: arg.option_text,
        option_index: arg.option_index,
        option_value: arg.option_value,
        connection_id: arg.connection_id,
      });

    default:
      return {
        content: [{ type: 'text', text: `Error: unknown interact action: ${arg.action}` }],
        isError: true,
      };
  }
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
   * Shared DOM tools
   *
   * Element query, navigation, and console operations.
   * Available in both legacy and smart modes.
   *
   * Tools: query_elements, fill_element, navigate,
   *        get_console_logs, inspect_element, get_page_text
   */
  addHandler(handlers, 'query_elements', tools, queryElements);
  addHandler(handlers, 'fill_element', tools, fillElement);
  addHandler(handlers, 'navigate', tools, navigate);
  addHandler(handlers, 'get_console_logs', tools, getConsoleLogs);
  addHandler(handlers, 'inspect_element', tools, inspectElement);
  addHandler(handlers, 'get_page_text', tools, getPageText);

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
     * Legacy-specific DOM tools (2 tools)
     *
     * Granular click and scroll operations.
     * Only available when USE_LEGACY_TOOLS=true.
     *
     * DOM: click_element, scroll
     */
    addHandler(handlers, 'click_element', tools, clickElement);
    addHandler(handlers, 'scroll', tools, scroll);

    /**
     * Legacy-specific connection and debugger tools (15 tools)
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
     * Smart-specific DOM tool (1 tool)
     *
     * Unified action-based DOM interaction.
     * Only available when USE_LEGACY_TOOLS=false (default).
     *
     * DOM: interact (consolidates click_element and scroll)
     */
    addHandler(handlers, 'interact', tools, interact);

    /**
     * Smart-specific connection and debugger tools (9 tools)
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
