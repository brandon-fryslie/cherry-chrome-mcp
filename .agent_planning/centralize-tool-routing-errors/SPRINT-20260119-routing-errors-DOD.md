# Definition of Done: Centralize Error Handling in Tool Routing

**Sprint:** SPRINT-20260119-centralize-routing-errors
**Date:** 2026-01-19
**Confidence:** HIGH

---

## Sign-Off Criteria

**Ready for sign-off when ALL of the following are true:**

### Build & Compilation
- [ ] `npm run build` succeeds (0 errors, 0 warnings)
- [ ] Smart mode starts: `node build/src/index.js` (no errors)
- [ ] Legacy mode starts: `USE_LEGACY_TOOLS=true node build/src/index.js` (no errors)
- [ ] All TypeScript type checks pass
- [ ] No console warnings during startup

### Phase 1: Error Type Properties
- [ ] ErrorInfo interface created in src/errors.ts
- [ ] All 4 error classes have errorInfo property
- [ ] errorInfo is readonly on each class
- [ ] errorType values: CONNECTION | DEBUGGER | STATE | EXECUTION
- [ ] recoverable values correct (all true for these 4)
- [ ] suggestion values reference tool names
- [ ] All error messages preserved exactly (no wording changes)
- [ ] Each error class compiles without errors

### Phase 2: Error Classification & Logging
- [ ] classifyError() function exists and handles all 4 error types
- [ ] classifyError() falls back to UNKNOWN for unexpected errors
- [ ] classifyError() preserves original error message
- [ ] classifyError() includes tool name in result
- [ ] classifyError() includes connection ID in result
- [ ] classifyError() includes suggestion from error class
- [ ] logErrorEvent() function exists
- [ ] logErrorEvent() logs to console.error
- [ ] logErrorEvent() includes ISO timestamp
- [ ] logErrorEvent() includes error type
- [ ] logErrorEvent() includes tool name
- [ ] logErrorEvent() includes recoverable flag
- [ ] logErrorEvent() includes suggestion if available
- [ ] logErrorEvent() does NOT log full request arguments (no PII)

### Phase 3: Global Error Handler
- [ ] Global handler extracts tool name from request
- [ ] Global handler extracts connection ID from arguments
- [ ] Global handler calls classifyError()
- [ ] Global handler calls logErrorEvent()
- [ ] Global handler returns error response
- [ ] Response content includes error message
- [ ] Response content includes suggestion (if available)
- [ ] Response isError field = true
- [ ] Response structure backward compatible
- [ ] All existing response fields unchanged

### Phase 4: Response Enhancement (if MCP allows)
- [ ] Response includes _toolName field
- [ ] Response includes _errorType field
- [ ] Response includes _recoverable field
- [ ] No existing fields removed
- [ ] MCP protocol accepts response
- [ ] Fields help client-side error handling

### Phase 5: Documentation
- [ ] Comments added explaining error handler architecture
- [ ] Error flow documented (tool → throw → catch → classify → respond)
- [ ] Error types documented with examples
- [ ] Recovery actions documented for each type
- [ ] Error classes header comment updated
- [ ] All documentation accurate and complete

### Verification & Testing
- [ ] No breaking changes to error handling
- [ ] No breaking changes to tool behavior
- [ ] Error messages clearer with suggestions
- [ ] Console output parseable and useful
- [ ] All 4 error types tested with classification
- [ ] Fallback handles unknown error types
- [ ] Build passes after each phase
- [ ] Code follows project conventions

---

## Phase-by-Phase Acceptance Criteria

### Phase 1 Checkpoints

**Checkpoint 1.1: ErrorInfo Interface**
- [ ] Interface exists with exact structure:
  ```typescript
  interface ErrorInfo {
    readonly errorType: 'CONNECTION' | 'DEBUGGER' | 'STATE' | 'EXECUTION' | 'UNKNOWN';
    readonly recoverable: boolean;
    readonly suggestion?: string;
  }
  ```
- [ ] Located at top of src/errors.ts
- [ ] TypeScript accepts interface
- [ ] No other code changes yet

**Checkpoint 1.2: ChromeNotConnectedError Updated**
- [ ] Has errorInfo property
- [ ] errorInfo is readonly
- [ ] errorType = 'CONNECTION'
- [ ] recoverable = true
- [ ] suggestion mentions chrome() or chrome_connect()
- [ ] Error message unchanged
- [ ] Compiles without errors

