# Sprint: code-quality - Handler Boilerplate and Type Safety
Generated: 2026-01-26-144000
Confidence: HIGH: 3, MEDIUM: 0, LOW: 0
Status: READY FOR IMPLEMENTATION
Source: EVALUATION-2026-01-26-143652.md

## Sprint Goal
Reduce handler definition boilerplate by ~150 lines and eliminate 3 `any` type assertions without changing runtime behavior.

## Scope
**Deliverables:**
- Helper function `addHandler<F>()` that eliminates triple name repetition pattern
- Proper TypeScript interfaces for error objects and request params
- JSDoc comments for handler groups (DOM, connection, debugger)

**Out of Scope:**
- File reorganization (separate sprint)
- Integration tests (separate sprint)
- Registry immutability (separate sprint)

## Work Items

### P2-1. Create Handler Helper Function [HIGH]

**Dependencies**: None
**Spec Reference**: CLAUDE.md - ONE SOURCE OF TRUTH principle
**Status Reference**: EVALUATION-2026-01-26-143652.md Section 1 (Handler Definition Repetition)

#### Description
The current handler registration pattern repeats the tool name 3 times per handler across 33 handlers (lines 930-1162 in src/index.ts). This violates DRY and creates maintenance burden.

Current pattern (repeated 33 times):
```typescript
handlers.set('query_elements', {           // name #1
  name: 'query_elements',                  // name #2
  definition: findTool(tools, 'query_elements'),  // name #3
  invoke: async (args: unknown) =>
    queryElements(args as Parameters<typeof queryElements>[0]),
});
```

Target pattern:
```typescript
addHandler(handlers, 'query_elements', tools, queryElements);
```

#### Acceptance Criteria
- [ ] `addHandler<F>()` generic helper function exists in src/index.ts
- [ ] All 33 handler registrations use the helper function
- [ ] Tool names appear exactly once per handler (not 3 times)
- [ ] Type safety preserved: `Parameters<F>[0]` casting pattern maintained
- [ ] `npm run build` passes without TypeScript errors
- [ ] All 25 registry tests still pass (`npm test`)
- [ ] Line count reduction of at least 100 lines in createToolHandlers()

#### Technical Notes
- Helper function signature: `function addHandler<F extends (...args: any[]) => Promise<ToolResult>>(handlers: Map<string, ToolHandler>, name: string, tools: Tool[], fn: F): void`
- The generic `F` captures the specific tool function type for proper argument casting
- `Parameters<F>[0]` extracts the first parameter type from the function
- Place helper inside createToolHandlers() or immediately before it (avoid module-level export for internal-only helper)

---

### P2-2. Narrow `any` Type Assertions [HIGH]

**Dependencies**: None
**Spec Reference**: CLAUDE.md - Type Safety guidelines
**Status Reference**: EVALUATION-2026-01-26-143652.md Section 2 (TypeScript any Usage)

#### Description
Three `any` type assertions bypass TypeScript safety. Each can be replaced with proper interfaces.

**Location 1** (Line 1209): Error with errorInfo
```typescript
const info = (error as any).errorInfo as ErrorInfo;
```

**Location 2** (Line 1295): Request params with connection_id
```typescript
const connectionId = (request.params.arguments as any)?.connection_id;
```

**Location 3** (Line 1312): Return value type
```typescript
} as any;
```

#### Acceptance Criteria
- [ ] Interface `ErrorWithInfo` defined with `errorInfo: ErrorInfo` property
- [ ] Interface `ToolArguments` defined with `connection_id?: string` property
- [ ] Return type explicitly matches MCP SDK expectations (no `as any` needed)
- [ ] `npm run build` passes without TypeScript errors
- [ ] Zero uses of `as any` in src/index.ts
- [ ] All tests pass (`npm test`)

#### Technical Notes
- ErrorWithInfo interface: `interface ErrorWithInfo extends Error { errorInfo: ErrorInfo }`
- Use type guard: `function hasErrorInfo(e: unknown): e is ErrorWithInfo`
- ToolArguments: `interface ToolArguments { connection_id?: string; [key: string]: unknown }`
- For return value, check MCP SDK types for `CallToolResult` or similar
- If MCP SDK types are insufficient, use type assertion with comment explaining why

---

### P3-1. Add JSDoc Comments for Handler Groups [HIGH]

**Dependencies**: P2-1 (easier to add after consolidation)
**Spec Reference**: CLAUDE.md - Documentation guidelines
**Status Reference**: EVALUATION-2026-01-26-143652.md Section 6 (Handler JSDoc Comments Missing)

#### Description
The createToolHandlers() function has good function-level JSDoc but lacks inline documentation for handler categories. Add block comments before each handler group to explain purpose.

#### Acceptance Criteria
- [ ] JSDoc comment block before "Shared DOM tools" section
- [ ] JSDoc comment block before "Shared connection tools" section
- [ ] JSDoc comment block before "Legacy-specific tools" section
- [ ] JSDoc comment block before "Smart-specific tools" section
- [ ] Each comment explains: category name, count of tools, purpose
- [ ] Comments follow existing JSDoc style in codebase

#### Technical Notes
Example format:
```typescript
/**
 * Shared DOM tools (6 tools)
 *
 * Query, click, fill, navigate, console, inspect operations.
 * Available in both legacy and smart modes.
 */
addHandler(handlers, 'query_elements', tools, queryElements);
// ...
```

---

## Dependencies
- Work items P2-1, P2-2 are independent and can be done in parallel
- P3-1 depends on P2-1 (add JSDoc after helper function refactor)

## Risks
| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Type inference breaks with helper | Low | Medium | Keep original pattern as fallback, test incrementally |
| MCP SDK types incompatible | Low | Low | Use explicit type assertion with explanatory comment |
| Test failures after refactor | Low | Medium | Run tests after each handler conversion, not just at end |

## Success Metrics
- Line count in createToolHandlers(): Target <120 lines (from ~240)
- `any` count in src/index.ts: Target 0 (from 3)
- TypeScript strict mode: No new errors
- Test pass rate: 100% (unchanged from baseline)
