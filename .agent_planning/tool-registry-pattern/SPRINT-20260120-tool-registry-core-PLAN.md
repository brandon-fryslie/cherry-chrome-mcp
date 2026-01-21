# Sprint: Tool Registry Core Implementation
Generated: 2026-01-20 09:35:00
Confidence: HIGH
Status: READY FOR IMPLEMENTATION

## Sprint Goal
Replace 170-line dual switch statement routing with Map-based tool registry to eliminate duplication, create single source of truth for tool routing, and improve extensibility while maintaining 100% backward compatibility with feature toggle modes.

## Scope

**Deliverables:**
1. Create tool registry module (src/toolRegistry.ts)
2. Create handler mappings for all 40 tools
3. Replace switch statement routing with registry lookup
4. Comprehensive testing for both legacy and smart modes

**Out of Scope:**
- Extracting toolMetadata to separate file (Phase 2 future improvement)
- Runtime mode switching (requires server restart)
- Tool versioning or plugin system
- Performance optimization beyond O(1) lookup

## Work Items

### Phase 1: Create Tool Registry Module

**File:** `src/toolRegistry.ts` (NEW, ~150 lines)

**Acceptance Criteria:**
- [ ] Define `ToolHandler` interface with `invoke(args: unknown)` method
- [ ] Define `ToolRegistry` interface with `getHandler(name: string)` method
- [ ] Implement `createToolRegistry(tools: Tool[], handlers: Map<string, ToolHandler>)` function
- [ ] Registry initialization validates all tools have handlers
- [ ] TypeScript compilation succeeds with no errors
- [ ] Unit tests verify registry creation and lookup

**Technical Notes:**
```typescript
// Core types
export interface ToolHandler {
  name: string;
  invoke(args: unknown): Promise<ToolResult>;
  definition: Tool;
}

export interface ToolRegistry {
  getHandler(name: string): ToolHandler | undefined;
  getAllTools(): Tool[];
  size: number;
}

// Factory function
export function createToolRegistry(
  tools: Tool[],
  handlers: Map<string, ToolHandler>
): ToolRegistry {
  // Validate all tools have handlers
  for (const tool of tools) {
    if (!handlers.has(tool.name)) {
      throw new Error(`Missing handler for tool: ${tool.name}`);
    }
  }

  return {
    getHandler: (name: string) => handlers.get(name),
    getAllTools: () => tools,
    size: handlers.size,
  };
}
```

**Dependencies:**
- Tool type from @modelcontextprotocol/sdk/types.js
- ToolResult type from src/types.ts or inline definition

**Risks:**
- Circular imports if registry imports from index.ts
- **Mitigation:** Keep registry pure, only import types

### Phase 2: Create Handler Mappings

**Location:** Within `src/index.ts` or new `src/toolHandlers.ts`

**Acceptance Criteria:**
- [ ] All 23 legacy tool handlers created with correct signatures
- [ ] All 17 smart tool handlers created with correct signatures
- [ ] Each handler preserves type casting pattern from current code
- [ ] Handlers map tool name to implementation function
- [ ] No duplicate handler definitions
- [ ] TypeScript validates all handler signatures

**Technical Notes:**

Strategy: Create handler map conditionally based on feature toggle

```typescript
// In src/index.ts after imports
function createToolHandlers(useLegacy: boolean): Map<string, ToolHandler> {
  const handlers = new Map<string, ToolHandler>();

  // Shared tools (8 tools present in both modes)
  handlers.set('query_elements', {
    name: 'query_elements',
    definition: toolMetadata.dom.queryElements,
    invoke: async (args: unknown) =>
      queryElements(args as Parameters<typeof queryElements>[0]),
  });

  handlers.set('click_element', {
    name: 'click_element',
    definition: toolMetadata.dom.clickElement,
    invoke: async (args: unknown) =>
      clickElement(args as Parameters<typeof clickElement>[0]),
  });

  // ... 6 more shared tools

  if (useLegacy) {
    // Legacy-specific tools (15 tools)
    handlers.set('chrome_connect', {
      name: 'chrome_connect',
      definition: legacyTools[0],
      invoke: async (args: unknown) =>
        chromeConnect(args as Parameters<typeof chromeConnect>[0]),
    });
    // ... 14 more legacy tools
  } else {
    // Smart-specific tools (9 tools)
    handlers.set('chrome', {
      name: 'chrome',
      definition: smartTools[0],
      invoke: async (args: unknown) =>
        chrome(args as Parameters<typeof chrome>[0]),
    });
    // ... 8 more smart tools
  }

  return handlers;
}
```

**Alternative:** Create two separate maps (legacyHandlers, smartHandlers) and select based on flag

**Dependencies:**
- All 40 tool function imports (already present in src/index.ts:22-56)
- Tool definition arrays (legacyTools, smartTools)
- toolMetadata object

**Risks:**
- Mismatched tool names between definition and handler
- **Mitigation:** Validate tool name consistency in tests

