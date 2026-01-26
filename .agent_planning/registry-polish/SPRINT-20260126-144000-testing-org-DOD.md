# Definition of Done: testing-org
Generated: 2026-01-26-144000
Status: PARTIALLY READY
Plan: SPRINT-20260126-144000-testing-org-PLAN.md

## Acceptance Criteria

### P2-1. Extract Handler Creation
- [ ] File `src/handlers.ts` exists
- [ ] Function `createToolHandlers(useLegacy: boolean)` exported from handlers.ts
- [ ] Helper functions `addHandler()` and `findTool()` in handlers.ts (not exported)
- [ ] `src/index.ts` imports `createToolHandlers` from `./handlers.js`
- [ ] `src/index.ts` line count reduced to ~200 lines
- [ ] No circular dependencies (verified: `npm run build` succeeds)
- [ ] All existing tests pass

### P2-2. Integration Tests
- [ ] File `tests/registry-integration.test.ts` exists
- [ ] Test case: "valid tool request returns successful ToolResult"
- [ ] Test case: "unknown tool returns error with message"
- [ ] Test case: "handler error returns isError:true with classification"
- [ ] Test case: "connection_id extracted from request.params.arguments"
- [ ] Tests use mocked tool implementations (no real Chrome)
- [ ] Tests run with `npm test` (included in test suite)
- [ ] All new tests pass

### P3-1. Registry Immutability
- [ ] `createToolRegistry()` calls `Object.freeze(tools)` before storing
- [ ] Test verifies: `Object.isFrozen(registry.getAllTools()) === true`
- [ ] Existing tests continue to pass (no mutation assumptions broken)
- [ ] No runtime TypeError from frozen objects

## Exit Criteria for MEDIUM Confidence Items

### P2-1 (Extract Handlers) - Reach HIGH:
- [ ] Dependency analysis complete: no cycles possible
- [ ] File boundary decision documented
- [ ] Minimal change approach confirmed

### P2-2 (Integration Tests) - Reach HIGH:
- [ ] Test approach determined (SDK utilities vs extraction)
- [ ] Mock surface identified and documented
- [ ] Sample test structure drafted

## Verification Commands

```bash
# Build verification
npm run build

# Test verification (should include new integration tests)
npm test

# Check file structure
ls -la src/handlers.ts

# Verify index.ts size reduction
wc -l src/index.ts  # Target: <250 lines

# Verify registry immutability
node -e "
const { createToolRegistry } = require('./build/src/toolRegistry.js');
const tools = [{ name: 'test', description: 'test', inputSchema: {} }];
const handlers = new Map([['test', { name: 'test', definition: tools[0], invoke: async () => ({}) }]]);
const registry = createToolRegistry(tools, handlers);
console.log('Frozen:', Object.isFrozen(registry.getAllTools()));
"
```

## Definition of Done Checklist

Before marking sprint complete:

- [ ] All HIGH confidence acceptance criteria checked
- [ ] MEDIUM confidence items either: completed OR raised to HIGH with documented decisions
- [ ] `npm run build` succeeds
- [ ] `npm test` shows all tests passing (including new integration tests)
- [ ] No regression in existing functionality
- [ ] Code review: changes follow existing patterns
- [ ] New files follow existing naming conventions
