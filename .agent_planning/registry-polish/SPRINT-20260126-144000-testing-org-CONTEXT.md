# Implementation Context: testing-org
Generated: 2026-01-26-144000
Plan: SPRINT-20260126-144000-testing-org-PLAN.md

## File Locations

**Files to create:**
- `/Users/bmf/code/cherry-chrome-mcp/src/handlers.ts`
- `/Users/bmf/code/cherry-chrome-mcp/tests/registry-integration.test.ts`

**Files to modify:**
- `/Users/bmf/code/cherry-chrome-mcp/src/index.ts` (remove handler code, add import)
- `/Users/bmf/code/cherry-chrome-mcp/src/toolRegistry.ts` (add Object.freeze)

**Reference files:**
- `/Users/bmf/code/cherry-chrome-mcp/tests/registry.test.ts` - existing registry tests
- `/Users/bmf/code/cherry-chrome-mcp/src/tools/index.ts` - tool exports

---

## P2-1: Extract Handler Creation

### New File: src/handlers.ts

```typescript
/**
 * Tool Handler Registration
 *
 * Creates handler mappings for MCP tool routing.
 * Separate from server setup for maintainability.
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
 */
export function createToolHandlers(
  useLegacy: boolean,
  legacyTools: Tool[],
  smartTools: Tool[]
): Map<string, ToolHandler> {
  const handlers = new Map<string, ToolHandler>();
  const tools = useLegacy ? legacyTools : smartTools;

  // --- Shared DOM tools (6) ---
  addHandler(handlers, 'query_elements', tools, queryElements);
  addHandler(handlers, 'click_element', tools, clickElement);
  addHandler(handlers, 'fill_element', tools, fillElement);
  addHandler(handlers, 'navigate', tools, navigate);
  addHandler(handlers, 'get_console_logs', tools, getConsoleLogs);
  addHandler(handlers, 'inspect_element', tools, inspectElement);

  // --- Shared connection tools (3) ---
  addHandler(handlers, 'chrome_list_connections', tools, chromeListConnections);
  addHandler(handlers, 'chrome_switch_connection', tools, chromeSwitchConnection);
  addHandler(handlers, 'chrome_disconnect', tools, chromeDisconnect);

  if (useLegacy) {
    // --- Legacy-specific tools (15) ---
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
    // --- Smart-specific tools (9) ---
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
```

### Changes to src/index.ts

**Remove:** Lines 905-1166 (findTool + createToolHandlers)

**Add import at line ~20:**
```typescript
import { createToolHandlers } from './handlers.js';
```

**Update line ~1170:**
```typescript
// Old
const toolHandlers = createToolHandlers(USE_LEGACY_TOOLS);

// New (pass tool arrays)
const toolHandlers = createToolHandlers(USE_LEGACY_TOOLS, legacyTools, smartTools);
```

---

## P2-2: Integration Tests

### New File: tests/registry-integration.test.ts

