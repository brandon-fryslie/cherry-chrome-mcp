# Definition of Done: code-quality
Generated: 2026-01-26-144000
Status: READY FOR IMPLEMENTATION
Plan: SPRINT-20260126-144000-code-quality-PLAN.md

## Acceptance Criteria

### P2-1. Handler Helper Function
- [ ] `addHandler<F>()` generic helper function exists in src/index.ts
- [ ] All 33 handler registrations converted to use helper function
- [ ] Tool names appear exactly once per handler registration (not 3 times)
- [ ] Type safety preserved via `Parameters<F>[0]` casting pattern
- [ ] `npm run build` compiles without TypeScript errors
- [ ] All 25 registry tests pass (`npm test`)
- [ ] createToolHandlers() reduced by at least 100 lines

### P2-2. Type Safety Improvements
- [ ] Interface `ErrorWithInfo` defined: `{ errorInfo: ErrorInfo }`
- [ ] Type guard `hasErrorInfo(e: unknown): e is ErrorWithInfo` implemented
- [ ] Interface `ToolArguments` defined: `{ connection_id?: string; [key: string]: unknown }`
- [ ] Return type uses proper MCP SDK type or documented assertion
- [ ] Zero uses of `as any` in src/index.ts (verified by grep)
- [ ] `npm run build` compiles without TypeScript errors
- [ ] All tests pass

### P3-1. JSDoc Documentation
- [ ] JSDoc comment block before "Shared DOM tools" section
- [ ] JSDoc comment block before "Shared connection tools" section
- [ ] JSDoc comment block before "Legacy-specific tools" section
- [ ] JSDoc comment block before "Smart-specific tools" section
- [ ] Each comment includes: category name, tool count, purpose description
- [ ] Comments follow existing codebase JSDoc style

## Verification Commands

```bash
# Build verification
npm run build

# Test verification
npm test

# Check for any remaining 'as any' usage
grep -n "as any" src/index.ts

# Line count verification (should be <120 lines for createToolHandlers)
sed -n '/^function createToolHandlers/,/^}/p' src/index.ts | wc -l

# Verify handler count unchanged
npm test 2>&1 | grep -E "(legacy|smart) mode.*handlers"
```

## Definition of Done Checklist

Before marking sprint complete:

- [ ] All acceptance criteria above are checked
- [ ] `npm run build` succeeds
- [ ] `npm test` shows all tests passing
- [ ] No regression in tool functionality (verified by test suite)
- [ ] Code review: changes are minimal and surgical
- [ ] Git diff shows net line reduction (not line shuffling)
