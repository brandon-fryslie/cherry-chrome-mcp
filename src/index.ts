#!/usr/bin/env node

/**
 * Cherry Chrome MCP Server
 * CSS selector-based Chrome DevTools automation with debugger support
 *
 * Ported from Python chrome-debugger-mcp wrapper
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import type { Tool, CallToolResult } from '@modelcontextprotocol/sdk/types.js';

import { browserManager } from './browser.js';
import { createToolRegistry } from './toolRegistry.js';
import { createToolHandlers } from './handlers.js';

const server = new Server(
  {
    name: 'cherry-chrome-mcp',
    version: '0.1.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

/**
 * Shared tool metadata (eliminates duplication between legacy and smart modes)
 */
// Skill reference appended to all tool descriptions for Claude Code plugin integration
const SKILL_REF = ' Use the cherry-chrome-docs skill for detailed usage guide.';

const toolMetadata = {
  dom: {
    queryElements: {
      description:
        'Find elements by CSS selector. Returns tag, text, id, classes, visibility. Returns up to limit elements (default 5, max 20).' + SKILL_REF,
      inputSchema: {
        type: 'object' as const,
        properties: {
          selector: {
            type: 'string',
            description: 'CSS selector to query (e.g., ".class", "#id", "button")',
          },
          limit: {
            type: 'number',
            description: 'Maximum number of elements to return',
            default: 5,
          },
          text_contains: {
            type: 'string',
            description: 'Filter to elements containing this text (case-insensitive partial match)',
          },
          include_hidden: {
            type: 'boolean',
            description: 'Include hidden elements (display:none, visibility:hidden, zero size). Default: false (visible only)',
            default: false,
          },
          connection_id: {
            type: 'string',
            description: 'Chrome connection to use (uses active if not specified)',
          },
        },
        required: ['selector'],
      },
    },
    interact: {
      description:
        'Interact with page elements. Actions: click, scroll, right-click, double-click, focus, blur, press-key, select-option. ' +
        'Most actions require selector. scroll uses direction+pixels OR selector. press-key requires key (selector optional). ' +
        'select-option requires selector + one of: option_text, option_index, option_value.' + SKILL_REF,
      inputSchema: {
        type: 'object' as const,
        properties: {
          action: {
            type: 'string' as const,
            enum: ['click', 'scroll', 'right-click', 'double-click', 'focus', 'blur', 'press-key', 'select-option'],
            description: 'Interaction type',
          },
          selector: {
            type: 'string' as const,
            description: 'CSS selector for the target element. Required for most actions. For scroll: scrolls element into view. For press-key: optional (focuses element first)',
          },
          index: {
            type: 'number' as const,
            description: 'Which matching element (0 = first)',
            default: 0,
          },
          include_context: {
            type: 'boolean' as const,
            description: 'Include element state after action (click only, default: true)',
            default: true,
          },
          direction: {
            type: 'string' as const,
            enum: ['top', 'bottom', 'up', 'down'],
            description: 'Scroll direction (scroll action only)',
            default: 'down',
          },
          pixels: {
            type: 'number' as const,
            description: 'Pixels to scroll for up/down (scroll action only, default: 500)',
            default: 500,
          },
          key: {
            type: 'string' as const,
            description: 'Key to press (press-key action): "Enter", "Escape", "Tab", "ArrowUp", etc. Combinations: "Control+a", "Shift+Enter"',
          },
          option_text: {
            type: 'string' as const,
            description: 'Option text to match, case-insensitive (select-option action)',
          },
          option_index: {
            type: 'number' as const,
            description: 'Option index, 0-based (select-option action)',
          },
          option_value: {
            type: 'string' as const,
            description: 'Option value attribute to match exactly (select-option action)',
          },
          connection_id: {
            type: 'string' as const,
            description: 'Chrome connection to use',
          },
        },
        required: ['action'],
      },
    },
    fillElement: {
      description:
        'Fill text into an input element matching the CSS selector. Use query_elements first to verify the input exists.' + SKILL_REF,
      inputSchema: {
        type: 'object' as const,
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
    navigate: {
      description: 'Navigate to a URL and wait for page load.' + SKILL_REF,
      inputSchema: {
        type: 'object' as const,
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
    getConsoleLogs: {
      description:
        'Get console log messages from the browser. Messages are captured automatically. Use expand_errors to include full stack traces for error messages.' + SKILL_REF,
      inputSchema: {
        type: 'object' as const,
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
          expand_errors: {
            type: 'boolean',
            description: 'Include full stack traces for error messages (default: false)',
            default: false,
          },
          connection_id: {
            type: 'string',
            description: 'Chrome connection to use',
          },
        },
      },
    },
    inspectElement: {
      description:
        'Discover CSS selectors from natural language descriptions and element attributes. Returns ranked selector candidates with stability scores. Use when you know what element you want but not its exact selector.' + SKILL_REF,
      inputSchema: {
        type: 'object' as const,
        properties: {
          description: {
            type: 'string',
            description: 'Natural language description of element (e.g., "login button", "email input")',
          },
          text_contains: {
            type: 'string',
            description: 'Text content to match (exact substring)',
          },
          tag: {
            type: 'string',
            description: 'Filter by HTML tag (button, input, a, div, etc.)',
          },
          attributes: {
            type: 'object',
            description: 'Filter by element attributes',
            properties: {
              role: {
                type: 'string',
                description: 'ARIA role attribute',
              },
              aria_label: {
                type: 'string',
                description: 'ARIA label attribute',
              },
              data_testid: {
                type: 'string',
                description: 'data-testid attribute (supports wildcard * matching)',
              },
              placeholder: {
                type: 'string',
                description: 'Placeholder text for inputs',
              },
              type: {
                type: 'string',
                description: 'Input type (text, password, email, etc.)',
              },
            },
          },
          near: {
            type: 'object',
            description: 'Find elements spatially near another element',
            properties: {
              selector: {
                type: 'string',
                description: 'Reference selector to search near',
              },
              direction: {
                type: 'string',
                description: 'Spatial direction filter',
                enum: ['above', 'below', 'left', 'right', 'inside'],
              },
            },
            required: ['selector'],
          },
          strict_stability: {
            type: 'boolean',
            description: 'Only return high-stability selectors (ID, data-testid, aria-label)',
            default: false,
          },
          limit: {
            type: 'number',
            description: 'Maximum candidates to return (default: 3)',
            default: 3,
          },
          connection_id: {
            type: 'string',
            description: 'Chrome connection to use',
          },
        },
      },
    },
    getPageText: {
      description:
        'Get text content from elements matching a selector. Returns just text without HTML structure. Use from_end=true to get the last N matches (useful for recent messages in conversations).' + SKILL_REF,
      inputSchema: {
        type: 'object' as const,
        properties: {
          selector: {
            type: 'string',
            description: 'CSS selector for elements to extract text from (default: body)',
          },
          limit: {
            type: 'number',
            description: 'Maximum number of elements to return (default: 10, max: 50)',
            default: 10,
          },
          from_end: {
            type: 'boolean',
            description: 'Get last N matches instead of first N (default: false)',
            default: false,
          },
          max_length: {
            type: 'number',
            description: 'Maximum text length per element (default: 1000)',
            default: 1000,
          },
          connection_id: {
            type: 'string',
            description: 'Chrome connection to use',
          },
        },
      },
    },
  },
  connection: {
    chromeListConnections: {
      description:
        'List all active Chrome connections with their status (URL, active, paused state).' + SKILL_REF,
      inputSchema: {
        type: 'object' as const,
        properties: {},
      },
    },
    chromeSwitchConnection: {
      description:
        'Switch the active Chrome connection. All tools will use the active connection.' + SKILL_REF,
      inputSchema: {
        type: 'object' as const,
        properties: {
          connection_id: {
            type: 'string',
            description: 'ID of the connection to make active',
          },
        },
        required: ['connection_id'],
      },
    },
    chromeDisconnect: {
      description:
        'Disconnect from a specific Chrome instance. If you disconnect the active connection, the next available will become active.' + SKILL_REF,
      inputSchema: {
        type: 'object' as const,
        properties: {
          connection_id: {
            type: 'string',
            description: 'ID of the connection to disconnect',
          },
        },
        required: ['connection_id'],
      },
    },
  },
};

/**
 * Tool definitions registered with the MCP server.
 * Every entry here must have a corresponding handler in createToolHandlers;
 * the registry validates this at initialization.
 */
const tools: Tool[] = [
  // Chrome Connection Management
  {
    name: 'connect',
    description:
      'START HERE for all cherry-chrome workflows. Opens Chrome and navigates to a URL in a single call. ' +
      'CANONICAL HAPPY PATH (use this 99% of the time): connect({ url: "https://example.com" }) — this launches a ' +
      'fresh headless Chrome on a random port and navigates. No manual Chrome startup required. ' +
      'The ONLY required parameter is "url" (not "initialUrl", not "href"). ' +
      'Optional: pass port to attach to an already-running Chrome (verifies the port first); pass connection_id to run ' +
      'multiple Chrome instances side-by-side; pass headless:false to see the browser window. ' +
      'On any failure this tool returns a message naming the exact next call to try — follow it, do not improvise.' + SKILL_REF,
    inputSchema: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'REQUIRED. Full URL to navigate to (e.g. "https://example.com"). The parameter name is exactly "url".',
        },
        port: {
          type: 'number',
          description: 'Chrome remote debugging port. If provided, connects to existing Chrome. If omitted, launches new Chrome on random port.',
        },
        connection_id: {
          type: 'string',
          description: 'Unique identifier for this connection',
          default: 'default',
        },
        headless: {
          type: 'boolean',
          description: 'Run in headless mode (only when launching new Chrome)',
          default: true,
        },
        user_data_dir: {
          type: 'string',
          description: 'Custom user data directory path (only when launching new Chrome)',
        },
        extra_args: {
          type: 'string',
          description: 'Additional Chrome flags (only when launching new Chrome)',
        },
      },
      required: ['url'],
    },
  },
  // Connection tools (from shared metadata)
  { name: 'chrome_list_connections', ...toolMetadata.connection.chromeListConnections },
  { name: 'chrome_switch_connection', ...toolMetadata.connection.chromeSwitchConnection },
  { name: 'chrome_disconnect', ...toolMetadata.connection.chromeDisconnect },
  {
    name: 'target',
    description:
      'List or switch browser targets (pages, workers). Consolidates list_targets and switch_target into a single action-based tool.' + SKILL_REF,
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
  // DOM Tools (from shared metadata)
  { name: 'query_elements', ...toolMetadata.dom.queryElements },
  { name: 'interact', ...toolMetadata.dom.interact },
  { name: 'fill_element', ...toolMetadata.dom.fillElement },
  { name: 'navigate', ...toolMetadata.dom.navigate },
  { name: 'get_console_logs', ...toolMetadata.dom.getConsoleLogs },
  { name: 'inspect_element', ...toolMetadata.dom.inspectElement },
  { name: 'get_page_text', ...toolMetadata.dom.getPageText },
  // Debugger Tools (consolidated)
  {
    name: 'enable_debug_tools',
    description:
      'Enable JavaScript debugger and unlock debugging tools. Must be called before setting breakpoints or stepping.' + SKILL_REF,
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
    description:
      'Set or remove breakpoints. Consolidates debugger_set_breakpoint and debugger_remove_breakpoint into a single action-based tool.' + SKILL_REF,
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
    description:
      'Step through code execution one statement at a time. Pick direction: "over" (next line), "into" (enter function), or "out" (exit function).' + SKILL_REF,
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
    description:
      'Control debugger execution flow. action="resume" continues running; action="pause" breaks at the next statement.' + SKILL_REF,
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
    description:
      'Get the current call stack when execution is paused. Only works when paused at a breakpoint.' + SKILL_REF,
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
    description:
      'Evaluate a JavaScript expression in the context of a specific call frame. Only works when paused.' + SKILL_REF,
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
    description: 'Configure whether to pause when exceptions are thrown.' + SKILL_REF,
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

// Initialize tool registry at module load (eager, fails fast on missing handlers)
const toolHandlers = createToolHandlers(tools);
const toolRegistry = createToolRegistry(tools, toolHandlers);

/**
 * Error metadata for classification and recovery guidance.
 */
interface ErrorInfo {
  readonly errorType: 'CONNECTION' | 'DEBUGGER' | 'STATE' | 'EXECUTION' | 'UNKNOWN';
  readonly recoverable: boolean;
  readonly suggestion?: string;
}

/**
 * Error object with attached classification metadata.
 */
interface ErrorWithInfo extends Error {
  errorInfo: ErrorInfo;
}

/**
 * Type guard for errors with errorInfo property.
 */
function hasErrorInfo(error: unknown): error is ErrorWithInfo {
  return (
    error !== null &&
    typeof error === 'object' &&
    'errorInfo' in error &&
    error.errorInfo !== null &&
    typeof error.errorInfo === 'object'
  );
}

/**
 * Tool arguments with optional connection_id.
 */
interface ToolArguments {
  connection_id?: string;
  [key: string]: unknown;
}

/**
 * Classified error information for routing and observability.
 */
interface ClassifiedError {
  errorType: 'CONNECTION' | 'DEBUGGER' | 'STATE' | 'EXECUTION' | 'UNKNOWN';
  message: string;
  recoverable: boolean;
  suggestion?: string;
  toolName?: string;
  connectionId?: string;
}

/**
 * Error tool result with custom metadata fields.
 *
 * Extends CallToolResult with internal metadata for error tracking.
 * The metadata fields (_toolName, _errorType, _recoverable) are not part of the
 * MCP spec but are tolerated by the protocol for internal use.
 */
type ErrorToolResult = CallToolResult & {
  _toolName: string;
  _errorType: string;
  _recoverable: boolean;
};

/**
 * Classify an error by type and extract metadata.
 *
 * Looks for errorInfo property on error object (added to custom error classes).
 * Falls back to UNKNOWN for unexpected error types.
 *
 * Returns structured ClassifiedError with type, message, recovery info, and context.
 */
function classifyError(
  error: unknown,
  toolName: string,
  connectionId?: string
): ClassifiedError {
  // Check if error has errorInfo property (our custom errors)
  if (hasErrorInfo(error)) {
    const info = error.errorInfo;
    return {
      errorType: info.errorType,
      message: error.message,
      recoverable: info.recoverable,
      suggestion: info.suggestion,
      toolName,
      connectionId,
    };
  }

  // Fallback for unknown errors (shouldn't happen, but handle gracefully)
  return {
    errorType: 'UNKNOWN',
    message: error instanceof Error ? error.message : String(error),
    recoverable: false,
    toolName,
    connectionId,
  };
}

/**
 * Log a classified error with structured context.
 *
 * Output format:
 * [ISO_TIMESTAMP] [ERROR:TYPE] tool=<name> [conn=<id>] [recoverable=true/false] <message>
 *   Suggestion: <suggestion>
 */
function logErrorEvent(classified: ClassifiedError): void {
  const timestamp = new Date().toISOString();
  const parts = [
    `[ERROR:${classified.errorType}]`,
    `tool=${classified.toolName}`,
    classified.connectionId ? `conn=${classified.connectionId}` : null,
    `recoverable=${classified.recoverable}`,
  ].filter(Boolean);

  console.error(`${timestamp} ${parts.join(' ')} ${classified.message}`);

  if (classified.suggestion) {
    console.error(`  Suggestion: ${classified.suggestion}`);
  }
}

// Handle tool list requests
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools: toolRegistry.getAllTools() };
});