```typescript
/**
 * Registry Integration Tests
 *
 * Tests the full MCP request flow: request -> registry -> handler -> response
 * Uses mocked tool implementations to avoid Chrome dependency.
 */

import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { createToolRegistry, type ToolHandler } from '../src/toolRegistry.js';
import type { ToolResult } from '../src/types.js';

describe('Registry Integration', () => {
  let mockTools: Tool[];
  let mockHandlers: Map<string, ToolHandler>;
  let registry: ReturnType<typeof createToolRegistry>;

  beforeEach(() => {
    // Setup minimal mock tools
    mockTools = [
      {
        name: 'mock_tool',
        description: 'A mock tool for testing',
        inputSchema: {
          type: 'object',
          properties: {
            input: { type: 'string' },
            connection_id: { type: 'string' },
          },
        },
      },
    ];

    // Setup mock handlers
    mockHandlers = new Map([
      [
        'mock_tool',
        {
          name: 'mock_tool',
          definition: mockTools[0],
          invoke: async (args: unknown): Promise<ToolResult> => {
            const typedArgs = args as { input?: string };
            return {
              content: [{ type: 'text', text: `Received: ${typedArgs.input}` }],
            };
          },
        },
      ],
    ]);

    registry = createToolRegistry(mockTools, mockHandlers);
  });

  it('should return successful response for valid tool request', async () => {
    const handler = registry.getHandler('mock_tool');
    assert.ok(handler, 'Handler should exist');

    const result = await handler.invoke({ input: 'test value' });

    assert.ok(result.content, 'Result should have content');
    assert.strictEqual(result.content[0].type, 'text');
    assert.ok(
      (result.content[0] as { text: string }).text.includes('test value'),
      'Result should include input value'
    );
  });

  it('should return undefined for unknown tool', () => {
    const handler = registry.getHandler('nonexistent_tool');
    assert.strictEqual(handler, undefined);
  });

  it('should propagate handler errors', async () => {
    // Add error-throwing handler
    mockHandlers.set('error_tool', {
      name: 'error_tool',
      definition: {
        name: 'error_tool',
        description: 'Throws error',
        inputSchema: { type: 'object' },
      },
      invoke: async () => {
        throw new Error('Handler error');
      },
    });
    mockTools.push(mockHandlers.get('error_tool')!.definition);

    const errorRegistry = createToolRegistry(mockTools, mockHandlers);
    const handler = errorRegistry.getHandler('error_tool');
    assert.ok(handler);

    await assert.rejects(
      async () => handler.invoke({}),
      { message: 'Handler error' }
    );
  });

  it('should pass arguments to handler unchanged', async () => {
    let receivedArgs: unknown;

    mockHandlers.set('args_tool', {
      name: 'args_tool',
      definition: {
        name: 'args_tool',
        description: 'Captures args',
        inputSchema: { type: 'object' },
      },
      invoke: async (args: unknown) => {
        receivedArgs = args;
        return { content: [{ type: 'text', text: 'ok' }] };
      },
    });
    mockTools.push(mockHandlers.get('args_tool')!.definition);

    const argsRegistry = createToolRegistry(mockTools, mockHandlers);
    const handler = argsRegistry.getHandler('args_tool');
    assert.ok(handler);

    const testArgs = { connection_id: 'test-conn', foo: 'bar' };
    await handler.invoke(testArgs);

    assert.deepStrictEqual(receivedArgs, testArgs);
  });
});
```

---

## P3-1: Registry Immutability

### Changes to src/toolRegistry.ts

**Modify createToolRegistry function (around line 109):**

```typescript
export function createToolRegistry(
  tools: Tool[],
  handlers: Map<string, ToolHandler>
): ToolRegistry {
  // Validate all tools have handlers
  for (const tool of tools) {
    if (!handlers.has(tool.name)) {
      throw new Error(
        `Tool registry initialization failed: Missing handler for tool '${tool.name}'.`
      );
    }
  }

  // Freeze tools array to prevent mutation
  const frozenTools = Object.freeze([...tools]) as readonly Tool[];

  return {
    getHandler(name: string): ToolHandler | undefined {
      return handlers.get(name);
    },

    getAllTools(): Tool[] {
      // Return frozen array (caller cannot mutate)
      return frozenTools as Tool[];
    },

    get size(): number {
      return handlers.size;
    },
  };
}
```

### Update Test: tests/registry.test.ts

Add test case:
```typescript
it('should return frozen tools array', () => {
  const tools = registry.getAllTools();
  assert.ok(Object.isFrozen(tools), 'Tools array should be frozen');
});
```

---

## Dependency Analysis

```
src/index.ts
  ├── imports: handlers.ts (createToolHandlers)
  ├── imports: toolRegistry.ts (createToolRegistry, ToolHandler type)
  └── imports: tools/index.ts (NOT after extraction - moved to handlers.ts)

src/handlers.ts (NEW)
  ├── imports: toolRegistry.ts (ToolHandler type)
  ├── imports: types.ts (ToolResult type)
  └── imports: tools/index.ts (all tool functions)

src/toolRegistry.ts
  ├── imports: @modelcontextprotocol/sdk/types.js (Tool type)
  └── imports: types.ts (ToolResult type)
```

**No circular dependencies**: handlers.ts -> toolRegistry.ts -> types.ts (linear chain)

---

## Test Commands

```bash
# Build after extraction
npm run build

# Run all tests including new integration tests
npm test

# Verify new file exists
ls -la src/handlers.ts
ls -la tests/registry-integration.test.ts

# Check index.ts line count
wc -l src/index.ts
```
