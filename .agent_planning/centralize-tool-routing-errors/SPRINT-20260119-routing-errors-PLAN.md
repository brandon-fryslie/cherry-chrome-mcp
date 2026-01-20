# Sprint Plan: Centralize Error Handling in Tool Routing

**Sprint ID:** SPRINT-20260119-centralize-routing-errors
**Date:** 2026-01-19
**Confidence Level:** HIGH
**Status:** ✅ READY FOR IMPLEMENTATION

---

## Sprint Goal

Implement centralized error classification and enhanced error responses in the MCP server's global tool routing handler, enabling better error observability, debugging, and client-side error handling without breaking backward compatibility.

---

## Scope

**What Gets Built:**
1. Error type properties added to custom error classes
2. Error classification logic in global routing handler (src/index.ts)
3. Enhanced error responses with metadata (error type, tool name, connection ID)
4. Structured error logging for observability
5. Documentation and comments for error handling patterns

**What Stays the Same:**
- All individual tool error handling (already complete and working)
- BrowserManager error methods (already complete)
- Error message content (messages preserved verbatim)
- Response structure (content array and isError field unchanged)
- All tool behavior and functionality

---

## Work Breakdown

### Phase 1: Add Error Type Properties to Error Classes

**File:** `src/errors.ts`
**Effort:** 15 minutes
**Priority:** P0

**Deliverable 1.1: ErrorInfo Interface**

Create type definition for error metadata:

```typescript
interface ErrorInfo {
  readonly errorType: 'CONNECTION' | 'DEBUGGER' | 'STATE' | 'EXECUTION' | 'UNKNOWN';
  readonly recoverable: boolean;
  readonly suggestion?: string;
}
```

**Location:** Lines 1-10 in src/errors.ts
**Acceptance Criteria:**
- [ ] Interface defined with 4 error types
- [ ] `errorType` is readonly (immutable)
- [ ] `recoverable` boolean indicates if user can retry/fix
- [ ] `suggestion` field is optional (undefined if no suggestion)
- [ ] TypeScript compiles without errors

**Deliverable 1.2: Add Error Info to Error Classes**

Add `errorInfo` property to each of 4 error classes:

```typescript
// ChromeNotConnectedError
errorInfo: ErrorInfo = {
  errorType: 'CONNECTION',
  recoverable: true,
  suggestion: 'Call chrome() or chrome_connect() to establish a connection'
};

// DebuggerNotEnabledError
errorInfo: ErrorInfo = {
  errorType: 'DEBUGGER',
  recoverable: true,
  suggestion: 'Call enable_debug_tools() or debugger_enable() first'
};

// ExecutionNotPausedError
errorInfo: ErrorInfo = {
  errorType: 'STATE',
  recoverable: true,
  suggestion: 'Set a breakpoint or call pause()/debugger_pause() first'
};

// ExecutionAlreadyPausedError
errorInfo: ErrorInfo = {
  errorType: 'STATE',
  recoverable: true,
  suggestion: 'Call resume()/debugger_resume() or step through execution'
};
```

**Location:** In each error class (lines 15-25, 30-40, 45-55, 60-70)
**Acceptance Criteria:**
- [ ] All 4 error classes have errorInfo property
- [ ] errorInfo property is readonly
- [ ] errorType values match ErrorInfo type
- [ ] recoverable set correctly (all true for these 4)
- [ ] suggestion values are actionable and mention tool names
- [ ] TypeScript compiles without errors
- [ ] Existing error messages preserved (no content changes)

---

### Phase 2: Implement Error Classification in Routing Handler

**File:** `src/index.ts`
**Location:** Lines 828-1010 (CallToolRequestSchema handler)
**Effort:** 20 minutes
**Priority:** P0

**Deliverable 2.1: Error Classification Function**

Create function to extract and classify errors:

```typescript
interface ClassifiedError {
  errorType: 'CONNECTION' | 'DEBUGGER' | 'STATE' | 'EXECUTION' | 'UNKNOWN';
  message: string;
  recoverable: boolean;
  suggestion?: string;
  toolName?: string;
  connectionId?: string;
}

function classifyError(
  error: unknown,
  toolName: string,
  connectionId?: string
): ClassifiedError {
  // Check if error has errorInfo property
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

**Location:** Lines 830-860 (new function before CallToolRequestSchema handler)
**Acceptance Criteria:**
- [ ] Function exists with correct signature
- [ ] Checks for errorInfo property first
- [ ] Extracts all fields from errorInfo
- [ ] Fallback handles unknown errors
- [ ] Returns ClassifiedError with all fields populated
- [ ] TypeScript types are correct
- [ ] Function handles null/undefined gracefully

**Deliverable 2.2: Structured Error Logging Function**

Create function for consistent error logging:

```typescript
function logErrorEvent(classified: ClassifiedError): void {
  const timestamp = new Date().toISOString();
  const context = [
    `[ERROR:${classified.errorType}]`,
    `tool=${classified.toolName}`,
    classified.connectionId ? `conn=${classified.connectionId}` : null,
    classified.recoverable ? 'recoverable=true' : 'recoverable=false',
  ].filter(Boolean).join(' ');

  console.error(`${timestamp} ${context} ${classified.message}`);
  if (classified.suggestion) {
    console.error(`  Suggestion: ${classified.suggestion}`);
  }
}
```

**Location:** Lines 862-878 (new function)
**Acceptance Criteria:**
- [ ] Function logs with ISO timestamp
- [ ] Format includes: ERROR type, tool name, connection ID, recoverable flag
- [ ] Message on first line
- [ ] Suggestion on second line if present
- [ ] Follows existing console.error patterns in codebase
- [ ] No PII leaked (doesn't log full args)

**Deliverable 2.3: Update Global Error Handler**

Replace generic catch block with classified error handling:

**Before (lines 995-1005):**
```typescript
catch (error) {
  return {
    content: [{ type: 'text', text: `Error: ${error instanceof Error ? error.message : String(error)}` }],
    isError: true,
  };
}
```

**After (lines ~995-1015):**
```typescript
catch (error) {
  const toolName = request.params.name;
  const connectionId = (request.params.arguments as any)?.connection_id;
  const classified = classifyError(error, toolName, connectionId);

  logErrorEvent(classified);

  return {
    content: [{
      type: 'text',
      text: classified.message + (classified.suggestion ? `\n\nSuggestion: ${classified.suggestion}` : '')
    }],
    isError: true,
    // Note: Additional metadata fields added below in Phase 3
  };
}
```

**Location:** Lines 995-1015 (replace generic handler)
**Acceptance Criteria:**
- [ ] Error is classified before handling
- [ ] Classification called with tool name and connection ID
- [ ] Error event is logged
- [ ] Error message preserved in response
- [ ] Suggestion appended to message if available
- [ ] isError flag still set to true
- [ ] Response structure compatible with MCP protocol
- [ ] No breaking changes to response shape

---

### Phase 3: Enhance Response Structure (Optional Extension)

**File:** `src/index.ts`
**Location:** Same as Phase 2, lines 995-1015
**Effort:** 5 minutes
**Priority:** P1 (if MCP protocol allows)
**Conditional:** Only if MCP response schema allows additional fields

**Deliverable 3.1: Add Error Metadata to Response**

Extend response with error context:

```typescript
return {
  content: [{
    type: 'text',
    text: classified.message + (classified.suggestion ? `\n\nSuggestion: ${classified.suggestion}` : '')
  }],
  isError: true,
  _toolName: toolName,  // Underscore prefix indicates non-standard field
  _errorType: classified.errorType,
  _recoverable: classified.recoverable,
};
```

**Location:** In return statement (lines ~1010-1018)
**Acceptance Criteria:**
- [ ] Tool name included in response
- [ ] Error type included in response
- [ ] Recoverable flag included in response
- [ ] Fields use underscore prefix (non-standard)
- [ ] Existing fields unchanged (backward compatible)
- [ ] MCP protocol doesn't reject additional fields
- [ ] Fields help client-side error handling

---

### Phase 4: Documentation and Testing

**File:** `src/index.ts`, `src/errors.ts`, new `docs/ERROR-HANDLING.md`
**Effort:** 15 minutes
**Priority:** P1

**Deliverable 4.1: Inline Comments**

Add comments explaining error handling approach:

```typescript
// File: src/index.ts around lines 828-1015