**Checkpoint 1.3: DebuggerNotEnabledError Updated**
- [ ] Has errorInfo property
- [ ] errorInfo is readonly
- [ ] errorType = 'DEBUGGER'
- [ ] recoverable = true
- [ ] suggestion mentions enable_debug_tools() or debugger_enable()
- [ ] Error message unchanged
- [ ] Compiles without errors

**Checkpoint 1.4: ExecutionNotPausedError Updated**
- [ ] Has errorInfo property
- [ ] errorInfo is readonly
- [ ] errorType = 'STATE'
- [ ] recoverable = true
- [ ] suggestion mentions breakpoint() or debugger_set_breakpoint() or pause()
- [ ] Error message unchanged
- [ ] Compiles without errors

**Checkpoint 1.5: ExecutionAlreadyPausedError Updated**
- [ ] Has errorInfo property
- [ ] errorInfo is readonly
- [ ] errorType = 'STATE'
- [ ] recoverable = true
- [ ] suggestion mentions resume() or step()
- [ ] Error message unchanged
- [ ] Compiles without errors

**Phase 1 Success Criteria:**
- [ ] `npm run build` passes
- [ ] All 4 error classes have errorInfo property
- [ ] errorInfo structures valid
- [ ] No existing error messages changed
- [ ] TypeScript compilation clean

---

### Phase 2 Checkpoints

**Checkpoint 2.1: classifyError() Function**
- [ ] Function signature: `classifyError(error: unknown, toolName: string, connectionId?: string): ClassifiedError`
- [ ] Returns object with all required fields:
  - [ ] errorType (one of 5 types)
  - [ ] message (string)
  - [ ] recoverable (boolean)
  - [ ] suggestion (string or undefined)
  - [ ] toolName (string)
  - [ ] connectionId (string or undefined)
- [ ] Checks for errorInfo property first
- [ ] Extracts errorType, recoverable, suggestion from errorInfo
- [ ] Falls back to UNKNOWN for errors without errorInfo
- [ ] Preserves original error message
- [ ] Handles null/undefined gracefully
- [ ] TypeScript types correct

**Checkpoint 2.2: logErrorEvent() Function**
- [ ] Function signature: `logErrorEvent(classified: ClassifiedError): void`
- [ ] Calls console.error (not console.log)
- [ ] Includes ISO timestamp
- [ ] Format includes: `[ERROR:TYPE]`
- [ ] Format includes: `tool=<toolName>`
- [ ] Format includes: `conn=<connectionId>` (if present)
- [ ] Format includes: `recoverable=true/false`
- [ ] First line: `timestamp [ERROR:TYPE] tool=... [conn=...] [recoverable=...] message`
- [ ] Second line (if suggestion): `Suggestion: <suggestion>`
- [ ] No full request args logged (no PII)
- [ ] Example output:
  ```
  2026-01-19T03:45:00.123Z [ERROR:CONNECTION] tool=query_elements Chrome not connected
    Suggestion: Call chrome() or chrome_connect() first
  ```

**Checkpoint 2.3: Global Error Handler Updated**
- [ ] Handler extracts `toolName` from `request.params.name`
- [ ] Handler extracts `connectionId` from `request.params.arguments?.connection_id`
- [ ] Handler calls `classifyError(error, toolName, connectionId)`
- [ ] Handler calls `logErrorEvent(classified)`
- [ ] Handler includes error message in response
- [ ] Handler appends suggestion to message if available:
  ```
  Error message

  Suggestion: <suggestion>
  ```
- [ ] Response isError = true
- [ ] Response content type = 'text'
- [ ] Response structure backward compatible
- [ ] No existing fields removed

**Phase 2 Success Criteria:**
- [ ] `npm run build` passes
- [ ] classifyError() correctly classifies all 4 error types
- [ ] classifyError() falls back to UNKNOWN for unknown errors
- [ ] logErrorEvent() produces structured logs
- [ ] Global handler integrates both functions
- [ ] Error messages enhanced with suggestions
- [ ] Console output useful for debugging
- [ ] All TypeScript types correct

---

### Phase 3 Checkpoints (If MPC Allows)

