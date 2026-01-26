# Sprint: testing-org - Testing Infrastructure and Code Organization
Generated: 2026-01-26-144000
Confidence: HIGH: 1, MEDIUM: 2, LOW: 0
Status: PARTIALLY READY
Source: EVALUATION-2026-01-26-143652.md

## Sprint Goal
Improve code organization by extracting handler creation to a separate file and add integration tests for the registry request flow.

## Scope
**Deliverables:**
- Extract createToolHandlers() to new file `src/handlers.ts`
- Add integration tests for MCP request -> registry -> handler flow
- (Optional) Make registry arrays immutable with Object.freeze()

**Prerequisites:**
- Sprint code-quality should be completed first (reduces handler function size)

**Out of Scope:**
- Handler helper function (Sprint 1)
- Type narrowing (Sprint 1)
- JSDoc comments (Sprint 1)

## Work Items

### P2-1. Extract Handler Creation to Separate File [MEDIUM]

**Dependencies**: Sprint code-quality (P2-1 handler helper) recommended first
**Spec Reference**: CLAUDE.md - Modules: "Split by change-reason"
**Status Reference**: EVALUATION-2026-01-26-143652.md Section 4 (createToolHandlers() Function Size)

#### Description
The createToolHandlers() function is 240 lines (lines 925-1166) in src/index.ts. Even after the helper function refactor, handler definitions are a separate concern from MCP server setup. Extract to dedicated file.

#### Acceptance Criteria
- [ ] New file `src/handlers.ts` created
- [ ] createToolHandlers() function moved to handlers.ts
- [ ] addHandler() helper function moved to handlers.ts
- [ ] findTool() helper function moved to handlers.ts
- [ ] src/index.ts imports createToolHandlers from handlers.ts
- [ ] src/index.ts reduced to ~200 lines (server setup + tool definitions only)
- [ ] `npm run build` passes
- [ ] All tests pass

#### Technical Notes
- handlers.ts should export: `createToolHandlers(useLegacy: boolean): Map<string, ToolHandler>`
- handlers.ts should import: all tool functions from `./tools/index.js`
- handlers.ts should import: Tool type from MCP SDK, ToolHandler from toolRegistry
- Consider grouping into sub-functions if file is still large:
  - `createSharedHandlers()`
  - `createLegacyHandlers()`
  - `createSmartHandlers()`

#### Unknowns to Resolve
1. Should tool definitions (legacyTools, smartTools arrays) also move to handlers.ts?
   - Research: Check if they're used elsewhere in index.ts
   - Answer: They're only used in createToolHandlers and server setup. Keep in index.ts for now (tool schemas are server config).

#### Exit Criteria (to reach HIGH confidence)
- [ ] Decide on file boundary (handlers only vs handlers + tool definitions)
- [ ] Verify no circular dependencies would result

---

### P2-2. Add Integration Tests for Registry Flow [MEDIUM]

**Dependencies**: None (can run in parallel with P2-1)
**Spec Reference**: CLAUDE.md - Testing: "Contract vs implementation tests"
**Status Reference**: EVALUATION-2026-01-26-143652.md Section 5 (Test Coverage Gaps)

#### Description
Current tests cover registry mechanics (lookup, validation) but not the full MCP request flow. Add integration tests that exercise: request -> registry lookup -> handler invoke -> response.

#### Acceptance Criteria
- [ ] New test file: `tests/registry-integration.test.ts`
- [ ] Test: valid tool request returns successful response
- [ ] Test: unknown tool request returns error
- [ ] Test: error in handler propagates correctly
- [ ] Test: connection_id extraction works for error classification
- [ ] Tests mock BrowserManager (no real Chrome needed)
- [ ] `npm test` includes new tests and all pass

#### Technical Notes
- Use mock functions for tool implementations
- Test the CallToolRequestSchema handler logic in isolation
- Focus on contract: "given valid request, returns ToolResult structure"
- Focus on error path: "given handler error, returns isError:true with classification"

#### Unknowns to Resolve
1. How to test MCP server handler without starting full server?
   - Research: Check if MCP SDK provides test utilities
   - Fallback: Extract handler logic to testable function

#### Exit Criteria (to reach HIGH confidence)
- [ ] Determine test approach (SDK test utilities vs extraction)
- [ ] Identify minimal mock surface needed

---

### P3-1. Make Registry Arrays Immutable [HIGH]

**Dependencies**: None
**Spec Reference**: CLAUDE.md - State: "Immutable coordination"
**Status Reference**: EVALUATION-2026-01-26-143652.md Section 7 (Registry Immutability Not Enforced)

#### Description
The registry's getAllTools() returns the original array, which callers could mutate. While no bugs have been observed, defensive freezing prevents future issues.

Current behavior (documented and tested):
```typescript
getAllTools(): Tool[] {
  return tools;  // Returns original array
}
```

#### Acceptance Criteria
- [ ] `createToolRegistry()` freezes the tools array: `Object.freeze(tools)`
- [ ] `createToolRegistry()` freezes the handlers map (if possible)
- [ ] Test verifies: `Object.isFrozen(registry.getAllTools())` is true
- [ ] Existing tests continue to pass
- [ ] No runtime errors from frozen objects

#### Technical Notes
- Object.freeze is shallow - tool objects inside the array remain mutable
- For deep freeze, would need recursive freeze (probably overkill)
- Map cannot be frozen, but can return frozen array from entries
- Alternative: return `[...tools]` copy instead of freeze (prevents mutation but allows extension)

---

## Dependencies
- P2-1 (file extraction) benefits from Sprint 1 completion but is not blocked
- P2-2 (integration tests) is independent
- P3-1 (immutability) is independent

## Risks
| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Circular dependency when extracting | Low | Medium | Draw dependency graph before splitting |
| Integration tests require real Chrome | Medium | High | Mock BrowserManager at module level |
| Object.freeze breaks existing code | Low | Low | Test thoroughly, freeze is defensive |
| MCP SDK lacks test utilities | Medium | Medium | Extract handler logic to separate function |

## Success Metrics
- src/index.ts line count: Target <250 lines (from ~1329)
- Test count: Increase by 4-6 integration tests
- Test coverage: Registry flow fully exercised
- Mutation safety: Arrays frozen at creation