/**
 * Error classification and routing in MCP tool handler.
 *
 * Error Flow:
 * 1. Tool calls browserManager.*OrThrow() or throws CustomError
 * 2. Tool's try-catch catches error and returns errorResponse()
 * 3. If uncaught (shouldn't happen), global handler catches it
 * 4. Global handler classifies error by type
 * 5. Error is logged for observability
 * 6. Classified error returned to MCP client
 *
 * Error Types:
 * - CONNECTION: Chrome connection issue (recoverable)
 * - DEBUGGER: Debugger state issue (recoverable)
 * - STATE: Execution/validation state issue (recoverable)
 * - EXECUTION: CDP or execution failure (may be non-recoverable)
 * - UNKNOWN: Unexpected error type
 */
```

**Location:** Before CallToolRequestSchema handler (lines 820-828)
**Acceptance Criteria:**
- [ ] Comments explain error classification approach
- [ ] Error types and flow documented
- [ ] Recovery guidance provided
- [ ] Comments accurate and helpful

**Deliverable 4.2: Error Classes Documentation**

Update src/errors.ts comments:

```typescript
/**
 * Custom error classes for Cherry Chrome MCP.
 *
 * Each error class includes:
 * - Descriptive message explaining what went wrong
 * - Actionable suggestions for user/caller
 * - Error metadata (type, recoverable flag) for classification
 *
 * Error Classification:
 * CONNECTION errors - User needs to connect to Chrome first
 * DEBUGGER errors - User needs to enable debugger first
 * STATE errors - Execution not in required state for operation
 * EXECUTION errors - Operation failed during execution
 *
 * All errors are potentially recoverable by user action.
 */