**Checkpoint 3.1: Response Metadata Fields**
- [ ] Response includes `_toolName` field
- [ ] `_toolName` = request.params.name
- [ ] Response includes `_errorType` field
- [ ] `_errorType` = classified.errorType (one of 5 types)
- [ ] Response includes `_recoverable` field
- [ ] `_recoverable` = classified.recoverable (boolean)
- [ ] Fields use underscore prefix (_)
- [ ] All existing fields still present and unchanged
- [ ] MCP protocol accepts response

**Checkpoint 3.2: Metadata Utility**
- [ ] Metadata helps client-side error handling
- [ ] Client can route by error type
- [ ] Client can offer retry button if recoverable=true
- [ ] No breaking changes to MCP responses

**Phase 3 Success Criteria:**
- [ ] `npm run build` passes
- [ ] Response includes metadata fields
- [ ] Existing fields unchanged
- [ ] MCP protocol compatible
- [ ] Client-side error handling improved

---

### Phase 4 Checkpoints

**Checkpoint 4.1: Comments in Error Handler**
- [ ] Comment block before CallToolRequestSchema handler
- [ ] Explains error classification and routing
- [ ] Documents error flow (tool → throw → catch → classify → respond)
- [ ] Lists error types with meanings
- [ ] Provides recovery guidance
- [ ] ~10-15 lines of clear explanation

**Checkpoint 4.2: Comments in Error Classes**
- [ ] File header comment in src/errors.ts
- [ ] Explains custom error classes purpose
- [ ] Documents error classification system
- [ ] Describes each error type (CONNECTION, DEBUGGER, STATE, EXECUTION)
- [ ] Explains errorInfo property
- [ ] ~15-20 lines of clear explanation

**Checkpoint 4.3: Code Comments**
- [ ] classifyError() has JSDoc or inline comments
- [ ] logErrorEvent() has JSDoc or inline comments
- [ ] Complex logic explained
- [ ] All new functions documented

**Phase 4 Success Criteria:**
- [ ] Documentation is clear and complete
- [ ] Error handling approach well explained
- [ ] Contributors understand the system
- [ ] No misleading or outdated comments

---

## Integration Test Checklist

### Test 1: Build & Startup
- [ ] `npm run build` exits with code 0
- [ ] Build output contains 0 errors, 0 warnings
- [ ] `node build/src/index.js` starts without errors
- [ ] `USE_LEGACY_TOOLS=true node build/src/index.js` starts without errors
- [ ] Both modes show startup message
- [ ] No TypeScript errors during compilation

### Test 2: Error Classification Coverage
- [ ] ChromeNotConnectedError → classified as CONNECTION
- [ ] DebuggerNotEnabledError → classified as DEBUGGER
- [ ] ExecutionNotPausedError → classified as STATE
- [ ] ExecutionAlreadyPausedError → classified as STATE
- [ ] Unknown error → classified as UNKNOWN
- [ ] All classifications have recoverable=true or false
- [ ] All classifications have suggestions (if applicable)

### Test 3: Console Logging Output
- [ ] Error logged to console.error
- [ ] Log includes ISO timestamp
- [ ] Log includes [ERROR:TYPE] marker
- [ ] Log includes tool=<name>
- [ ] Log includes conn=<id> if present
- [ ] Log includes recoverable flag
- [ ] Suggestion on separate line if present
- [ ] Format consistent across all errors

### Test 4: Response Structure
- [ ] Response has `content` array
- [ ] Response has `isError: true`
- [ ] Content has `type: 'text'`
- [ ] Content text includes error message
- [ ] Content text includes suggestion if available
- [ ] Format: `message\n\nSuggestion: <suggestion>`
- [ ] Response backward compatible
- [ ] No existing fields removed

### Test 5: Error Message Accuracy
- [ ] Error messages unchanged from original
- [ ] No typos in messages
- [ ] Suggestions are actionable
- [ ] Suggestions reference correct tools
- [ ] No misleading messages

### Test 6: Code Quality
- [ ] No new eslint/prettier violations
- [ ] No console.warn or unhandled exceptions
- [ ] No infinite loops or recursion
- [ ] No memory leaks from logging
- [ ] Performance impact minimal

---

