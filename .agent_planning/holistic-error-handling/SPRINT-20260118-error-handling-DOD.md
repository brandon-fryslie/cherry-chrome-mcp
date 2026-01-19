# Definition of Done: Holistic Error Handling

## Acceptance Criteria

### AC1: Custom Error Classes
- [x] `src/errors.ts` exists with four error classes:
  - `ChromeNotConnectedError` - includes connection instructions
  - `DebuggerNotEnabledError` - includes enable_debug_tools() instruction
  - `ExecutionNotPausedError` - includes pause/breakpoint instructions
  - `ExecutionAlreadyPausedError` - includes resume/step instructions

### AC2: BrowserManager *OrThrow Methods
- [x] `getConnectionOrThrow(connectionId?)` - throws `ChromeNotConnectedError` if no connection
- [x] `getPageOrThrow(connectionId?)` - uses `getConnectionOrThrow` internally
- [x] `getCDPSessionOrThrow(connectionId?)` - throws `ChromeNotConnectedError` OR `DebuggerNotEnabledError`
- [x] `requirePaused(connectionId?)` - throws `ExecutionNotPausedError` if not paused
- [x] `requireNotPaused(connectionId?)` - throws `ExecutionAlreadyPausedError` if paused

### AC3: DOM Tools Use Throwing Methods
- [x] `queryElements` uses `getPageOrThrow`
- [x] `clickElement` uses `getPageOrThrow`
- [x] `fillElement` uses `getPageOrThrow`
- [x] `navigate` uses `getPageOrThrow`
- [x] `getConsoleLogs` uses `getConnectionOrThrow`
- [x] Local `getPage()` helper in dom.ts is removed

### AC4: Debugger Tools Use Throwing Methods
- [x] All consolidated tools (`step`, `execution`, `evaluate`, `callStack`, `pauseOnExceptions`, `breakpoint`) use appropriate throwing methods
- [x] All legacy tools (`debuggerStepOver/Into/Out`, `debuggerResume`, `debuggerPause`, etc.) use appropriate throwing methods
- [x] Tools that require paused state use `requirePaused`
- [x] Tools that require running state use `requireNotPaused`

### AC5: Build Passes
- [x] `npm run build` completes without errors
- [x] No TypeScript type errors

### AC6: Error Messages Are Actionable
- [x] When Chrome not connected: message mentions `chrome()` or `chrome_connect()`
- [x] When debugger not enabled: message mentions `enable_debug_tools()`
- [x] When not paused but should be: message mentions `breakpoint()` or `execution({ action: "pause" })`
- [x] When paused but shouldn't be: message mentions `execution({ action: "resume" })` or `step()`

## Verification Method

1. Build the project: `npm run build` ✓
2. Verify no TypeScript errors ✓
3. Manual testing with MCP Inspector (optional - user can do this)

## Implementation Complete

All acceptance criteria completed on 2026-01-18.
See SUMMARY-iterative-implementer-20260118-200735.txt for details.

Commits:
- dd3c77e - feat(browser): add *OrThrow validation methods
- 685c8c1 - feat(dom): use *OrThrow methods for connection validation
- fcf3e13 - feat(debugger): use *OrThrow methods for connection validation