/**
 * Global error classification and handling in MCP tool routing.
 *
 * Error Flow:
 * 1. Tool executes within try-catch block
 * 2. Tool calls browserManager.*OrThrow() or throws CustomError
 * 3. Tool catches and returns error via errorResponse()
 * 4. If uncaught (shouldn't happen), global handler catches
 * 5. Global handler classifies error by type
 * 6. Error is logged to console with structured context
 * 7. Classified error returned to MCP client
 *
 * Error Types and Recovery:
 * - CONNECTION: Chrome not connected → call chrome() to connect
 * - DEBUGGER: Debugger not enabled → call enable_debug_tools()
 * - STATE: Execution not in required state → pause/resume/breakpoint
 * - EXECUTION: Operation failed during execution → check parameters
 * - UNKNOWN: Unexpected error type → report for debugging
 *
 * All error messages are preserved. Suggestions added based on error type.
 * Console logs include tool name, error type, and recovery suggestion.
 */
// Handle tool execution via registry lookup
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args = {} } = request.params;

  try {
    // Phase 3: Registry Lookup (replaces 172 lines of switch statements)
    const handler = toolRegistry.getHandler(name);
    if (!handler) {
      throw new Error(`Unknown tool: ${name}`);
    }

    // ToolResult matches CallToolResult structure but needs explicit cast
    return await handler.invoke(args) as CallToolResult;
  } catch (error) {
    // PRESERVED: Error handling exactly as original (lines 1183-1204)
    const toolName = request.params.name;
    const connectionId = (request.params.arguments as ToolArguments | undefined)?.connection_id;
    const classified = classifyError(error, toolName, connectionId);

    logErrorEvent(classified);

    // Construct error message with suggestion
    const errorMessage = classified.suggestion
      ? `${classified.message}\n\nSuggestion: ${classified.suggestion}`
      : classified.message;

    // Return error with custom metadata fields for internal tracking
    return {
      content: [{ type: 'text' as const, text: errorMessage }],
      isError: true,
      // Metadata for client-side error handling (not part of MCP spec but tolerated)
      _toolName: toolName,
      _errorType: classified.errorType,
      _recoverable: classified.recoverable,
    } as ErrorToolResult;
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error(`Cherry Chrome MCP Server running on stdio (${toolRegistry.size} tools)`);
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});
