# Evaluation: Centralize Error Handling Across Tool Routing

**Date:** 2026-01-19
**Scope:** Cherry Chrome MCP - Global error handling in tool routing layer
**Confidence Assessment:** MEDIUM → HIGH (with one design decision)

---

## Problem Statement

Currently, error handling in tool routing (`src/index.ts:831-1005`) is generic and undifferentiated:

```typescript
// src/index.ts:995-1005
catch (error) {
  return {
    content: [{ type: 'text', text: `Error: ${error instanceof Error ? error.message : String(error)}` }],
    isError: true,
  };
}
```

**Issues:**
1. **No error classification** - Can't distinguish: bad input, connection failure, timeout, crash
2. **No error routing** - All errors treated identically (no recovery, no metrics, no context)
3. **Lost context** - Tool name, connection ID, error stack not preserved in response
4. **No observability** - No logging, error aggregation, or error type metrics
5. **No retry logic** - Transient failures not distinguished from permanent failures

**Impact:**
- Poor user experience (vague error messages)
- Difficult debugging (missing context)
- No error metrics or telemetry
- Duplicated error handling logic in individual tools

---

## Current State Analysis

### Error Handling Layers

**Layer 1: Custom Error Classes (src/errors.ts:1-69)** ✅
- 4 well-designed custom error classes exist
- Each with actionable messages
- Properly extends Error with `.name` property
- Used in browser.ts and tools

**Layer 2: BrowserManager (src/browser.ts:142-640)** ⚠️ PARTIALLY COMPLETE
- getConnectionOrThrow, getPageOrThrow, getCDPSessionOrThrow implemented
- Good error differentiation in browser.ts
- BUT: Some methods still return error strings (connect, launch)
- Inconsistency: Some throw, some return

