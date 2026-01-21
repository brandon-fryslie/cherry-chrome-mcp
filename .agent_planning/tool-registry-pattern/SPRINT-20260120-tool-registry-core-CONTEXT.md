# Implementation Context: Tool Registry Core

**Sprint:** Tool Registry Core Implementation
**Generated:** 2026-01-20 09:35:00
**Purpose:** Provide detailed implementation context for replacing dual switch statement routing with Map-based tool registry

---

## Current Architecture Overview

### System Architecture

Cherry Chrome MCP is a TypeScript MCP server that provides Chrome DevTools automation with two operational modes controlled by a feature toggle:

- **Legacy Mode:** 23 granular tools (chrome_connect, debugger_enable, etc.)
- **Smart Mode:** 17 consolidated action-based tools (chrome, breakpoint, step, etc.)

**Key Architectural Principle:** Feature toggle is read-only at module load time. Changing modes requires server restart.

### Current Routing Implementation

**Location:** `src/index.ts:1010-1182` (172 lines)

**Pattern:**
```typescript
if (USE_LEGACY_TOOLS) {
  switch (name) {
    case 'chrome_connect': return await chromeConnect(args as Parameters<...>[0]);
    // ... 22 more cases
  }
} else {
  switch (name) {
    case 'chrome': return await chrome(args as Parameters<...>[0]);
    // ... 16 more cases
  }
}
```

**Problems:**
1. Duplicate case statements across two modes
2. Type casting repeated 40 times
3. O(n) lookup performance (though n is small)
4. Hard to add new tools (must modify switch)
5. Difficult to test routing in isolation

### Tool Definition Structure

**Shared Metadata:** `src/index.ts:73-333` (261 lines)
```typescript
const toolMetadata = {
  dom: {
    queryElements: { description: '...', inputSchema: {...} },
    // ... 5 more DOM tools
  },
  connection: {
    chromeListConnections: { ... },
    // ... 2 more connection tools
  },
};
```

**Tool Arrays:** `src/index.ts:338-897` (560 lines)
```typescript
const legacyTools: Tool[] = [/* 23 tools */];
const smartTools: Tool[] = [/* 17 tools */];
const activeTools = USE_LEGACY_TOOLS ? legacyTools : smartTools;
```

**Characteristic:** Tool definitions are separated from implementations. Metadata defines schema, arrays define available tools per mode.

### Error Handling Infrastructure

**Location:** `src/index.ts:903-980` (78 lines)

**Critical:** Error handling must remain at MCP boundary (architectural law: SINGLE ENFORCER)

**Flow:**
1. Tool throws custom error (e.g., `ChromeNotConnectedError`)
2. Error propagates to handler try-catch
3. `classifyError()` extracts metadata from `error.errorInfo`
4. `logErrorEvent()` logs structured error to stderr
5. Response includes error metadata: `_toolName`, `_errorType`, `_recoverable`

**Custom Error Types:** (from `src/errors.ts`)
- `ChromeNotConnectedError` - CONNECTION type
- `DebuggerNotEnabledError` - DEBUGGER type
- `ExecutionNotPausedError` - STATE type
- Generic execution failures - EXECUTION type

**Code to Preserve (src/index.ts:1183-1204):**
```typescript
catch (error) {
  const toolName = request.params.name;
  const connectionId = (request.params.arguments as any)?.connection_id;
  const classified = classifyError(error, toolName, connectionId);

  logErrorEvent(classified);

  const errorMessage = classified.suggestion
    ? `${classified.message}\n\nSuggestion: ${classified.suggestion}`
    : classified.message;

  return {
    content: [{ type: 'text', text: errorMessage }],
    isError: true,
    _toolName: toolName,
    _errorType: classified.errorType,
    _recoverable: classified.recoverable,
  };
}
```

**Why Preserve:** This is the SINGLE ENFORCER of error classification. Moving error handling into registry would violate architectural law.

---

