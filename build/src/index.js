#!/usr/bin/env node
/**
 * Cherry Chrome MCP Server
 * CSS selector-based Chrome DevTools automation with debugger support
 *
 * Ported from Python chrome-debugger-mcp wrapper
 */
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema, } from '@modelcontextprotocol/sdk/types.js';
import { USE_LEGACY_TOOLS } from './config.js';
// Import all tools (legacy and new consolidated)
import { chromeConnect, chromeLaunch, chromeListConnections, chromeSwitchConnection, chromeDisconnect, listTargets, switchTarget, chrome, target, enableDebugTools, queryElements, clickElement, fillElement, navigate, getConsoleLogs, debuggerEnable, debuggerSetBreakpoint, debuggerGetCallStack, debuggerEvaluateOnCallFrame, debuggerStepOver, debuggerStepInto, debuggerStepOut, debuggerResume, debuggerPause, debuggerRemoveBreakpoint, debuggerSetPauseOnExceptions, step, execution, breakpoint, callStack, evaluate, pauseOnExceptions, } from './tools/index.js';
const server = new Server({
    name: 'cherry-chrome-mcp',
    version: '0.1.0',
}, {
    capabilities: {
        tools: {},
    },
});
/**
 * Legacy tool definitions (backward compatible)
 */