**Layer 3: Individual Tools (src/tools/*.ts)** ✅ COMPLETED
- All 23 legacy tools have try-catch
- All 18 smart tools have try-catch
- Each tool calls appropriate *OrThrow methods
- Consistent error response formatting via errorResponse()

**Layer 4: Global Routing Handler (src/index.ts:831-1005)** ❌ NEEDS WORK
- Generic catch-all with zero differentiation
- No error classification
- No tool context in error response
- No error type information returned

### Error Flow Currently

```
Tool calls browserManager.*OrThrow()
          ↓
          throws CustomError or generic Error
          ↓
          Tool's try-catch block
          ↓
          errorResponse(error.message)
          ↓
          Returns { content: [...], isError: true }
          ↓
          Global handler catch block (if uncaught)
          ↓
          Generic error response
          ↓
          User sees message without context
```

### What Works Well

✅ **Error types are well-designed:**
- ChromeNotConnectedError (good message)
- DebuggerNotEnabledError (good message)
- ExecutionNotPausedError (good message)
- ExecutionAlreadyPausedError (good message)

✅ **Individual tool error handling is consistent:**
- All tools have try-catch
- All use errorResponse() for formatting
- All call appropriate *OrThrow validation methods

✅ **Response formatting utilities exist:**
- successResponse() and errorResponse() in response.ts
- Consistent structure

### What Needs Work

❌ **Global error handler is too generic:**
- Treats all errors the same
- No classification or routing
- No contextual information added

❌ **Error information lost in routing:**
- Tool name not in response
- Connection ID not preserved
- Error type not classified
- Stack trace not available

❌ **No error observability:**
- No logging structure
- No error aggregation
- No metrics/telemetry
- No debugging trail

❌ **Missing error metadata:**
- Is error recoverable?
- Is it user error or system error?
- Recovery suggestions not generated
- Diagnostic context not included

---

## Key Questions to Resolve

### Question 1: Error Classification Approach

**The Challenge:** How should errors be classified in the global handler?

**Option A: Instance Checking (Standard)**
```typescript
if (error instanceof ChromeNotConnectedError) { ... }
else if (error instanceof DebuggerNotEnabledError) { ... }
else if (error instanceof ExecutionNotPausedError) { ... }
// Many more checks...
else { ... generic handling ... }
```

**Pros:**
- Type-safe (TypeScript checks)
- Common pattern
- Easy to understand

**Cons:**
- Verbose (need check for each error type)
- Requires importing all error classes in routing
- Brittle if new errors added

**Option B: Error Code/Type Property (Recommended)**
```typescript
interface ClassifiedError {
  type: 'CONNECTION' | 'DEBUGGER' | 'VALIDATION' | 'EXECUTION' | 'UNKNOWN';
  recoverable: boolean;
  suggestion?: string;
}

// In error class
class ChromeNotConnectedError extends Error {
  readonly errorType = 'CONNECTION' as const;
  readonly recoverable = true;
  // ...
}

// In handler
const errorType = (error as any).errorType || 'UNKNOWN';
```

**Pros:**
- Flexible (category not specific class)
- Extensible (add new errors without modifying handler)
- Supports error hierarchy (CONNECTION covers multiple error types)
- Clean handler logic

**Cons:**
- Less type-safe unless done carefully
- Requires error types to have the property

**Option C: Error Message Pattern Matching (Discouraged)**
```typescript
if (error.message.includes('Chrome')) { ... }
else if (error.message.includes('Debugger')) { ... }
```

**Pros:**
- Works with any error
- Doesn't require modification

**Cons:**
- Fragile (brittle string matching)
- Hard to maintain
- Doesn't scale

**RECOMMENDATION:** Option B (Error type property) - Flexible, extensible, type-safe if done carefully.

---

### Question 2: Response Enhancement

**The Challenge:** What additional information should be included in error responses?

**Current Response:**
```typescript
{
  content: [{ type: 'text', text: 'Error message' }],
  isError: true
}
```

**Option A: Simple Tool Context**
```typescript
{
  content: [{ type: 'text', text: 'Error message' }],
  isError: true,
  errorContext: {
    tool: 'query_elements',
    error_type: 'EXECUTION'
  }
}
```

**Option B: Rich Error Information**
```typescript
{
  content: [{ type: 'text', text: 'Error message' }],
  isError: true,
  error_info: {
    type: 'CONNECTION' | 'DEBUGGER' | ...,
    tool: 'query_elements',
    connection_id?: 'default',
    recoverable: boolean,
    suggestion?: 'Run enable_debug_tools() first',
    timestamp: number
  }
}
```

**Consideration:** MCP protocol may restrict response shape. Need to verify if additional fields are allowed.

**RECOMMENDATION:** Start with simple context (Option A), can expand if protocol allows.

---

### Question 3: Logging and Observability

**The Challenge:** Should error logging be included?

**Option A: No Logging (Current State)**
- Errors only visible to user
- No debugging trail
- No metrics

**Option B: Console Logging**
```typescript
console.error(`[TOOL_ERROR] ${toolName}: ${error.message}`);
```

**Pros:**
- Simple to implement
- Works in all environments
- Can pipe to log aggregation

**Cons:**
- No structured logging
- Hard to parse
- No filtering capability

**Option C: Structured Error Logging**
```typescript
const errorLog = {
  timestamp: Date.now(),
  toolName,
  errorType: 'CONNECTION',
  errorMessage: error.message,
  connectionId: args.connection_id,
  userRequest: request.params,  // sanitized
  stack: error.stack
};
logger.error(errorLog);
```

**Pros:**
- Machine parseable
- Can filter by error type
- Complete debugging context

**Cons:**
- More complex
- Requires logger setup
- Privacy concern (logging user input)

**RECOMMENDATION:** Option B (console logging) for MVP, can upgrade to structured logging in future.

---

### Question 4: Error Recovery Strategies

**The Challenge:** Should the routing layer attempt error recovery?

**Option A: No Recovery**
- Tools are responsible for retries
- Router just classifies and forwards
- Simple, no side effects

**Option B: Automatic Retry for Transient Errors**
```typescript
async function executeToolWithRetry(toolName, handler, args, maxRetries = 2) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await handler(args);
    } catch (error) {
      if (!isTransientError(error) || i === maxRetries - 1) throw error;
      await delay(100 * (i + 1));  // exponential backoff
    }
  }
}
```

**Pros:**
- Handles transient failures transparently
- Better UX (fewer errors to user)
- Resilient to network blips

**Cons:**
- Adds latency
- Harder to debug
- May retry operations that shouldn't be retried

**RECOMMENDATION:** Option A (no recovery) for MVP. If retry needed, better handled at tool level where intent is clear.

---

## Unknowns That Need Clarification

### Unknown 1: MCP Protocol Constraints
**Question:** What fields are allowed in MCP error responses?

**Research approach:** Check MCP SDK types in node_modules/@modelcontextprotocol/sdk

**Impact:** Determines how much error context we can return to user

### Unknown 2: Error Logging Permission
**Question:** Is console.error acceptable for logging, or should we implement structured logging?

**Research approach:** Check project's logging conventions (look for logger setup in src/)

**Impact:** Determines observability infrastructure

---

## Scope Boundaries

### In Scope
✅ Classify errors by type in global handler
✅ Add error type/context to response
✅ Add console logging for error events
✅ Document error types and meanings
✅ Add error context preservation (tool name, connection ID)

### Out of Scope (Future Work)
❌ Automatic retry logic
❌ Structured logging system
❌ Error aggregation/metrics dashboard
❌ Distributed tracing
❌ Error recovery strategies
❌ Custom error UI rendering

---

## Dependencies

**Hard Dependencies:**
- src/errors.ts (already exists with 4 error types)
- src/index.ts (routing layer to modify)
- src/tools/*.ts (all tools already handle errors correctly)

**Soft Dependencies:**
- MCP protocol types (for response validation)
- Logging conventions (for consistency)

---

## Risks and Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|-----------|
| Breaking change to error responses | Low | High | Test in both modes (legacy/smart), verify MCP compatibility |
| Response schema changes break clients | Low | High | Keep `content` and `isError` fields unchanged, only add new fields |
| Missing error types cause fallback to generic handler | Low | Medium | Comprehensive type checking, tests for uncaught error paths |
| Over-classifying errors reduces context | Low | Medium | Keep error messages descriptive, don't replace with type |
| Logging PII accidentally | Medium | High | Sanitize logged parameters, don't log full args object |

---

## Technical Approach Summary

### Phase 1: Error Classification (HIGH Confidence)
- Add error type property to existing error classes
- Implement classification logic in global handler
- Preserve error messages and context

### Phase 2: Response Enhancement (HIGH Confidence)
- Add error context fields (tool name, error type, connection ID)
- Maintain backward compatibility (keep existing fields)
- Document new fields

### Phase 3: Error Logging (HIGH Confidence)
- Add console.error logging for error events
- Include tool name, error type, timestamp
- Follow project logging conventions

### Phase 4: Documentation (HIGH Confidence)
- Document error types and their meanings
- Add comments explaining classification logic
- Create error handling guide for contributors

---

## Verdict

**Status:** ✅ **CONTINUE WITH CLARIFICATIONS**

**Confidence:** MEDIUM → HIGH (after resolving design questions)

**Rationale:**
1. The infrastructure is mostly in place (error classes exist, tools handle errors)
2. Only the global routing handler needs enhancement
3. Approach is straightforward: classify existing errors, add context to response
4. One design decision needed: Error type property approach vs. instance checking
5. Logging approach needs clarification but defaults are reasonable

**Blockers:** None - can proceed with recommended approach

**Next Steps:**
1. User approves error classification approach (Option B recommended)
2. User confirms logging approach (Option B recommended)
3. Implement in phases: classification → response → logging → documentation
4. Each phase has clear acceptance criteria

---

## Recommended Questions for User

**Q1:** For error classification, do you prefer:
- **Option A:** Instance checking (`if (error instanceof ChromeNotConnectedError)`)
- **Option B:** Error type property (`error.errorType === 'CONNECTION'`) ← Recommended
- **Option C:** Message pattern matching (not recommended)

**Q2:** Should we add structured error information to MCP responses (e.g., error_type, recoverable flag)?
- **Option A:** No, keep responses minimal
- **Option B:** Yes, add error metadata fields ← Recommended

**Q3:** For error logging, should we:
- **Option A:** Add console.error logging with error type ← Recommended
- **Option B:** No logging (keep current state)
- **Option C:** Implement structured logging system (more complex)

---

**Evaluation Date:** 2026-01-19 03:45 UTC
**Evaluator:** Explore Agent
**Confidence:** MEDIUM
**Ready to Plan:** YES (pending user clarifications on 3 design questions)