## Registry Pattern Design

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│ MCP Server (src/index.ts)                               │
│                                                          │
│  ┌──────────────────────────────────────────────┐      │
│  │ Tool Arrays (legacy/smart)                   │      │
│  │  - legacyTools: Tool[] (23 tools)            │      │
│  │  - smartTools: Tool[] (17 tools)             │      │
│  │  - activeTools = USE_LEGACY_TOOLS ? ... : ..│      │
│  └──────────────────────────────────────────────┘      │
│                         ↓                                │
│  ┌──────────────────────────────────────────────┐      │
│  │ Tool Handlers (createToolHandlers())         │      │
│  │  - Map<string, ToolHandler>                  │      │
│  │  - Conditional creation based on flag        │      │
│  │  - Type casting in each handler              │      │
│  └──────────────────────────────────────────────┘      │
│                         ↓                                │
│  ┌──────────────────────────────────────────────┐      │
│  │ Tool Registry (createToolRegistry())         │      │
│  │  - ToolRegistry interface                    │      │
│  │  - O(1) lookup: getHandler(name)             │      │
│  │  - Tool listing: getAllTools()               │      │
│  └──────────────────────────────────────────────┘      │
│                         ↓                                │
│  ┌──────────────────────────────────────────────┐      │
│  │ CallToolRequestSchema Handler                │      │
│  │  - registry.getHandler(name)                 │      │
│  │  - handler.invoke(args)                      │      │
│  │  - Error handling wrapper (preserve)         │      │
│  └──────────────────────────────────────────────┘      │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### Registry Module Structure

**File:** `src/toolRegistry.ts` (NEW)

**Purpose:** Provide type-safe, efficient tool routing independent of MCP server logic

**Key Types:**
```typescript
// Handler interface - each tool has one
export interface ToolHandler {
  name: string;                          // Tool identifier (e.g., 'chrome_connect')
  definition: Tool;                      // MCP Tool definition (schema)
  invoke(args: unknown): Promise<ToolResult>;  // Execution function
}

// Registry interface - one per server mode
export interface ToolRegistry {
  getHandler(name: string): ToolHandler | undefined;  // O(1) lookup
  getAllTools(): Tool[];                 // List all tool definitions
  size: number;                          // Handler count
}

// Factory function
export function createToolRegistry(
  tools: Tool[],                         // Tool definitions from arrays
  handlers: Map<string, ToolHandler>     // Handler implementations
): ToolRegistry;
```

**Design Decisions (from evaluation):**

1. **Type Casting:** Happens in handler definition (Option A)
   - Each handler responsible for casting `unknown` → specific type
   - Preserves current pattern: `args as Parameters<typeof toolFn>[0]`
   - Lowest risk approach

2. **Initialization:** Eager at module load (Option A)
   - Registry created immediately when server starts
   - Errors surface at startup (easier to debug)
   - Matches current behavior

3. **Validation:** Registry validates all tools have handlers
   - Throws error at initialization if handler missing
   - Prevents runtime errors from misconfiguration

---

## Key Files and Line Numbers

### Primary Files

**src/index.ts** (1219 lines) - Main MCP server

| Lines | Content | Action |
|-------|---------|--------|
| 22-56 | Tool imports (40 functions) | PRESERVE |
| 73-333 | toolMetadata object | PRESERVE |
| 338-641 | legacyTools array | PRESERVE |
| 646-897 | smartTools array | PRESERVE |
| 900-901 | activeTools selection | ADD registry init after |
| 903-980 | Error classification functions | PRESERVE |
| 982-985 | ListToolsRequestSchema handler | REPLACE with registry |
| 1010-1182 | CallToolRequestSchema handler | REPLACE with registry (172 lines → ~10 lines) |
| 1183-1204 | Error handling in catch block | PRESERVE EXACTLY |

**src/tools/index.ts** (61 lines) - Tool exports

| Lines | Content | Action |
|-------|---------|--------|
| 1-61 | Export all 40 tool functions | PRESERVE |

**src/types.ts** (253 lines) - Type definitions

| Lines | Content | Action |
|-------|---------|--------|
| 249-253 | ToolResult type (if exists) | REFERENCE in registry |

**src/config.ts** (47 lines) - Configuration

