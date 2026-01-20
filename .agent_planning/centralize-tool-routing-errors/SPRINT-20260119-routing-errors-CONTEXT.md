# Implementation Context: Centralize Error Handling in Tool Routing

**Date:** 2026-01-19
**Scope:** Adding error classification and observability to MCP tool routing handler
**Confidence:** HIGH

---

## Background

### What Problem Are We Solving?

The MCP tool routing handler (`src/index.ts` CallToolRequestSchema) currently treats all errors identically:

```typescript
catch (error) {
  return {
    content: [{ type: 'text', text: `Error: ${error instanceof Error ? error.message : String(error)}` }],
    isError: true,
  };
}
```

**Issues:**
1. No way to distinguish error types (connection vs. debugger vs. execution)
2. No error context (what tool failed? which connection?)
3. No observability (no logs, no metrics, no debugging trail)
4. No recovery guidance (user doesn't know what to do)
5. Generic catch-all can hide bugs

### Why Matters

**User Experience:**
- User gets vague error message
- User doesn't know if they did something wrong or system failed
- User can't retry intelligently

**Operations:**
- Can't troubleshoot without full context
- Can't identify patterns in failures
- Can't distinguish transient vs. permanent failures

**Development:**
- Hard to debug when error surfaces
- No metrics on error frequency
- Easy to miss error paths during testing

---

## Technical Architecture

### Current Error Flow

```
Individual Tool (e.g., queryElements)
  │
  ├─ Calls: getPageOrThrow()
  │         (may throw ChromeNotConnectedError)
  │
  ├─ try-catch block
  │ └─ catch: errorResponse(error.message)
  │          (formatted via response.ts)
  │
  ├─ Returns: { content: [...], isError: true }
  │
  └─ If error not caught in tool
       └─ Bubbles to: Global handler in index.ts:995-1005
          └─ Generic catch block (shouldn't reach here)
          └─ Returns: { content: [...], isError: true }
          └─ User sees generic error message
```

### New Error Flow (After Implementation)

```
Individual Tool (e.g., queryElements)
  │
  ├─ Calls: getPageOrThrow()
  │         (throws ChromeNotConnectionError with errorInfo property)
  │
  ├─ try-catch block
  │ └─ catch: errorResponse(error.message)
  │          (tool handles and returns immediately)
  │
  ├─ Returns: { content: [...], isError: true }
  │
  └─ If error not caught in tool
       └─ Bubbles to: Global handler in index.ts:995-1005
          ├─ Extracts: toolName, connectionId from request
          ├─ Calls: classifyError(error, toolName, connectionId)
          │         (returns ClassifiedError with type, recoverable, suggestion)
          ├─ Calls: logErrorEvent(classified)
          │         (logs to console with structured format)
          └─ Returns: Enhanced response with:
             ├─ Original message
             ├─ Suggestion (if available)
             ├─ _errorType field (if MCP allows)
             ├─ _toolName field (if MPC allows)
             └─ _recoverable field (if MCP allows)
```

### Error Classification System

**Error Types Defined:**

| Type | Meaning | Recoverable | Recovery Action |
|------|---------|-------------|-----------------|
| CONNECTION | Chrome not connected | Yes | Call chrome() to connect |
| DEBUGGER | Debugger not enabled | Yes | Call enable_debug_tools() |
| STATE | Execution not in required state | Yes | Set breakpoint, pause, or resume as needed |
| EXECUTION | Operation failed during execution | May vary | Depends on specific error |
| UNKNOWN | Unexpected error type | Unknown | Log and report for debugging |

**Implementation in Error Classes:**

```typescript
// src/errors.ts

class ChromeNotConnectedError extends Error {
  readonly errorInfo: ErrorInfo = {
    errorType: 'CONNECTION' as const,
    recoverable: true,
    suggestion: 'Call chrome() or chrome_connect() to establish a connection'
  };
}

class DebuggerNotEnabledError extends Error {
  readonly errorInfo: ErrorInfo = {
    errorType: 'DEBUGGER' as const,
    recoverable: true,
    suggestion: 'Call enable_debug_tools() or debugger_enable() first'
  };
}

// etc. for other error types
```

---

## Implementation Code Examples

### Phase 1: Error Type Properties

**File:** `src/errors.ts`

**Add to top of file (after imports, before first class):**

```typescript
/**
 * Error metadata for classification and recovery guidance.
 */
interface ErrorInfo {
  readonly errorType: 'CONNECTION' | 'DEBUGGER' | 'STATE' | 'EXECUTION' | 'UNKNOWN';
  readonly recoverable: boolean;
  readonly suggestion?: string;
}
```

**Update each error class:**

```typescript
// Before
export class ChromeNotConnectedError extends Error {
  constructor(connectionId?: string) {
    super(
      `Chrome not connected${connectionId ? ` (${connectionId})` : ''}. To connect to Chrome:\n` +
      '- Call chrome({ action: "launch" }) to start a new Chrome instance\n' +
      '- Or chrome({ action: "connect", host: "localhost", port: 9222 })'
    );
    this.name = 'ChromeNotConnectedError';
  }
}

// After
export class ChromeNotConnectedError extends Error {
  readonly errorInfo: ErrorInfo = {
    errorType: 'CONNECTION',
    recoverable: true,
    suggestion: 'Call chrome() or chrome_connect() to establish a connection'
  };

  constructor(connectionId?: string) {
    super(
      `Chrome not connected${connectionId ? ` (${connectionId})` : ''}. To connect to Chrome:\n` +
      '- Call chrome({ action: "launch" }) to start a new Chrome instance\n' +
      '- Or chrome({ action: "connect", host: "localhost", port: 9222 })'
    );
    this.name = 'ChromeNotConnectedError';
  }
}
```

**Apply same pattern to other 3 error classes:**
- DebuggerNotEnabledError
- ExecutionNotPausedError
- ExecutionAlreadyPausedError

---

### Phase 2: Error Classification & Logging

**File:** `src/index.ts`

**Add before CallToolRequestSchema handler (around line 830):**

```typescript
/**
 * Classified error information for routing and observability.
 */
interface ClassifiedError {
  errorType: 'CONNECTION' | 'DEBUGGER' | 'STATE' | 'EXECUTION' | 'UNKNOWN';
  message: string;
  recoverable: boolean;
  suggestion?: string;
  toolName?: string;
  connectionId?: string;
}

/**
 * Classify an error by type and extract metadata.
 *
 * Looks for errorInfo property on error object (added to custom error classes).
 * Falls back to UNKNOWN for unexpected error types.
 *
 * Returns structured ClassifiedError with type, message, recovery info, and context.
 */
function classifyError(
  error: unknown,
  toolName: string,
  connectionId?: string
): ClassifiedError {
  // Check if error has errorInfo property (our custom errors)
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

  // Fallback for unknown errors (shouldn't happen, but handle gracefully)
  return {
    errorType: 'UNKNOWN',
    message: error instanceof Error ? error.message : String(error),
    recoverable: false,
    toolName,
    connectionId,
  };
}

/**
 * Log a classified error with structured context.
 *
 * Output format:
 * [ISO_TIMESTAMP] [ERROR:TYPE] tool=<name> [conn=<id>] [recoverable=true/false] <message>
 *   Suggestion: <suggestion>
 *
 * Example:
 * 2026-01-19T03:45:00.123Z [ERROR:CONNECTION] tool=query_elements recoverable=true Chrome not connected
 *   Suggestion: Call chrome() to connect
 */
function logErrorEvent(classified: ClassifiedError): void {
  const timestamp = new Date().toISOString();
  const parts = [
    `[ERROR:${classified.errorType}]`,
    `tool=${classified.toolName}`,
    classified.connectionId ? `conn=${classified.connectionId}` : null,
    `recoverable=${classified.recoverable}`,
  ].filter(Boolean);

  console.error(`${timestamp} ${parts.join(' ')} ${classified.message}`);

  if (classified.suggestion) {
    console.error(`  Suggestion: ${classified.suggestion}`);
  }
}
```

**Update CallToolRequestSchema handler catch block (lines ~995-1005):**

```typescript
// Before
catch (error) {
  return {
    content: [{ type: 'text', text: `Error: ${error instanceof Error ? error.message : String(error)}` }],
    isError: true,
  };
}

// After
catch (error) {
  const toolName = request.params.name;
  const connectionId = (request.params.arguments as any)?.connection_id;
  const classified = classifyError(error, toolName, connectionId);

  logErrorEvent(classified);

  // Construct error message with suggestion
  const errorMessage = classified.suggestion
    ? `${classified.message}\n\nSuggestion: ${classified.suggestion}`
    : classified.message;

  return {
    content: [{ type: 'text', text: errorMessage }],
    isError: true,
    // Optional: Add metadata if MCP protocol allows
    // _toolName: toolName,
    // _errorType: classified.errorType,
    // _recoverable: classified.recoverable,
  };
}
```

---

### Phase 3: Response Enhancement (Optional)

**File:** `src/index.ts`

**If MCP protocol allows additional fields, add to error response:**

```typescript
// In catch block, add metadata fields
return {
  content: [{ type: 'text', text: errorMessage }],
  isError: true,
  // Metadata for client-side error handling
  _toolName: toolName,
  _errorType: classified.errorType,
  _recoverable: classified.recoverable,
};
```

**Note:** Leading underscore indicates non-standard MCP fields. Verify protocol allows before adding.

---

### Phase 4: Documentation

**Add comment block before CallToolRequestSchema (lines ~820-828):**

```typescript
/**
 * Global error classification and handling in MCP tool routing.
 *
 * Error Flow:
 * 1. Tool executes within try-catch block
 * 2. Tool calls browserManager.*OrThrow() or throws CustomError
 * 3. Tool catches and returns error via errorResponse()
 * 4. If uncaught (shouldn't happen), global handler catches
 * 5. Global handler classifies error by type
 * 6. Error is logged to console with structured context
 * 7. Classified error returned to MCP client
 *
 * Error Types and Recovery:
 * - CONNECTION: Chrome not connected → call chrome() to connect
 * - DEBUGGER: Debugger not enabled → call enable_debug_tools()
 * - STATE: Execution not in required state → pause/resume/breakpoint
 * - EXECUTION: Operation failed during execution → check parameters
 * - UNKNOWN: Unexpected error type → report for debugging
 *
 * All error messages are preserved. Suggestions added based on error type.
 * Console logs include tool name, error type, and recovery suggestion.
 */
```

**Add file header comment to src/errors.ts (lines 1-15):**

```typescript
/**
 * Custom error classes for Cherry Chrome MCP.
 *
 * Error Classification System:
 * Each custom error class includes errorInfo metadata for classification:
 * - errorType: One of CONNECTION, DEBUGGER, STATE, EXECUTION
 * - recoverable: Whether user action can resolve the error
 * - suggestion: Specific tool/action to resolve the error
 *
 * Error Types:
 * CONNECTION: User needs to connect to Chrome (chrome() tool)
 * DEBUGGER: User needs to enable debugger (enable_debug_tools())
 * STATE: Execution not in required state (pause/resume/breakpoint)
 * EXECUTION: Operation failed during execution (check parameters)
 *
 * All errors are designed to be user-recoverable with correct action.
 *
 * @see src/index.ts for error classification and routing logic
 */
```

---

## Common Patterns & Anti-Patterns

### Pattern 1: Extracting Tool Context

✅ **Correct:**
```typescript
const toolName = request.params.name;  // Required - always present
const connectionId = (request.params.arguments as any)?.connection_id;  // Optional
```

❌ **Avoid:**
```typescript
const toolName = JSON.parse(request.params.name);  // name is string, not JSON
const { connectionId } = request.params.arguments;  // Could be undefined, need optional chaining
```

### Pattern 2: Checking Error Info

✅ **Correct:**
```typescript
if (error && typeof error === 'object' && 'errorInfo' in error) {
  const info = (error as any).errorInfo as ErrorInfo;
  // Use info
}
```

❌ **Avoid:**
```typescript
if (error instanceof CustomError) {  // Don't import all error classes
  // More verbose
}
if (error.errorInfo?.errorType) {  // Missing type narrowing
  // Could fail at runtime
}
```

### Pattern 3: Logging Format

✅ **Correct:**
```typescript
const timestamp = new Date().toISOString();
const parts = [
  `[ERROR:${classified.errorType}]`,
  `tool=${classified.toolName}`,
  classified.connectionId ? `conn=${classified.connectionId}` : null,
  `recoverable=${classified.recoverable}`,
].filter(Boolean);  // Remove null entries

console.error(`${timestamp} ${parts.join(' ')} ${classified.message}`);
```

❌ **Avoid:**
```typescript
console.error(`Error in ${toolName}: ${message}`);  // No timestamp, type, or context
console.error(JSON.stringify({...}));  // Hard to read in console
```

### Pattern 4: Message Assembly

✅ **Correct:**
```typescript
const errorMessage = classified.suggestion
  ? `${classified.message}\n\nSuggestion: ${classified.suggestion}`
  : classified.message;
```

❌ **Avoid:**
```typescript
const errorMessage = `${classified.message}\nSuggestion: ${classified.suggestion}`;  // Suggestion always present, confusing
const errorMessage = `${classified.message} (${classified.suggestion})`;  // Hard to read
```

---

## Testing Scenarios

### Test 1: Chrome Not Connected

**Setup:**
```typescript
// Don't connect to any Chrome
```

**Trigger Error:**
```
Call: query_elements({ selector: "button" })
```

**Expected Flow:**
1. queryElements() calls getPageOrThrow()
2. getPageOrThrow() calls getConnectionOrThrow()
3. getConnectionOrThrow() throws ChromeNotConnectedError
4. Tool catches and returns errorResponse()
5. (If somehow not caught) Global handler catches
6. classifyError() → { errorType: 'CONNECTION', recoverable: true, suggestion: 'Call chrome()...' }
7. logErrorEvent() outputs:
   ```
   2026-01-19T03:45:00.123Z [ERROR:CONNECTION] tool=query_elements recoverable=true Chrome not connected
     Suggestion: Call chrome() to connect
   ```
8. Response includes error message + suggestion

**Verify:**
- [ ] Tool name in console output
- [ ] ERROR:CONNECTION marker present
- [ ] recoverable=true shown
- [ ] Suggestion mentions chrome() tool
- [ ] Response includes suggestion

### Test 2: Debugger Not Enabled

**Setup:**
```typescript
await chrome({ action: 'launch' });
```

**Trigger Error:**
```
Call: debugger_get_call_stack()  // Without enabling debugger first
```

**Expected Flow:**
1. debuggerGetCallStack() calls requirePaused()
2. requirePaused() calls getCDPSessionOrThrow()
3. getCDPSessionOrThrow() throws DebuggerNotEnabledError
4. Tool catches and returns errorResponse()
5. (If somehow not caught) Global handler catches
6. classifyError() → { errorType: 'DEBUGGER', recoverable: true, suggestion: 'Call enable_debug_tools()...' }
7. logErrorEvent() outputs:
   ```
   2026-01-19T03:45:00.456Z [ERROR:DEBUGGER] tool=debugger_get_call_stack conn=default recoverable=true Debugger not enabled
     Suggestion: Call enable_debug_tools() first
   ```

**Verify:**
- [ ] ERROR:DEBUGGER marker present
- [ ] Tool name = debugger_get_call_stack
- [ ] Connection ID shown
- [ ] Suggestion mentions enable_debug_tools()

### Test 3: Unknown Error Type

**Setup:**
```typescript
// Somehow throw error without errorInfo property (shouldn't happen)
```

**Trigger Error:**
```
Manually throw new Error("Something unexpected");
```

**Expected Flow:**
1. Error thrown without errorInfo property
2. Caught by global handler
3. classifyError() → { errorType: 'UNKNOWN', recoverable: false, suggestion: undefined }
4. logErrorEvent() outputs:
   ```
   2026-01-19T03:45:00.789Z [ERROR:UNKNOWN] tool=<name> recoverable=false Something unexpected
   ```

**Verify:**
- [ ] ERROR:UNKNOWN marker present
- [ ] recoverable=false (safe default)
- [ ] No suggestion (unknown how to recover)
- [ ] Message preserved

---

## Verification Checklist

After implementation, verify:

- [ ] All 4 error classes have errorInfo property
- [ ] errorInfo properties are readonly
- [ ] classifyError() function exists and works
- [ ] logErrorEvent() function exists and works
- [ ] Global handler calls both functions
- [ ] Error messages preserved (no changes)
- [ ] Suggestions are actionable
- [ ] Console output has structured format
- [ ] Tool names appear in logs
- [ ] Connection IDs appear in logs (when present)
- [ ] Response format backward compatible
- [ ] Both modes start without errors
- [ ] Build succeeds with 0 errors

---

## Common Mistakes to Avoid

### Mistake 1: Modifying Error Messages

❌ **Wrong:**
```typescript
// Don't change existing error message
super(newMessage);  // Changes what user sees
```

✅ **Right:**
```typescript
// Keep message as-is, add suggestion to suggestion field
super(originalMessage);
readonly errorInfo = { suggestion: "..." };
```

### Mistake 2: Forgetting Type Guard

❌ **Wrong:**
```typescript
const info = error.errorInfo;  // TypeScript error: error is unknown
```

✅ **Right:**
```typescript
if (error && typeof error === 'object' && 'errorInfo' in error) {
  const info = (error as any).errorInfo;  // Proper guard
}
```

### Mistake 3: Logging PII

❌ **Wrong:**
```typescript
console.error(`Error calling ${toolName} with ${JSON.stringify(args)}`);  // Logs user input!
```

✅ **Right:**
```typescript
console.error(`Error calling ${toolName}`);  // Tool name only, no user input
```

### Mistake 4: Breaking Response Compatibility

❌ **Wrong:**
```typescript
return {
  // Removed: content, isError
  error: classified.errorType,  // Old clients won't understand
};
```

✅ **Right:**
```typescript
return {
  content: [{ type: 'text', text: message }],  // Keep existing fields
  isError: true,
  _errorType: classified.errorType,  // Add new fields with prefix
};
```

### Mistake 5: Missing Error Type

❌ **Wrong:**
```typescript
const classified = classifyError(error, toolName);
// If classifyError doesn't handle some error types, they'll be UNKNOWN
```

✅ **Right:**
```typescript
// Verify all 4 custom error types are handled
// Test with ChromeNotConnectedError, DebuggerNotEnabledError, etc.
```

---

## Implementation Tips

1. **Start with Phase 1:** Add errorInfo properties first, test build
2. **Then Phase 2:** Add classification and logging, test console output
3. **Then Phase 3:** Add response metadata if MCP allows
4. **Then Phase 4:** Add documentation
5. **Test each phase:** Don't skip testing between phases
6. **Use both modes:** Test in smart and legacy mode
7. **Check console:** Verify log format and content
8. **Preserve behavior:** Don't change error messages or tool behavior

---

## File Change Summary

**Files to Modify:**
1. `src/errors.ts` - Add errorInfo property to 4 error classes
2. `src/index.ts` - Add classification, logging, update handler

**Files NOT to Modify:**
- ✗ src/tools/*.ts (error handling already correct)
- ✗ src/browser.ts (already has good error handling)
- ✗ src/response.ts (utilities already sufficient)

**Total Lines Added:** ~100 lines (ErrorInfo interface, classify/log functions, handler update, comments)

---

## Success Indicators

**You know it's working when:**

1. ✅ Build passes: `npm run build` → 0 errors
2. ✅ Both modes start without TypeScript errors
3. ✅ Error messages appear in console with structured format
4. ✅ Tool names visible in error logs
5. ✅ Error types (CONNECTION, DEBUGGER, etc.) appear in logs
6. ✅ Suggestions appear after error messages
7. ✅ Existing tool behavior unchanged
8. ✅ Backward compatible error responses

---

**Context Document Generated:** 2026-01-19
**Implementation Ready:** YES
**Estimated Implementation Time:** 55 minutes
**Confidence Level:** HIGH