### Phase 3: Integrate Registry in index.ts

**File:** `src/index.ts` (MODIFY)

**Lines Affected:**
- 900-901: Add registry initialization
- 982-985: Update ListToolsRequestSchema handler
- 1010-1182: Replace CallToolRequestSchema handler
- 1183-1204: Preserve error handling (NO CHANGES)

**Acceptance Criteria:**
- [ ] Registry initialized eagerly at module load time
- [ ] Registry respects USE_LEGACY_TOOLS feature toggle
- [ ] ListToolsRequestSchema returns tools from registry
- [ ] CallToolRequestSchema uses registry.getHandler() lookup
- [ ] Error handling preserved exactly as-is (lines 1183-1204)
- [ ] Unknown tool throws Error with same message format
- [ ] TypeScript compilation succeeds
- [ ] Both modes start without errors

**Technical Notes:**

**Step 3.1: Initialize Registry (after line 900)**
```typescript
// After: const activeTools = USE_LEGACY_TOOLS ? legacyTools : smartTools;
// Add:
const toolHandlers = createToolHandlers(USE_LEGACY_TOOLS);
const toolRegistry = createToolRegistry(activeTools, toolHandlers);
```

**Step 3.2: Update ListToolsRequestSchema (replace lines 982-985)**
```typescript
// Before:
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools: activeTools };
});

// After:
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools: toolRegistry.getAllTools() };
});
```

**Step 3.3: Replace CallToolRequestSchema (replace lines 1010-1182)**
```typescript
// Before: 172 lines of dual switch statements

// After: 10 lines of registry lookup
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args = {} } = request.params;

  try {
    const handler = toolRegistry.getHandler(name);
    if (!handler) {
      throw new Error(`Unknown tool: ${name}`);
    }

    return await handler.invoke(args);
  } catch (error) {
    // PRESERVE EXISTING ERROR HANDLING (lines 1183-1204) - NO CHANGES
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
});
```

**Code Reduction:** 172 lines → 10 lines (162 lines removed)

**Dependencies:**
- Phase 1 complete (toolRegistry module exists)
- Phase 2 complete (handlers created)

**Risks:**
- Registry lookup returns undefined for valid tool
- **Mitigation:** Validate handler count matches tool count in tests
- Error handling behavior changes
- **Mitigation:** Preserve lines 1183-1204 exactly, let errors propagate from handler.invoke()

### Phase 4: Testing and Validation

**Acceptance Criteria:**
- [ ] Unit tests for toolRegistry module (creation, lookup, validation)
- [ ] Unit tests for handler creation (both modes)
- [ ] Integration test: registry initialized correctly in legacy mode (23 tools)
- [ ] Integration test: registry initialized correctly in smart mode (17 tools)
- [ ] Integration test: tool lookup returns correct handler
- [ ] Integration test: unknown tool throws correct error
- [ ] Feature toggle test: ./test-toggle.sh outputs expected results
- [ ] Manual test: MCP Inspector loads both modes correctly
- [ ] Manual test: Execute sample tool in each mode (query_elements)
- [ ] TypeScript compilation: npm run build succeeds

**Technical Notes:**

**Test Structure:**

```typescript
// tests/toolRegistry.test.ts
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { createToolRegistry, type ToolRegistry } from '../src/toolRegistry.js';

describe('ToolRegistry', () => {
  it('should create registry with correct size', () => {
    const testTools = [
      { name: 'test_tool', description: 'Test', inputSchema: { type: 'object', properties: {} } },
    ];
    const handlers = new Map();
    handlers.set('test_tool', {
      name: 'test_tool',
      definition: testTools[0],
      invoke: async () => ({ content: [{ type: 'text', text: 'test' }] }),
    });

    const registry = createToolRegistry(testTools, handlers);
    assert.strictEqual(registry.size, 1);
  });

  it('should lookup handler by name', () => {
    // ... test registry.getHandler()
  });

  it('should return undefined for unknown tool', () => {
    // ... test registry.getHandler('nonexistent')
  });

  it('should throw error if tool missing handler', () => {
    // ... test validation in createToolRegistry
  });
});

// tests/toolHandlers.test.ts
describe('Tool Handlers', () => {
  it('legacy mode creates 23 handlers', () => {
    // Test handler count for legacy mode
  });

  it('smart mode creates 17 handlers', () => {
    // Test handler count for smart mode
  });

  it('shared tools present in both modes', () => {
    // Verify 8 shared tools in both handler maps
  });
});
```

**Integration Testing:**

```bash
# Test both modes
npm run build
npm start  # Smart mode (default)
USE_LEGACY_TOOLS=true npm start  # Legacy mode

# Test with MCP Inspector
npx @modelcontextprotocol/inspector node build/src/index.js
USE_LEGACY_TOOLS=true npx @modelcontextprotocol/inspector node build/src/index.js

# Test feature toggle script
./test-toggle.sh
```