const legacyTools = [
    // Chrome Connection Management
    {
        name: 'chrome_connect',
        description: 'Connect to a Chrome instance running with remote debugging enabled. Chrome must be launched with --remote-debugging-port flag.',
        inputSchema: {
            type: 'object',
            properties: {
                port: {
                    type: 'number',
                    description: 'Chrome remote debugging port',
                    default: 9222,
                },
                connection_id: {
                    type: 'string',
                    description: 'Unique identifier for this connection',
                    default: 'default',
                },
                host: {
                    type: 'string',
                    description: 'Chrome host',
                    default: 'localhost',
                },
            },
        },
    },
    {
        name: 'chrome_launch',
        description: 'Launch a new Chrome instance with remote debugging enabled. Automatically connects after startup.',
        inputSchema: {
            type: 'object',
            properties: {
                debug_port: {
                    type: 'number',
                    description: 'Remote debugging port',
                    default: 9222,
                },
                headless: {
                    type: 'boolean',
                    description: 'Run in headless mode',
                    default: false,
                },
                user_data_dir: {
                    type: 'string',
                    description: 'Custom user data directory path',
                },
                extra_args: {
                    type: 'string',
                    description: 'Additional Chrome flags as space-separated string (e.g., "--disable-gpu --window-size=1920,1080")',
                },
                connection_id: {
                    type: 'string',
                    description: 'Connection ID for this instance (default: auto-generate from port)',
                    default: 'auto',
                },
            },
        },
    },
    {
        name: 'chrome_list_connections',
        description: 'List all active Chrome connections with their status (URL, active, paused state).',
        inputSchema: {
            type: 'object',
            properties: {},
        },
    },
    {
        name: 'chrome_switch_connection',
        description: 'Switch the active Chrome connection. All tools will use the active connection.',
        inputSchema: {
            type: 'object',
            properties: {
                connection_id: {
                    type: 'string',
                    description: 'ID of the connection to make active',
                },
            },
            required: ['connection_id'],
        },
    },
    {
        name: 'chrome_disconnect',
        description: 'Disconnect from a specific Chrome instance. If you disconnect the active connection, the next available will become active.',
        inputSchema: {
            type: 'object',
            properties: {
                connection_id: {
                    type: 'string',
                    description: 'ID of the connection to disconnect',
                },
            },
            required: ['connection_id'],
        },
    },
    {
        name: 'list_targets',
        description: 'List all targets (pages, workers, service workers) for a connection. Shows which target is currently active.',
        inputSchema: {
            type: 'object',
            properties: {
                connection_id: {
                    type: 'string',
                    description: 'Chrome connection to use (uses active if not specified)',
                },
            },
        },
    },
    {
        name: 'switch_target',
        description: 'Switch to a different target (page) within the current connection. Can switch by index, title pattern, or URL pattern.',
        inputSchema: {
            type: 'object',
            properties: {
                index: {
                    type: 'number',
                    description: 'Target index from list_targets (e.g., 0 for first target)',
                },
                title: {
                    type: 'string',
                    description: 'Partial title match (e.g., "GitKraken Desktop")',
                },
                url: {
                    type: 'string',
                    description: 'URL pattern with * wildcards (e.g., "*index.html*")',
                },
                connection_id: {
                    type: 'string',
                    description: 'Chrome connection to use (uses active if not specified)',
                },
            },
        },
    },
    // DOM Tools
    {
        name: 'query_elements',
        description: 'Find elements by CSS selector with DOM depth filtering. Returns tag, text, id, classes, visibility. Filters out deeply nested elements (default depth 3) to prevent returning entire page.',
        inputSchema: {
            type: 'object',
            properties: {
                selector: {
                    type: 'string',
                    description: 'CSS selector to query (e.g., ".class", "#id", "button")',
                },
                limit: {
                    type: 'number',
                    description: 'Maximum number of elements to return',
                    default: 20,
                },
                max_depth: {
                    type: 'number',
                    description: 'Maximum DOM depth from body (default: 3, max: 10)',
                    default: 3,
                },
                connection_id: {
                    type: 'string',
                    description: 'Chrome connection to use (uses active if not specified)',
                },
            },
            required: ['selector'],
        },
    },
    {
        name: 'click_element',
        description: 'Click an element matching the CSS selector. Use query_elements first to verify the element exists.',
        inputSchema: {
            type: 'object',
            properties: {
                selector: {
                    type: 'string',
                    description: 'CSS selector for the element',
                },
                index: {
                    type: 'number',
                    description: 'Which matching element to click (0 = first)',
                    default: 0,
                },
                include_context: {
                    type: 'boolean',
                    description: 'Include element state after click (default: true)',
                    default: true,
                },
                connection_id: {
                    type: 'string',
                    description: 'Chrome connection to use',
                },
            },
            required: ['selector'],
        },
    },
    {
        name: 'fill_element',
        description: 'Fill text into an input element matching the CSS selector. Use query_elements first to verify the input exists.',
        inputSchema: {
            type: 'object',
            properties: {
                selector: {
                    type: 'string',
                    description: 'CSS selector for the input element',
                },
                text: {
                    type: 'string',
                    description: 'Text to enter',
                },
                index: {
                    type: 'number',
                    description: 'Which matching element to fill (0 = first)',
                    default: 0,
                },
                submit: {
                    type: 'boolean',
                    description: 'Press Enter after filling',
                    default: false,
                },
                include_context: {
                    type: 'boolean',
                    description: 'Include element state after fill (default: true)',
                    default: true,
                },
                connection_id: {
                    type: 'string',
                    description: 'Chrome connection to use',
                },
            },
            required: ['selector', 'text'],
        },
    },
    {
        name: 'navigate',
        description: 'Navigate to a URL and wait for page load.',
        inputSchema: {
            type: 'object',
            properties: {
                url: {
                    type: 'string',
                    description: 'URL to navigate to',
                },
                include_context: {
                    type: 'boolean',
                    description: 'Include page title and element summary (default: true)',
                    default: true,
                },
                connection_id: {
                    type: 'string',
                    description: 'Chrome connection to use',
                },
            },
            required: ['url'],
        },
    },
    {
        name: 'get_console_logs',
        description: 'Get console log messages from the browser. Messages are captured automatically.',
        inputSchema: {
            type: 'object',
            properties: {
                filter_level: {
                    type: 'string',
                    description: 'Filter by level: "all", "error", "warning", "info", "debug", "log"',
                    default: 'all',
                },
                limit: {
                    type: 'number',
                    description: 'Maximum number of messages to return (most recent)',
                    default: 3,
                },
                connection_id: {
                    type: 'string',
                    description: 'Chrome connection to use',
                },
            },
        },
    },
    // Debugger Tools
    {
        name: 'debugger_enable',
        description: 'Enable the JavaScript debugger. Must be called before any other debugger operations.',
        inputSchema: {
            type: 'object',
            properties: {
                connection_id: {
                    type: 'string',
                    description: 'Chrome connection to use',
                },
            },
        },
    },
    {
        name: 'debugger_set_breakpoint',
        description: 'Set a breakpoint at a specific line in a source file. Debugger must be enabled first.',
        inputSchema: {
            type: 'object',
            properties: {
                url: {
                    type: 'string',
                    description: 'Full URL or path of the script (e.g., "http://localhost:3000/main.js")',
                },
                line_number: {
                    type: 'number',
                    description: 'Line number to break on (1-indexed)',
                },
                column_number: {
                    type: 'number',
                    description: 'Column number (0-indexed)',
                    default: 0,
                },
                condition: {
                    type: 'string',
                    description: 'Optional conditional expression (breakpoint only triggers if true)',
                },
                connection_id: {
                    type: 'string',
                    description: 'Chrome connection to use',
                },
            },
            required: ['url', 'line_number'],
        },
    },
    {
        name: 'debugger_get_call_stack',
        description: 'Get the current call stack when execution is paused. Only works when paused at a breakpoint.',
        inputSchema: {
            type: 'object',
            properties: {
                connection_id: {
                    type: 'string',
                    description: 'Chrome connection to use',
                },
            },
        },
    },
    {
        name: 'debugger_evaluate_on_call_frame',
        description: 'Evaluate a JavaScript expression in the context of a specific call frame. Only works when paused.',
        inputSchema: {
            type: 'object',
            properties: {
                call_frame_id: {
                    type: 'string',
                    description: 'Call frame ID from debugger_get_call_stack()',
                },
                expression: {
                    type: 'string',
                    description: 'JavaScript expression to evaluate',
                },
                connection_id: {
                    type: 'string',
                    description: 'Chrome connection to use',
                },
            },
            required: ['call_frame_id', 'expression'],
        },
    },
    {
        name: 'debugger_step_over',
        description: 'Step over the current line (execute and pause at next line). Only works when paused.',
        inputSchema: {
            type: 'object',
            properties: {
                connection_id: {
                    type: 'string',
                    description: 'Chrome connection to use',
                },
            },
        },
    },
    {
        name: 'debugger_step_into',
        description: 'Step into the current function call. Only works when paused at a function call.',
        inputSchema: {
            type: 'object',
            properties: {
                connection_id: {
                    type: 'string',
                    description: 'Chrome connection to use',
                },
            },
        },
    },
    {
        name: 'debugger_step_out',
        description: 'Step out of the current function (continue until function returns). Only works when paused.',
        inputSchema: {
            type: 'object',
            properties: {
                connection_id: {
                    type: 'string',
                    description: 'Chrome connection to use',
                },
            },
        },
    },
    {
        name: 'debugger_resume',
        description: 'Resume execution after being paused. Will continue until next breakpoint or exception.',
        inputSchema: {
            type: 'object',
            properties: {
                connection_id: {
                    type: 'string',
                    description: 'Chrome connection to use',
                },
            },
        },
    },
    {
        name: 'debugger_pause',
        description: 'Pause JavaScript execution as soon as possible. Use debugger_get_call_stack() after pausing.',
        inputSchema: {
            type: 'object',
            properties: {
                connection_id: {
                    type: 'string',
                    description: 'Chrome connection to use',
                },
            },
        },
    },
    {
        name: 'debugger_remove_breakpoint',
        description: 'Remove a previously set breakpoint.',
        inputSchema: {
            type: 'object',
            properties: {
                breakpoint_id: {
                    type: 'string',
                    description: 'Breakpoint ID returned from debugger_set_breakpoint()',
                },
                connection_id: {
                    type: 'string',
                    description: 'Chrome connection to use',
                },
            },
            required: ['breakpoint_id'],
        },
    },
    {
        name: 'debugger_set_pause_on_exceptions',
        description: 'Configure whether to pause when exceptions are thrown.',
        inputSchema: {
            type: 'object',
            properties: {
                state: {
                    type: 'string',
                    description: '"none" (no pause), "uncaught" (only uncaught), or "all" (all exceptions)',
                    enum: ['none', 'uncaught', 'all'],
                },
                connection_id: {
                    type: 'string',
                    description: 'Chrome connection to use',
                },
            },
            required: ['state'],
        },
    },
];
/**
 * Smart consolidated tool definitions (new approach)
 */