## Non-Acceptance Criteria (FAIL CONDITIONS)

The work is NOT done if ANY of these are true:

- ❌ Build fails: `npm run build` exits with non-zero code
- ❌ TypeScript compilation errors exist
- ❌ Startup fails in either mode
- ❌ Error classification missing for any of 4 error types
- ❌ classifyError() doesn't handle unknown errors
- ❌ logErrorEvent() doesn't produce output
- ❌ Response structure broken (missing content or isError)
- ❌ Existing error messages changed or removed
- ❌ Tool behavior changed or broken
- ❌ Breaking changes to error handling
- ❌ PII accidentally logged in console
- ❌ Documentation incomplete or inaccurate

---

## Manual Testing Scenarios

### Scenario 1: Connection Error
**Steps:**
1. Call query_elements without connecting first
2. Observe: "Chrome not connected" error message
3. Observe: Suggestion to call chrome() or chrome_connect()
4. Observe: Console shows `[ERROR:CONNECTION]` marker
5. Observe: Console shows recoverable=true

**Expected Output:**
```
Error: Chrome not connected. To connect to Chrome:
- Call chrome({ action: 'launch' }) to start a new Chrome instance
- Or chrome({ action: 'connect', host: 'localhost', port: 9222 })

Suggestion: Call chrome() or chrome_connect() to establish a connection
```

### Scenario 2: Debugger Error
**Steps:**
1. Connect to Chrome successfully
2. Call debugger_get_call_stack without enabling debugger first
3. Observe: "Debugger not enabled" error message
4. Observe: Suggestion to call enable_debug_tools()
5. Observe: Console shows `[ERROR:DEBUGGER]` marker
6. Observe: Console shows recoverable=true

**Expected Output:**
```
Error: Debugger not enabled. To enable the debugger:
- Call enable_debug_tools() or debugger_enable()
- Then set breakpoints or pause execution

Suggestion: Call enable_debug_tools() or debugger_enable() first
```

### Scenario 3: State Error
**Steps:**
1. Connect and enable debugger
2. Call step() without pausing execution first
3. Observe: "Not paused" error message
4. Observe: Suggestion to pause or set breakpoint
5. Observe: Console shows `[ERROR:STATE]` marker
6. Observe: Console shows recoverable=true

**Expected Output:**
```
Error: Execution not paused. To pause execution:
- Set a breakpoint with breakpoint() or debugger_set_breakpoint()
- Or call pause() or debugger_pause()

Suggestion: Set a breakpoint or call pause()/debugger_pause() first
```

---

## Rollback Plan

If critical issues discovered:

1. Revert src/errors.ts: `git checkout src/errors.ts`
2. Revert src/index.ts: `git checkout src/index.ts`
3. Verify build: `npm run build`
4. Both modes should work as before

**Why safe to rollback:**
- Only 2 files modified
- Changes are additive (error info properties)
- No logic changes to existing error handling
- No tool behavior changes

---

## Sign-Off Checklist

Before marking as complete, verify:

- [ ] All Phase 1 acceptance criteria met
- [ ] All Phase 2 acceptance criteria met
- [ ] All Phase 3 acceptance criteria met (if applicable)
- [ ] All Phase 4 acceptance criteria met
- [ ] All integration tests passed
- [ ] All manual scenarios tested
- [ ] No non-acceptance criteria violated
- [ ] Build passes with 0 errors
- [ ] Both modes start without errors
- [ ] Code quality acceptable
- [ ] Documentation complete

**Sprint is DONE when all items checked.**

---

## Definition of Done Summary

**Scope Completed:**
- ✅ Error type properties added
- ✅ Error classification logic implemented
- ✅ Error logging structured
- ✅ Global handler enhanced
- ✅ Response metadata included (if MCP allows)
- ✅ Documentation complete

**Quality Gates Passed:**
- ✅ Build succeeds
- ✅ Tests pass
- ✅ No breaking changes
- ✅ Backward compatible
- ✅ Code follows conventions

**User Value Delivered:**
- ✅ Better error messages with suggestions
- ✅ Structured error logs for debugging
- ✅ Error types available for client-side handling
- ✅ Improved observability and support experience

---

**Definition of Done Generated:** 2026-01-19
**Approval Status:** Pending User Approval
**Confidence Level:** HIGH