**Expected Output from test-toggle.sh:**
- Smart mode: 17 tools listed
- Legacy mode: 23 tools listed
- No errors in either mode

**Dependencies:**
- Phases 1-3 complete
- Test files created

**Risks:**
- Tests pass but behavior differs subtly
- **Mitigation:** Manual testing with MCP Inspector, execute real tools

## Dependencies

**External Dependencies:**
- @modelcontextprotocol/sdk (already present)
- Node.js test runner (already present)
- Puppeteer (already present)

**Internal Dependencies:**
- src/tools/index.ts exports (already present)
- src/types.ts definitions (already present)
- src/config.ts feature toggle (already present)

**Phase Dependencies:**
1. Phase 1 → Phase 2 (handlers need registry types)
2. Phase 2 → Phase 3 (integration needs handlers)
3. Phase 3 → Phase 4 (testing needs integrated registry)

## Risks

### Risk 1: Type Safety Degradation
**Severity:** Medium
**Impact:** Tools receive incorrectly typed arguments
**Mitigation:**
- Preserve exact type casting pattern from current code
- Each handler defines its own type assertion
- TypeScript validates handler signatures

### Risk 2: Error Handling Changes
**Severity:** High (violates architectural law if changed)
**Impact:** Error classification breaks, suggestions lost
**Mitigation:**
- Keep error handling at MCP boundary (lines 1183-1204)
- Registry.invoke() does NOT catch errors
- Errors propagate to existing try-catch

### Risk 3: Feature Toggle Compatibility
**Severity:** High
**Impact:** Wrong tools loaded in mode, tools mismatch between listing and routing
**Mitigation:**
- Initialize registry with `USE_LEGACY_TOOLS` flag
- Validate registry.size matches expected count (23 or 17)
- Test both modes with test-toggle.sh

### Risk 4: Handler Name Mismatch
**Severity:** Medium
**Impact:** Tool defined but not routable
**Mitigation:**
- Validate all tools have handlers in createToolRegistry()
- Unit tests verify handler names match tool names

### Risk 5: Import Circular Dependencies
**Severity:** Low
**Impact:** Module fails to load
**Mitigation:**
- Keep registry module pure (only type imports)
- Don't import from index.ts in registry module

## Success Criteria

### Functional Requirements
- ✅ All 23 legacy tools route correctly through registry
- ✅ All 17 smart tools route correctly through registry
- ✅ Error messages identical to current implementation
- ✅ Feature toggle behavior preserved (requires restart)
- ✅ Unknown tool throws same error format

### Code Quality
- ✅ 162 lines of duplicate routing code removed
- ✅ Single source of truth for tool routing (registry)
- ✅ O(1) tool lookup performance (Map.get)
- ✅ TypeScript compilation succeeds
- ✅ No type safety regressions

### Testing
- ✅ Unit tests for registry module pass
- ✅ Unit tests for handler creation pass
- ✅ Integration tests for both modes pass
- ✅ ./test-toggle.sh produces expected output
- ✅ MCP Inspector loads both modes without errors
- ✅ Manual execution of sample tools succeeds

### Architectural Alignment
- ✅ **ONE SOURCE OF TRUTH**: Registry is single tool name → handler mapping
- ✅ **SINGLE ENFORCER**: Error handling remains at MCP boundary
- ✅ **ONE-WAY DEPENDENCIES**: Registry depends on tools, not vice versa
- ✅ **GOALS MUST BE VERIFIABLE**: All criteria testable/measurable

## Implementation Sequence

1. **Phase 1** (2-3 hours): Create src/toolRegistry.ts module
   - Define types
   - Implement factory function
   - Write unit tests
   - Verify compilation

2. **Phase 2** (2-3 hours): Create handler mappings
   - Implement createToolHandlers() function
   - Map all 40 tools to handlers
   - Write handler tests
   - Verify counts (23 legacy, 17 smart)

3. **Phase 3** (1-2 hours): Integrate in index.ts
   - Initialize registry at module load
   - Update ListToolsRequestSchema handler
   - Replace CallToolRequestSchema handler
   - Preserve error handling
   - Verify compilation

4. **Phase 4** (2-3 hours): Testing and validation
   - Run unit tests
   - Run integration tests
   - Run ./test-toggle.sh
   - Manual testing with MCP Inspector
   - Execute sample tools in both modes

**Total Effort:** 7-11 hours

## Exit Criteria

**MUST HAVE (blocking):**
- All acceptance criteria met
- All tests passing
- TypeScript compilation successful
- ./test-toggle.sh outputs expected results
- No behavioral regressions

**SHOULD HAVE (non-blocking):**
- Documentation updated in CLAUDE.md
- Code comments for registry pattern
- Performance benchmarks (optional)

**BLOCKED BY:**
- None (all ambiguities resolved in evaluation)

---

**Status:** READY FOR IMPLEMENTATION
**Confidence:** HIGH
**Next Step:** Begin Phase 1 - Create Tool Registry Module