| Lines | Content | Action |
|-------|---------|--------|
| 47 | USE_LEGACY_TOOLS flag | USE in handler creation |

**src/errors.ts** (~100 lines estimate) - Custom errors

| Lines | Content | Action |
|-------|---------|--------|
| All | Custom error class definitions | PRESERVE |

### New Files

**src/toolRegistry.ts** (NEW, ~150 lines)

| Section | Content | Lines |
|---------|---------|-------|
| Header | Module documentation | 10 |
| Imports | Tool, ToolResult types | 5 |
| Types | ToolHandler, ToolRegistry interfaces | 30 |
| Factory | createToolRegistry() implementation | 40 |
| Validation | Handler presence checks | 20 |
| Exports | Public API | 5 |
| Tests | Unit tests (separate file) | 100+ |

**tests/toolRegistry.test.ts** (NEW, ~100 lines)

| Section | Content | Lines |
|---------|---------|-------|
| Setup | Imports, test data | 15 |
| Tests | Registry creation, lookup, validation | 60 |
| Helpers | Test fixtures | 25 |

**tests/toolHandlers.test.ts** (NEW, ~80 lines)

| Section | Content | Lines |
|---------|---------|-------|
| Setup | Imports, mocks | 15 |
| Tests | Handler count, shared tools | 50 |
| Helpers | Handler inspection utilities | 15 |

---

## Code Patterns to Preserve

### Pattern 1: Type Casting in Tool Invocation

**Current Pattern:**
```typescript
case 'chrome_connect':
  return await chromeConnect(args as Parameters<typeof chromeConnect>[0]);
```

**Registry Pattern:**
```typescript
// In handler definition
invoke: async (args: unknown) => {
  return await chromeConnect(args as Parameters<typeof chromeConnect>[0]);
}
```

**Why Preserve:** Type safety maintained, no changes to tool function signatures

### Pattern 2: Error Propagation

**Current Pattern:**
```typescript
try {
  return await toolFunction(args);
} catch (error) {
  // Error handling at boundary
}
```

**Registry Pattern:**
```typescript
try {
  const handler = registry.getHandler(name);
  return await handler.invoke(args);  // Errors propagate naturally
} catch (error) {
  // SAME error handling code
}
```

**Why Preserve:** Maintains single enforcer pattern, errors classified once

### Pattern 3: Feature Toggle Selection

**Current Pattern:**
```typescript
const activeTools = USE_LEGACY_TOOLS ? legacyTools : smartTools;
```

**Registry Pattern:**
```typescript
const activeTools = USE_LEGACY_TOOLS ? legacyTools : smartTools;
const toolHandlers = createToolHandlers(USE_LEGACY_TOOLS);
const toolRegistry = createToolRegistry(activeTools, toolHandlers);
```

**Why Preserve:** Feature toggle read once at startup, no runtime switching

### Pattern 4: Unknown Tool Error

**Current Pattern:**
```typescript
default:
  throw new Error(`Unknown tool: ${name}`);
```

**Registry Pattern:**
```typescript
const handler = toolRegistry.getHandler(name);
if (!handler) {
  throw new Error(`Unknown tool: ${name}`);
}
```

**Why Preserve:** Same error message format, same behavior

---

## Type Safety Requirements

### Tool Function Signatures

**Characteristic:** Each tool has unique argument type

**Examples:**
```typescript
// query_elements
interface QueryElementsArgs {
  selector: string;
  limit?: number;
  text_contains?: string;
  include_hidden?: boolean;
  connection_id?: string;
}

// chrome_connect
interface ChromeConnectArgs {
  host?: string;
  port?: number;
  connection_id?: string;
}

// breakpoint (smart mode)
interface BreakpointArgs {
  action: 'set' | 'remove';
  url?: string;
  line_number?: number;
  breakpoint_id?: string;
  connection_id?: string;
}
```

**Registry Requirement:** Handler preserves argument type through casting

**Implementation:**
```typescript
// Type information preserved in handler definition
{
  name: 'query_elements',
  definition: toolMetadata.dom.queryElements,
  invoke: async (args: unknown) => {
    // Cast to specific type
    const typedArgs = args as Parameters<typeof queryElements>[0];
    return await queryElements(typedArgs);
  }
}
```