```

**Location:** At top of src/errors.ts (lines 1-10)
**Acceptance Criteria:**
- [ ] Error classification system explained
- [ ] Each error type described
- [ ] User actions to recover documented
- [ ] Comments clear and concise

**Deliverable 4.3: Test Verification**

Manual test of error classification:

```typescript
// Manual test script to verify error classification works:
// 1. Build: npm run build
// 2. Test smart mode: node build/src/index.js < /dev/null
// 3. Verify no errors in startup
// 4. Manually test:
//    - Call tool without connecting (should show CONNECTION error + suggestion)
//    - Call debugger tool without enabling (should show DEBUGGER error + suggestion)
//    - Verify console shows structured error logs
```

**Location:** Add to project notes (not in code)
**Acceptance Criteria:**
- [ ] Build succeeds
- [ ] Both modes start without errors
- [ ] Classification logic accessible for testing
- [ ] Error messages verified
- [ ] Suggestions verified
- [ ] Console logging output verified

---

## Dependencies

**Hard Dependencies:**
- ✅ src/errors.ts (already exists, contains 4 error classes)
- ✅ src/index.ts (main file to modify)
- ✅ src/tools/*.ts (all tools already handle errors)

**Soft Dependencies:**
- MCP SDK types (for response validation)
- Node console API (for logging)

**No Changes Required In:**
- src/browser.ts (already has good error handling)
- src/tools/*.ts (already have try-catch)
- src/response.ts (already has utilities)

---

## Acceptance Criteria by Phase

### Phase 1 Acceptance: Error Type Properties Added
- [ ] ErrorInfo interface defined
- [ ] All 4 error classes have errorInfo property
- [ ] errorInfo includes: errorType, recoverable, suggestion
- [ ] TypeScript compiles without errors
- [ ] Error messages unchanged (no content changes)
- [ ] `npm run build` succeeds

### Phase 2 Acceptance: Error Classification Implemented
- [ ] classifyError() function exists and works
- [ ] logErrorEvent() function exists and formats correctly
- [ ] Global error handler calls classifyError()
- [ ] Global error handler calls logErrorEvent()
- [ ] Classified errors include: errorType, message, recoverable, suggestion, toolName, connectionId
- [ ] Response structure backward compatible (content and isError unchanged)
- [ ] Console output includes error type, tool, and suggestion
- [ ] `npm run build` succeeds

### Phase 3 Acceptance: Response Enhanced (if MCP allows)
- [ ] Response includes _toolName field
- [ ] Response includes _errorType field
- [ ] Response includes _recoverable field
- [ ] All existing fields preserved
- [ ] MCP protocol accepts response structure
- [ ] `npm run build` succeeds

### Phase 4 Acceptance: Documentation Complete
- [ ] Comments added to error handler explaining approach
- [ ] Error classes documented
- [ ] Error types and recovery actions documented
- [ ] All documentation accurate and helpful

### Overall Acceptance: Integration Test
- [ ] `npm run build` succeeds (0 errors)
- [ ] Both modes start without TypeScript errors:
  - `node build/src/index.js`
  - `USE_LEGACY_TOOLS=true node build/src/index.js`
- [ ] Error messages are user-friendly
- [ ] Error suggestions are actionable
- [ ] Console logs structured and parseable
- [ ] No breaking changes to error handling
- [ ] No changes to tool behavior or functionality

---

## Risk Assessment: LOW

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|-----------|
| Breaking response schema | Low | High | Keep content/isError fields unchanged, only add new fields |
| Lost error information | Low | Medium | Test all error paths, verify classification covers all cases |
| Circular logic in error handler | Very Low | High | classifyError is simple, no dependencies on tools |
| Missing error type cases | Low | Medium | Test with: ChromeNotConnectedError, DebuggerNotEnabledError, ExecutionNotPausedError, ExecutionAlreadyPausedError, generic Error |
| Console logging overhead | Very Low | Low | Logging is minimal, only on error path |
| TypeScript compilation fails | Very Low | Low | Incremental changes, build after each phase |

---

## Technical Approach

### Single Responsibility Principle
- classifyError() - only extracts error info
- logErrorEvent() - only formats and logs
- Handler - only routes and responds
- Each function has one job

### Backward Compatibility
- Response structure unchanged (content array, isError field)
- Error messages preserved verbatim
- Tool behavior unaffected
- Can add new fields without breaking old clients

### Error Type System
- Small set of types: CONNECTION, DEBUGGER, STATE, EXECUTION, UNKNOWN
- Extensible (can add more types if needed)
- Each type has clear meaning and recovery action
- All provided in error classes

### Observable and Debuggable
- Console logs with timestamp
- Includes tool name, error type, connection ID
- Includes actionable suggestion
- Structured format for log parsing

---

## Success Metrics

✅ **Error Classification Works:**
- Different error types correctly identified
- Fallback handles unknown errors

✅ **User Experience Improved:**
- Error messages clearer (include suggestions)
- No breaking changes to existing flows
- Backward compatible with existing clients

✅ **Debugging Easier:**
- Console logs structured with tool context
- Error types aid in troubleshooting
- All information in one place

✅ **Code Quality:**
- No new bugs introduced
- Build passes
- All tests (if any) pass
- Documentation clear

---

## Effort Estimate

| Phase | Task | Effort | Cumulative |
|-------|------|--------|------------|
| 1 | Add error type properties | 15 min | 15 min |
| 2 | Implement classification and logging | 20 min | 35 min |
| 3 | Enhance response (optional) | 5 min | 40 min |
| 4 | Documentation and testing | 15 min | 55 min |
| **Total** | **All Phases** | **~55 min** | **55 min** |

---

## Implementation Order

1. Phase 1: Error type properties (foundation)
2. Phase 2: Classification and logging (main logic)
3. Phase 3: Response enhancement (optional)
4. Phase 4: Documentation (complete)

Each phase is independent after Phase 1, but recommended to do in order for clarity.

---

## Sign-Off

**Confidence Level:** HIGH ✅
**Ready for Implementation:** YES ✅
**All Acceptance Criteria Defined:** YES ✅
**Dependencies Resolved:** YES ✅
**Risk Assessed:** YES ✅

**This plan is ready to proceed to implementation.**

---

**Plan Generated:** 2026-01-19
**Plan Author:** Plan Skill
**Approval Status:** Pending User Approval
