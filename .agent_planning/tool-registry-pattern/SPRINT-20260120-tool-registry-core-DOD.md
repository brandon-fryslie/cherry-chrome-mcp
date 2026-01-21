# Definition of Done: Tool Registry Core Implementation

**Sprint:** Tool Registry Core Implementation
**Generated:** 2026-01-20 09:35:00
**Confidence:** HIGH

## Overview

This Definition of Done specifies the acceptance criteria for replacing the 170-line dual switch statement routing with a Map-based tool registry. All criteria must be met before the sprint is considered complete.

---

## Deliverable 1: Tool Registry Module

**File:** `src/toolRegistry.ts`

### Acceptance Criteria

- [ ] **AC1.1:** `ToolHandler` interface defined with required properties:
  - `name: string` - Tool identifier
  - `definition: Tool` - MCP tool definition
  - `invoke(args: unknown): Promise<ToolResult>` - Execution method

- [ ] **AC1.2:** `ToolRegistry` interface defined with required methods:
  - `getHandler(name: string): ToolHandler | undefined` - O(1) lookup
  - `getAllTools(): Tool[]` - Returns all tool definitions
  - `size: number` - Returns handler count

- [ ] **AC1.3:** `createToolRegistry()` factory function implemented:
  - Accepts `Tool[]` array and `Map<string, ToolHandler>` handlers
  - Validates all tools have corresponding handlers
  - Throws descriptive error if handler missing
  - Returns fully initialized ToolRegistry instance

- [ ] **AC1.4:** TypeScript compilation succeeds:
  - `npm run build` completes without errors
  - No type errors in toolRegistry.ts
  - All exports properly typed

- [ ] **AC1.5:** Unit tests pass for registry module:
  - Test: Create registry with valid tools and handlers
  - Test: Lookup handler by name returns correct handler
  - Test: Lookup unknown tool returns undefined
  - Test: Validation throws error for missing handler
  - Test: getAllTools() returns correct tool array
  - Test: size property returns correct count

**Verification Method:** Run `npm test -- tests/toolRegistry.test.ts`

---

## Deliverable 2: Tool Handler Mappings

**Location:** `src/index.ts` (or new `src/toolHandlers.ts`)

### Acceptance Criteria

- [ ] **AC2.1:** Handler creation function implements feature toggle:
  - Accepts `useLegacy: boolean` parameter
  - Creates 23 handlers when useLegacy=true
  - Creates 17 handlers when useLegacy=false
  - Returns `Map<string, ToolHandler>`

- [ ] **AC2.2:** All shared tools have handlers (8 tools):
  - query_elements
  - click_element
  - fill_element
  - navigate
  - get_console_logs
  - inspect_element
  - chrome_list_connections
  - chrome_switch_connection
  - chrome_disconnect

- [ ] **AC2.3:** All legacy-specific tools have handlers (15 tools):
  - chrome_connect, chrome_launch
  - list_targets, switch_target
  - debugger_enable, debugger_set_breakpoint
  - debugger_get_call_stack, debugger_evaluate_on_call_frame
  - debugger_step_over, debugger_step_into, debugger_step_out
  - debugger_resume, debugger_pause
  - debugger_remove_breakpoint, debugger_set_pause_on_exceptions

- [ ] **AC2.4:** All smart-specific tools have handlers (9 tools):
  - chrome, target
  - enable_debug_tools
  - breakpoint, step, execution
  - call_stack, evaluate, pause_on_exceptions

- [ ] **AC2.5:** Each handler preserves type casting pattern:
  - Handler invoke() casts args using `Parameters<typeof toolFn>[0]`
  - Type safety maintained from current implementation
  - No type assertions removed or weakened

**Verification Method:**
- Unit test: `createToolHandlers(true).size === 23`
- Unit test: `createToolHandlers(false).size === 17`
- Manual code review: Verify all 40 tools mapped

---

## Deliverable 3: Registry Integration

**File:** `src/index.ts` (modifications)

### Acceptance Criteria

- [ ] **AC3.1:** Registry initialized at module load:
  - After line 900: `const toolRegistry = createToolRegistry(activeTools, toolHandlers)`
  - Registry created eagerly (not lazily)
  - Feature toggle respected: `USE_LEGACY_TOOLS` determines handlers
  - No runtime errors during initialization

