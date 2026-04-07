/**
 * Tool Handler Registration
 *
 * Creates handler mappings for MCP tool routing.
 * Separate from server setup for maintainability.
 *
 * Architecture:
 * - Imports tool functions from ./tools/
 * - Creates Map<string, ToolHandler> with one entry per registered tool
 * - Single flat registration — no mode branching
 */
// Import tool functions
import { chromeListConnections, chromeSwitchConnection, chromeDisconnect, connect, target, enableDebugTools, queryElements, clickElement, fillElement, navigate, getConsoleLogs, inspectElement, scroll, getPageText, rightClick, doubleClick, focus, blur, pressKey, selectOption, step, execution, breakpoint, callStack, evaluate, pauseOnExceptions, } from './tools/index.js';
/**
 * Find tool definition by name.
 * @throws Error if tool not found
 */
function findTool(tools, name) {
    const tool = tools.find(t => t.name === name);
    if (!tool) {
        throw new Error(`Tool definition not found: ${name}`);
    }
    return tool;
}
/**
 * Dispatcher for unified 'interact' tool.
 * Routes each action to its underlying implementation function.
 */
async function interact(args) {
    const arg = args;
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
 *
 * @param handlers - The handler map to register into
 * @param name - Tool name (appears once, not three times)
 * @param tools - Tool definition array to search
 * @param fn - Tool implementation function
 */
function addHandler(handlers, name, tools, fn) {
    handlers.set(name, {
        name,
        definition: findTool(tools, name),
        invoke: async (args) => fn(args),
    });
}
/**
 * Create tool handlers for the MCP server.
 *
 * Creates a Map<string, ToolHandler> with one entry per tool in `tools`.
 * Every tool listed in the tool array must have a handler registered here;
 * the registry validates this at initialization (fail-fast).
 *
 * Type Safety: Each handler casts args using Parameters<typeof toolFn>[0].
 */
export function createToolHandlers(tools) {
    const handlers = new Map();
    // Chrome connection
    addHandler(handlers, 'connect', tools, connect);
    addHandler(handlers, 'chrome_list_connections', tools, chromeListConnections);
    addHandler(handlers, 'chrome_switch_connection', tools, chromeSwitchConnection);
    addHandler(handlers, 'chrome_disconnect', tools, chromeDisconnect);
    addHandler(handlers, 'target', tools, target);
    // DOM
    addHandler(handlers, 'query_elements', tools, queryElements);
    addHandler(handlers, 'interact', tools, interact);
    addHandler(handlers, 'fill_element', tools, fillElement);
    addHandler(handlers, 'navigate', tools, navigate);
    addHandler(handlers, 'get_console_logs', tools, getConsoleLogs);
    addHandler(handlers, 'inspect_element', tools, inspectElement);
    addHandler(handlers, 'get_page_text', tools, getPageText);
    // Debugger
    addHandler(handlers, 'enable_debug_tools', tools, enableDebugTools);
    addHandler(handlers, 'breakpoint', tools, breakpoint);
    addHandler(handlers, 'step', tools, step);
    addHandler(handlers, 'execution', tools, execution);
    addHandler(handlers, 'call_stack', tools, callStack);
    addHandler(handlers, 'evaluate', tools, evaluate);
    addHandler(handlers, 'pause_on_exceptions', tools, pauseOnExceptions);
    return handlers;
}
//# sourceMappingURL=handlers.js.map