### Return Type Consistency

**All tools return:**
```typescript
{
  content: Array<{ type: 'text'; text: string }>;
  isError?: boolean;
  _toolName?: string;
  _errorType?: string;
  _recoverable?: boolean;
}
```

**Registry enforces:** Handler.invoke() returns compatible type

---

## Error Handling Requirements

### Custom Error Classes (src/errors.ts)

**Must preserve errorInfo property:**
```typescript
interface ErrorInfo {
  readonly errorType: 'CONNECTION' | 'DEBUGGER' | 'STATE' | 'EXECUTION' | 'UNKNOWN';
  readonly recoverable: boolean;
  readonly suggestion?: string;
}

class ChromeNotConnectedError extends Error {
  readonly errorInfo: ErrorInfo = {
    errorType: 'CONNECTION',
    recoverable: true,
    suggestion: 'Call chrome(action: "connect") or chrome(action: "launch")',
  };
}
```

**Registry Impact:** None (errors thrown by tools, caught by handler)

### Error Classification (src/index.ts:931-980)

**Must preserve classifyError() function:**
```typescript
function classifyError(
  error: unknown,
  toolName: string,
  connectionId?: string
): ClassifiedError {
  if (error && typeof error === 'object' && 'errorInfo' in error) {
    const info = (error as any).errorInfo as ErrorInfo;
    return {
      errorType: info.errorType,
      message: error instanceof Error ? error.message : String(error),
      recoverable: info.recoverable,
      suggestion: info.suggestion,
      toolName,
      connectionId,
    };
  }
  // Fallback for unknown errors
  return {
    errorType: 'UNKNOWN',
    message: error instanceof Error ? error.message : String(error),
    recoverable: false,
    toolName,
    connectionId,
  };
}
```

**Registry Impact:** None (classification happens after handler.invoke())

### Error Logging (src/index.ts:966-980)

**Must preserve logErrorEvent() function:**
```typescript
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
```

**Registry Impact:** None (logging happens after classification)

---

## Feature Toggle Compatibility

### Feature Toggle Configuration

**Location:** `src/config.ts:47`
```typescript
export const USE_LEGACY_TOOLS = process.env.USE_LEGACY_TOOLS === 'true' || '1';
```

**Characteristics:**
- Read from environment variable at module load
- Boolean flag (not runtime-switchable)
- Affects both tool array selection and handler creation

### Tool Mode Differences

**Legacy Mode (23 tools):**
- Granular tools: chrome_connect, chrome_launch
- Separate debugger tools: debugger_enable, debugger_set_breakpoint, etc.
- Targets: list_targets, switch_target

**Smart Mode (17 tools):**
- Consolidated tools: chrome(action), target(action)
- Consolidated debugger: breakpoint(action), step(direction), execution(action)
- Separate: call_stack, evaluate, pause_on_exceptions (not consolidated)

**Shared Tools (8 tools):**
- All DOM tools: query_elements, click_element, fill_element, navigate, get_console_logs, inspect_element
- Connection management: chrome_list_connections, chrome_switch_connection, chrome_disconnect

### Registry Integration with Toggle

**Strategy:** Create different handler maps based on flag

```typescript
function createToolHandlers(useLegacy: boolean): Map<string, ToolHandler> {
  const handlers = new Map();

  // Add shared tools (8 handlers)
  addSharedHandlers(handlers);

  if (useLegacy) {
    // Add 15 legacy-specific handlers
    addLegacyHandlers(handlers);
  } else {
    // Add 9 smart-specific handlers
    addSmartHandlers(handlers);
  }

  return handlers;
}

// At module init
const toolHandlers = createToolHandlers(USE_LEGACY_TOOLS);
const toolRegistry = createToolRegistry(activeTools, toolHandlers);
```

**Validation:** Registry size must match expected count
- Legacy: `registry.size === 23`
- Smart: `registry.size === 17`

---

## Implementation Sequence

### Phase 1: Registry Module (Independent)