- [ ] **AC3.2:** ListToolsRequestSchema handler uses registry:
  - Replaced lines 982-985 with `return { tools: toolRegistry.getAllTools() }`
  - Returns correct tool count (23 or 17)
  - Tool array matches feature toggle mode

- [ ] **AC3.3:** CallToolRequestSchema handler uses registry lookup:
  - Replaced lines 1010-1182 (172 lines) with registry lookup (~10 lines)
  - Uses `toolRegistry.getHandler(name)` for O(1) lookup
  - Throws `Error('Unknown tool: ${name}')` if handler not found
  - Invokes handler with `handler.invoke(args)`

- [ ] **AC3.4:** Error handling preserved exactly:
  - Lines 1183-1204 unchanged
  - Error classification still uses `classifyError(error, toolName, connectionId)`
  - Error logging still uses `logErrorEvent(classified)`
  - Error response format identical to current implementation
  - All error metadata preserved: `_toolName`, `_errorType`, `_recoverable`

- [ ] **AC3.5:** Code reduction achieved:
  - Dual switch statements removed (162+ lines deleted)
  - New code is <15 lines (registry init + lookup)
  - Net reduction: 150+ lines

**Verification Method:**
- `git diff` shows 150+ line reduction in src/index.ts
- Visual inspection: Verify error handling lines unchanged
- Compile check: `npm run build` succeeds

---

## Deliverable 4: Comprehensive Testing

### Acceptance Criteria

- [ ] **AC4.1:** Unit tests for registry module pass:
  - All 5 tests in tests/toolRegistry.test.ts pass
  - Test coverage: registry creation, lookup, validation, getAllTools, size
  - Run: `npm test -- tests/toolRegistry.test.ts`

- [ ] **AC4.2:** Unit tests for handler creation pass:
  - Test: Legacy mode creates 23 handlers
  - Test: Smart mode creates 17 handlers
  - Test: Shared tools present in both modes (8 tools)
  - Test: Handler names match tool definition names
  - Run: `npm test -- tests/toolHandlers.test.ts`

- [ ] **AC4.3:** Integration test: Legacy mode initialization:
  - Set `USE_LEGACY_TOOLS=true`
  - Server starts without errors
  - Registry size is 23
  - ListTools returns 23 tools
  - Sample tool execution succeeds (e.g., query_elements)

- [ ] **AC4.4:** Integration test: Smart mode initialization:
  - Set `USE_LEGACY_TOOLS=false` (or unset)
  - Server starts without errors
  - Registry size is 17
  - ListTools returns 17 tools
  - Sample tool execution succeeds

- [ ] **AC4.5:** Feature toggle validation:
  - Run `./test-toggle.sh`
  - Legacy mode output: Lists 23 tools, no errors
  - Smart mode output: Lists 17 tools, no errors
  - Output format matches expected pattern

- [ ] **AC4.6:** TypeScript compilation:
  - Run `npm run build`
  - Exits with code 0
  - No type errors in console output
  - build/ directory contains compiled files

- [ ] **AC4.7:** MCP Inspector manual testing (Legacy mode):
  - Run: `USE_LEGACY_TOOLS=true npx @modelcontextprotocol/inspector node build/src/index.js`
  - Server loads without errors
  - Tool list displays 23 tools
  - Execute chrome_connect tool (legacy-specific)
  - Execute query_elements tool (shared)
  - Verify error messages include suggestions

- [ ] **AC4.8:** MCP Inspector manual testing (Smart mode):
  - Run: `npx @modelcontextprotocol/inspector node build/src/index.js`
  - Server loads without errors
  - Tool list displays 17 tools
  - Execute chrome tool (smart-specific, consolidated)
  - Execute query_elements tool (shared)
  - Verify error messages include suggestions

**Verification Method:**
- Automated: `npm test` all tests pass
- Automated: `./test-toggle.sh` outputs expected results
- Manual: Follow MCP Inspector steps, verify behavior

---

## Quality Gates

### Code Quality

- [ ] **QG1:** TypeScript compilation successful:
  - Command: `npm run build`
  - Exit code: 0
  - No compilation errors

- [ ] **QG2:** No type safety regressions:
  - All tool functions maintain type signatures
  - Args casting preserved in handlers
  - No `any` types introduced (except args: unknown in handler interface)