const smartTools = [
    // Chrome Connection Management (consolidated)
    {
        name: 'chrome',
        description: 'Connect or launch Chrome with remote debugging. Consolidates chrome_connect and chrome_launch into a single action-based tool.',
        inputSchema: {
            type: 'object',
            properties: {
                action: {
                    type: 'string',
                    description: '"connect" to existing Chrome or "launch" new instance',
                    enum: ['connect', 'launch'],
                },
                port: {
                    type: 'number',
                    description: 'Chrome remote debugging port (for connect) or debug port (for launch)',
                    default: 9222,
                },
                connection_id: {
                    type: 'string',
                    description: 'Unique identifier for this connection',
                    default: 'default',
                },
                host: {
                    type: 'string',
                    description: 'Chrome host (for connect only)',
                    default: 'localhost',
                },
                headless: {
                    type: 'boolean',
                    description: 'Run in headless mode (for launch only)',
                    default: false,
                },
                user_data_dir: {
                    type: 'string',
                    description: 'Custom user data directory path (for launch only)',
                },
                extra_args: {
                    type: 'string',
                    description: 'Additional Chrome flags (for launch only)',
                },
            },
            required: ['action'],
        },
    },
    {
        name: 'chrome_list_connections',
        description: 'List all active Chrome connections with their status (URL, active, paused state).',
        inputSchema: {
            type: 'object',
            properties: {},
        },
    },
    {
        name: 'chrome_switch_connection',
        description: 'Switch the active Chrome connection. All tools will use the active connection.',
        inputSchema: {
            type: 'object',
            properties: {
                connection_id: {
                    type: 'string',
                    description: 'ID of the connection to make active',
                },
            },
            required: ['connection_id'],
        },
    },
    {
        name: 'chrome_disconnect',
        description: 'Disconnect from a specific Chrome instance. If you disconnect the active connection, the next available will become active.',
        inputSchema: {
            type: 'object',
            properties: {
                connection_id: {
                    type: 'string',
                    description: 'ID of the connection to disconnect',
                },
            },
            required: ['connection_id'],
        },
    },
    {
        name: 'target',
        description: 'List or switch browser targets (pages, workers). Consolidates list_targets and switch_target into a single action-based tool.',
        inputSchema: {
            type: 'object',
            properties: {
                action: {
                    type: 'string',
                    description: '"list" to show all targets or "switch" to change target',
                    enum: ['list', 'switch'],
                },
                index: {
                    type: 'number',
                    description: 'Target index from list (for switch only)',
                },
                title: {
                    type: 'string',
                    description: 'Partial title match (for switch only)',
                },
                url: {
                    type: 'string',
                    description: 'URL pattern with * wildcards (for switch only)',
                },
                connection_id: {
                    type: 'string',
                    description: 'Chrome connection to use (uses active if not specified)',
                },
            },
            required: ['action'],
        },
    },
    // DOM Tools (same as legacy)
    {
        name: 'query_elements',
        description: 'Find elements by CSS selector with DOM depth filtering. Returns tag, text, id, classes, visibility. Filters out deeply nested elements (default depth 3) to prevent returning entire page.',
        inputSchema: {
            type: 'object',
            properties: {
                selector: {
                    type: 'string',
                    description: 'CSS selector to query (e.g., ".class", "#id", "button")',
                },
                limit: {
                    type: 'number',
                    description: 'Maximum number of elements to return',
                    default: 20,
                },
                max_depth: {
                    type: 'number',
                    description: 'Maximum DOM depth from body (default: 3, max: 10)',
                    default: 3,
                },
                connection_id: {
                    type: 'string',
                    description: 'Chrome connection to use (uses active if not specified)',
                },
            },
            required: ['selector'],
        },
    },
    {
        name: 'click_element',
        description: 'Click an element matching the CSS selector. Use query_elements first to verify the element exists.',
        inputSchema: {
            type: 'object',
            properties: {
                selector: {
                    type: 'string',
                    description: 'CSS selector for the element',
                },
                index: {
                    type: 'number',
                    description: 'Which matching element to click (0 = first)',
                    default: 0,
                },
                include_context: {
                    type: 'boolean',
                    description: 'Include element state after click (default: true)',
                    default: true,
                },
                connection_id: {
                    type: 'string',
                    description: 'Chrome connection to use',
                },
            },
            required: ['selector'],
        },
    },
    {
        name: 'fill_element',
        description: 'Fill text into an input element matching the CSS selector. Use query_elements first to verify the input exists.',
        inputSchema: {
            type: 'object',
            properties: {
                selector: {
                    type: 'string',
                    description: 'CSS selector for the input element',
                },
                text: {
                    type: 'string',
                    description: 'Text to enter',
                },
                index: {
                    type: 'number',
                    description: 'Which matching element to fill (0 = first)',
                    default: 0,
                },
                submit: {
                    type: 'boolean',
                    description: 'Press Enter after filling',
                    default: false,
                },
                include_context: {
                    type: 'boolean',
                    description: 'Include element state after fill (default: true)',
                    default: true,
                },
                connection_id: {
                    type: 'string',
                    description: 'Chrome connection to use',
                },
            },
            required: ['selector', 'text'],
        },
    },
    {
        name: 'navigate',
        description: 'Navigate to a URL and wait for page load.',
        inputSchema: {
            type: 'object',
            properties: {
                url: {
                    type: 'string',
                    description: 'URL to navigate to',
                },
                include_context: {
                    type: 'boolean',
                    description: 'Include page title and element summary (default: true)',
                    default: true,
                },
                connection_id: {
                    type: 'string',
                    description: 'Chrome connection to use',
                },
            },
            required: ['url'],
        },
    },
    {
        name: 'get_console_logs',
        description: 'Get console log messages from the browser. Messages are captured automatically.',
        inputSchema: {
            type: 'object',
            properties: {
                filter_level: {
                    type: 'string',
                    description: 'Filter by level: "all", "error", "warning", "info", "debug", "log"',
                    default: 'all',
                },
                limit: {
                    type: 'number',
                    description: 'Maximum number of messages to return (most recent)',
                    default: 3,
                },
                connection_id: {
                    type: 'string',
                    description: 'Chrome connection to use',
                },
            },
        },
    },
    // Debugger Tools (consolidated)
    {
        name: 'enable_debug_tools',
        description: 'Enable JavaScript debugger and unlock debugging tools. Must be called before setting breakpoints or stepping.',
        inputSchema: {
            type: 'object',
            properties: {
                connection_id: {
                    type: 'string',
                    description: 'Chrome connection to use',
                },
            },
        },
    },
    {
        name: 'breakpoint',
        description: 'Set or remove breakpoints. Consolidates debugger_set_breakpoint and debugger_remove_breakpoint into a single action-based tool.',
        inputSchema: {
            type: 'object',
            properties: {
                action: {
                    type: 'string',
                    description: '"set" to add breakpoint or "remove" to delete it',
                    enum: ['set', 'remove'],
                },
                url: {
                    type: 'string',
                    description: 'Full URL or path of the script (for set only)',
                },
                line_number: {
                    type: 'number',
                    description: 'Line number to break on (1-indexed, for set only)',
                },
                column_number: {
                    type: 'number',
                    description: 'Column number (0-indexed, for set only)',
                    default: 0,
                },
                condition: {
                    type: 'string',
                    description: 'Optional conditional expression (for set only)',
                },
                breakpoint_id: {
                    type: 'string',
                    description: 'Breakpoint ID to remove (for remove only)',
                },
                connection_id: {
                    type: 'string',
                    description: 'Chrome connection to use',
                },
            },
            required: ['action'],
        },
    },
    {
        name: 'step',
        description: 'Step through code execution. Consolidates debugger_step_over, debugger_step_into, and debugger_step_out into a single direction-based tool.',
        inputSchema: {
            type: 'object',
            properties: {
                direction: {
                    type: 'string',
                    description: '"over" (next line), "into" (enter function), or "out" (exit function)',
                    enum: ['over', 'into', 'out'],
                },
                include_context: {
                    type: 'boolean',
                    description: 'Include new location and local variables with change markers (default: true)',
                    default: true,
                },
                connection_id: {
                    type: 'string',
                    description: 'Chrome connection to use',
                },
            },
            required: ['direction'],
        },
    },
    {
        name: 'execution',
        description: 'Control execution flow. Consolidates debugger_resume and debugger_pause into a single action-based tool.',
        inputSchema: {
            type: 'object',
            properties: {
                action: {
                    type: 'string',
                    description: '"resume" to continue execution or "pause" to break',
                    enum: ['resume', 'pause'],
                },
                include_context: {
                    type: 'boolean',
                    description: 'Include call stack and local variables when paused (default: true)',
                    default: true,
                },
                connection_id: {
                    type: 'string',
                    description: 'Chrome connection to use',
                },
            },
            required: ['action'],
        },
    },
    {
        name: 'call_stack',
        description: 'Get the current call stack when execution is paused. Only works when paused at a breakpoint.',
        inputSchema: {
            type: 'object',
            properties: {
                connection_id: {
                    type: 'string',
                    description: 'Chrome connection to use',
                },
            },
        },
    },
    {
        name: 'evaluate',
        description: 'Evaluate a JavaScript expression in the context of a specific call frame. Only works when paused.',
        inputSchema: {
            type: 'object',
            properties: {
                call_frame_id: {
                    type: 'string',
                    description: 'Call frame ID from call_stack()',
                },
                expression: {
                    type: 'string',
                    description: 'JavaScript expression to evaluate',
                },
                connection_id: {
                    type: 'string',
                    description: 'Chrome connection to use',
                },
            },
            required: ['call_frame_id', 'expression'],
        },
    },
    {
        name: 'pause_on_exceptions',
        description: 'Configure whether to pause when exceptions are thrown.',
        inputSchema: {
            type: 'object',
            properties: {
                state: {
                    type: 'string',
                    description: '"none" (no pause), "uncaught" (only uncaught), or "all" (all exceptions)',
                    enum: ['none', 'uncaught', 'all'],
                },
                connection_id: {
                    type: 'string',
                    description: 'Chrome connection to use',
                },
            },
            required: ['state'],
        },
    },
];
// Select tool set based on feature flag
const activeTools = USE_LEGACY_TOOLS ? legacyTools : smartTools;
// Handle tool list requests
server.setRequestHandler(ListToolsRequestSchema, async () => {
    return { tools: activeTools };
});
// Handle tool execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args = {} } = request.params;
    try {
        if (USE_LEGACY_TOOLS) {
            // Legacy tools routing
            switch (name) {
                // Chrome connection tools
                case 'chrome_connect':
                    return await chromeConnect(args);
                case 'chrome_launch':
                    return await chromeLaunch(args);
                case 'chrome_list_connections':
                    return await chromeListConnections();
                case 'chrome_switch_connection':
                    return await chromeSwitchConnection(args);
                case 'chrome_disconnect':
                    return await chromeDisconnect(args);
                case 'list_targets':
                    return await listTargets(args);
                case 'switch_target':
                    return await switchTarget(args);
                // DOM tools
                case 'query_elements':
                    return await queryElements(args);
                case 'click_element':
                    return await clickElement(args);
                case 'fill_element':
                    return await fillElement(args);
                case 'navigate':
                    return await navigate(args);
                case 'get_console_logs':
                    return await getConsoleLogs(args);
                // Debugger tools
                case 'debugger_enable':
                    return await debuggerEnable(args);
                case 'debugger_set_breakpoint':
                    return await debuggerSetBreakpoint(args);
                case 'debugger_get_call_stack':
                    return await debuggerGetCallStack(args);
                case 'debugger_evaluate_on_call_frame':
                    return await debuggerEvaluateOnCallFrame(args);
                case 'debugger_step_over':
                    return await debuggerStepOver(args);
                case 'debugger_step_into':
                    return await debuggerStepInto(args);
                case 'debugger_step_out':
                    return await debuggerStepOut(args);
                case 'debugger_resume':
                    return await debuggerResume(args);
                case 'debugger_pause':
                    return await debuggerPause(args);
                case 'debugger_remove_breakpoint':
                    return await debuggerRemoveBreakpoint(args);
                case 'debugger_set_pause_on_exceptions':
                    return await debuggerSetPauseOnExceptions(args);
                default:
                    throw new Error(`Unknown tool: ${name}`);
            }
        }
        else {
            // Smart consolidated tools routing
            switch (name) {
                // Chrome connection tools
                case 'chrome':
                    return await chrome(args);
                case 'chrome_list_connections':
                    return await chromeListConnections();
                case 'chrome_switch_connection':
                    return await chromeSwitchConnection(args);
                case 'chrome_disconnect':
                    return await chromeDisconnect(args);
                case 'target':
                    return await target(args);
                // DOM tools (same as legacy)
                case 'query_elements':
                    return await queryElements(args);
                case 'click_element':
                    return await clickElement(args);
                case 'fill_element':
                    return await fillElement(args);
                case 'navigate':
                    return await navigate(args);
                case 'get_console_logs':
                    return await getConsoleLogs(args);
                // Debugger tools (consolidated)
                case 'enable_debug_tools':
                    return await enableDebugTools(args);
                case 'breakpoint':
                    return await breakpoint(args);
                case 'step':
                    return await step(args);
                case 'execution':
                    return await execution(args);
                case 'call_stack':
                    return await callStack(args);
                case 'evaluate':
                    return await evaluate(args);
                case 'pause_on_exceptions':
                    return await pauseOnExceptions(args);
                default:
                    throw new Error(`Unknown tool: ${name}`);
            }
        }
    }
    catch (error) {
        return {
            content: [
                {
                    type: 'text',
                    text: `Error: ${error instanceof Error ? error.message : String(error)}`,
                },
            ],
            isError: true,
        };
    }
});
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    const mode = USE_LEGACY_TOOLS ? 'LEGACY TOOLS' : 'SMART TOOLS';
    console.error(`Cherry Chrome MCP Server running on stdio [MODE: ${mode}]`);
    console.error(`Set USE_LEGACY_TOOLS=true to use original granular tools`);
}
main().catch((error) => {
    console.error('Server error:', error);
    process.exit(1);
});
//# sourceMappingURL=index.js.map