**Goal:** Create standalone registry module with types and factory

**Steps:**
1. Create src/toolRegistry.ts
2. Define ToolHandler interface
3. Define ToolRegistry interface
4. Implement createToolRegistry() factory
5. Add validation logic
6. Write unit tests
7. Verify TypeScript compilation

**Validation:** Module compiles independently, tests pass

### Phase 2: Handler Mappings (Parallel to Phase 1)

**Goal:** Create handler map for both modes

**Steps:**
1. Create createToolHandlers() function in src/index.ts
2. Implement shared handler creation (8 tools)
3. Implement legacy handler creation (15 tools)
4. Implement smart handler creation (9 tools)
5. Add handler count validation
6. Write unit tests

**Validation:** Handler counts match (23 legacy, 17 smart)

### Phase 3: Integration (Sequential after 1 & 2)

**Goal:** Replace switch statements with registry lookup

**Steps:**
1. Initialize registry at module load (after line 900)
2. Update ListToolsRequestSchema handler (lines 982-985)
3. Replace CallToolRequestSchema handler (lines 1010-1182)
4. Verify error handling preserved (lines 1183-1204)
5. Test compilation

**Validation:** Server starts, tools list correctly

### Phase 4: Testing and Validation (Final)

**Goal:** Comprehensive testing of both modes

**Steps:**
1. Run unit tests (registry, handlers)
2. Run integration tests (both modes)
3. Run ./test-toggle.sh
4. Manual testing with MCP Inspector
5. Execute sample tools in both modes

**Validation:** All tests pass, no regressions

---

## Testing Strategy

### Unit Tests

**tests/toolRegistry.test.ts:**
- Test registry creation with valid input
- Test getHandler() returns correct handler
- Test getHandler() returns undefined for unknown
- Test getAllTools() returns tool array
- Test size property
- Test validation throws on missing handler

**tests/toolHandlers.test.ts:**
- Test legacy mode creates 23 handlers
- Test smart mode creates 17 handlers
- Test shared tools in both modes
- Test handler names match tool names

### Integration Tests

**Both modes:**
- Server initialization succeeds
- Registry initialized with correct size
- ListTools returns expected count
- CallTool routes correctly
- Error handling works

### Manual Tests

**With MCP Inspector:**
1. Start server in legacy mode
2. Verify 23 tools listed
3. Execute chrome_connect (legacy-specific)
4. Execute query_elements (shared)
5. Repeat for smart mode (17 tools, chrome, query_elements)

### Regression Tests

**./test-toggle.sh:**
- Automated test of both modes
- Verifies tool counts
- Checks for startup errors

---

## Success Metrics

### Quantitative Metrics

- **Code Reduction:** 172 lines → ~10 lines (94% reduction in routing code)
- **Tool Coverage:** 40/40 tools routable (100%)
- **Test Pass Rate:** 100% (all tests passing)
- **Compilation:** 0 TypeScript errors
- **Performance:** O(1) lookup vs. O(n) switch (though n is small)

### Qualitative Metrics

- **Extensibility:** New tools can be added without modifying routing logic
- **Testability:** Routing logic can be tested in isolation
- **Maintainability:** Single source of truth for tool routing
- **Architectural Alignment:** Preserves SINGLE ENFORCER and ONE SOURCE OF TRUTH principles

---

## Risk Mitigation

### Risk 1: Type Safety Loss
**Mitigation:** Preserve type casting in handler definitions, validate with TypeScript

### Risk 2: Error Handling Changes
**Mitigation:** Keep error handling at MCP boundary, let errors propagate from handlers

### Risk 3: Feature Toggle Breaks
**Mitigation:** Initialize registry with flag, validate tool counts in tests

### Risk 4: Handler Mismatch
**Mitigation:** Registry validates all tools have handlers at initialization

### Risk 5: Behavioral Regression
**Mitigation:** Comprehensive testing with both modes, manual validation with MCP Inspector

---

**Implementation Context Status:** COMPLETE
**Ready for Implementation:** YES
**Next Step:** Begin Phase 1 - Create Tool Registry Module