- [ ] **QG3:** Code duplication eliminated:
  - Switch statements removed from src/index.ts
  - No duplicate handler definitions
  - Single registry implementation

### Behavioral Compatibility

- [ ] **QG4:** Feature toggle behavior preserved:
  - Legacy mode: 23 tools routable
  - Smart mode: 17 tools routable
  - Shared tools: Work in both modes
  - Requires server restart to change modes (expected)

- [ ] **QG5:** Error handling identical:
  - Error messages match current format
  - Error classification preserved
  - Suggestions included in error responses
  - Error metadata (_toolName, _errorType, _recoverable) present

- [ ] **QG6:** Tool execution behavior unchanged:
  - All tools execute with same logic
  - Args passing identical
  - Return values identical
  - Side effects identical

### Testing Coverage

- [ ] **QG7:** Unit test coverage:
  - Registry module: 100% coverage (all functions tested)
  - Handler creation: Both modes tested
  - Lookup behavior: Success and failure cases tested

- [ ] **QG8:** Integration test coverage:
  - Both modes tested (legacy and smart)
  - Server initialization tested
  - Tool listing tested
  - Tool execution tested

### Performance

- [ ] **QG9:** Tool lookup performance:
  - Registry lookup is O(1) (Map.get)
  - No performance regression vs. switch statement
  - Server startup time unchanged (<100ms difference)

---

## Documentation Requirements

- [ ] **DOC1:** Update CLAUDE.md project documentation:
  - Add section: "Tool Registry Pattern"
  - Describe registry initialization
  - Explain handler creation
  - Document feature toggle integration

- [ ] **DOC2:** Add code comments in src/toolRegistry.ts:
  - Module-level comment explaining purpose
  - Interface documentation for ToolHandler and ToolRegistry
  - Function documentation for createToolRegistry()

- [ ] **DOC3:** Add code comments in src/index.ts:
  - Comment explaining registry initialization
  - Comment explaining handler creation
  - Comment above handler lookup explaining pattern

- [ ] **DOC4:** Update README.md if needed:
  - No changes required (registry is internal implementation detail)
  - If mentioned, note O(1) lookup performance

---

## Architectural Compliance

### Verification Against CLAUDE.md Laws

- [ ] **ARCH1: ONE SOURCE OF TRUTH**
  - Tool name → handler mapping exists in exactly one place (registry)
  - No duplicate routing logic
  - Tool definitions and handlers synchronized

- [ ] **ARCH2: SINGLE ENFORCER**
  - Error handling enforced at exactly one boundary (MCP handler)
  - Registry does NOT catch errors
  - Classification happens once per error

- [ ] **ARCH3: ONE-WAY DEPENDENCIES**
  - Registry depends on tools (imports tool functions)
  - Tools do NOT depend on registry
  - No circular dependencies

- [ ] **ARCH4: GOALS MUST BE VERIFIABLE**
  - All acceptance criteria testable
  - Success measurable (tool counts, line reduction, test pass rate)
  - Automated verification where possible

---

## Rollback Plan

If critical issues discovered post-integration:

1. **Immediate Rollback:**
   - Revert commit with registry changes
   - Restore switch statement routing
   - Server reverts to known-good state

2. **Rollback Criteria (triggers rollback):**
   - Any tool fails to route correctly
   - Error handling breaks (suggestions lost, classification wrong)
   - Feature toggle stops working
   - TypeScript compilation fails
   - Critical tests fail

3. **No Rollback Needed For:**
   - Documentation incomplete (can be added later)
   - Performance within acceptable range
   - Minor test coverage gaps (can be improved incrementally)

---

## Sign-Off Checklist

Before marking sprint complete, verify:

- [ ] All acceptance criteria met (AC1.1 through AC4.8)
- [ ] All quality gates passed (QG1 through QG9)
- [ ] Documentation requirements met (DOC1 through DOC3)
- [ ] Architectural compliance verified (ARCH1 through ARCH4)
- [ ] No blocking issues remain
- [ ] Code reviewed and approved
- [ ] Changes committed to version control

---

**Definition of Done Status:** DEFINED
**Approved By:** Pending user approval
**Implementation Ready:** YES
