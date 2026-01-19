# Runtime Behavior: Error Handling System

Last Updated: 2026-01-18

## Error Differentiation Pattern

The error handling system correctly differentiates between three levels of failure:

### Level 1: No Connection
**Error:** `ChromeNotConnectedError`
**Trigger:** Any tool call when Chrome is not connected
**Message Pattern:** Includes chrome() connection instructions

### Level 2: Connection Exists, Debugger Not Enabled
**Error:** `DebuggerNotEnabledError`
**Trigger:** Debugger tool calls when debugger not enabled
**Message Pattern:** Mentions enable_debug_tools()

### Level 3: Execution State Mismatch
**Error:** `ExecutionNotPausedError` or `ExecutionAlreadyPausedError`
**Trigger:** State-dependent operations (step requires paused, pause requires running)
**Message Pattern:** Includes options to change state

## Validation Order (Critical)

The BrowserManager enforces validation in correct order:

```
requirePaused() / requireNotPaused()
  ↓ (calls)
getCDPSessionOrThrow()
  ↓ (calls)
getConnectionOrThrow()
```

This ensures errors are specific:
- Connection missing → ChromeNotConnectedError
- Connection exists but debugger off → DebuggerNotEnabledError
- Debugger on but wrong execution state → ExecutionNotPausedError/AlreadyPausedError

## Tool Error Handling Patterns

### DOM Tools (5 total)
- Use `getPageOrThrow()` (queryElements, clickElement, fillElement, navigate)
- Use `getConnectionOrThrow()` (getConsoleLogs)
- All have try-catch wrapping throwing calls

### Debugger Tools (17 total)
- **Legacy tools (11):** All have try-catch with throwing methods
- **Delegating consolidated tools (4):** Rely on legacy error handling (breakpoint, evaluate, callStack, pauseOnExceptions)
- **Full consolidated tools (2):** Have own try-catch (step, execution)

### Error Response Format
All tools use: `errorResponse(error instanceof Error ? error.message : String(error))`

This ensures:
- Custom error messages are preserved
- Unknown error types are stringified
- Consistent error formatting across all tools

## Single Enforcer Compliance

✅ Follows PRIMARY CONSTRAINT: "Single Enforcer"
- BrowserManager is the ONE boundary where connection/debugger state is enforced
- Tools call throwing methods; they don't duplicate state checks
- Error messages are constructed in error classes, not scattered in tool code

## Break-It Test Cases

These scenarios are EXPECTED to throw (not failures):

1. Call step() without Chrome connected → ChromeNotConnectedError
2. Call step() when connected but debugger not enabled → DebuggerNotEnabledError
3. Call step() when debugger enabled but not paused → ExecutionNotPausedError
4. Call execution({ action: "pause" }) when already paused → ExecutionAlreadyPausedError

These are correct behaviors showing error differentiation works.

## Edge Cases

### Delegating Functions
Functions like `callStack()` and `pauseOnExceptions()` delegate to legacy functions:
- They DON'T have their own try-catch
- This is CORRECT: error handling happens in the function they delegate to
- Adding try-catch would be duplication (violates Single Enforcer)

### Old Helper Removed
The local `getPage()` helper in dom.ts was removed:
- Previously returned null, requiring each tool to check
- Now tools call browserManager.getPageOrThrow() directly
- This enforces the Single Enforcer pattern

## Performance Characteristics

Error throwing is fast:
- No repeated null checks across tools
- Validation happens once at BrowserManager boundary
- Error construction is lazy (only when error occurs)

## Type Safety

All throwing methods have return types that are non-nullable:
- `getConnectionOrThrow(): Connection` (not `Connection | null`)
- `getPageOrThrow(): Page` (not `Page | null`)
- `getCDPSessionOrThrow(): CDPSession` (not `CDPSession | null`)
- `requirePaused(): DebuggerPausedEvent` (not `DebuggerPausedEvent | null`)

TypeScript enforces this at compile time.
