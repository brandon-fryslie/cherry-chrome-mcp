# Centralize Error Handling in Tool Routing - Sprint Planning

**Status:** ✅ Planning Complete - Ready for Implementation
**Confidence:** HIGH
**Generated:** 2026-01-19

---

## Quick Overview

This sprint centralizes error handling in the MCP tool routing layer by:

1. **Classifying errors** by type (CONNECTION, DEBUGGER, STATE, EXECUTION, UNKNOWN)
2. **Adding error context** to responses (tool name, error type, recoverable flag)
3. **Implementing structured logging** for observability
4. **Providing recovery suggestions** to users

**Impact:** Better error messages, easier debugging, improved user experience.

---

## Planning Documents

Read in this order:

### 1. 📋 EVALUATION-20260119.md (Current State Analysis)
**10 minutes to read**
- What's already working (error classes, tool error handling)
- What needs work (global routing handler)
- 3 design decisions for user to approve
- Risk assessment and architectural compliance

**Key Finding:** Infrastructure is mostly in place. Only global handler needs enhancement.

### 2. 📋 SPRINT-20260119-routing-errors-PLAN.md (Implementation Plan)
**20 minutes to read**
- 4 implementation phases with clear deliverables
- Phase 1: Add error type properties to error classes
- Phase 2: Implement classification and logging in global handler
- Phase 3: Enhance response structure (optional)
- Phase 4: Documentation

**Each Phase:** Specific file, location, acceptance criteria, code examples.

### 3. 📋 SPRINT-20260119-routing-errors-DOD.md (Definition of Done)
**15 minutes to read**
- 40+ specific acceptance criteria
- Phase-by-phase checkpoints
- Manual testing scenarios
- Sign-off criteria

**Use this:** As checklist during implementation.

### 4. 📋 SPRINT-20260119-routing-errors-CONTEXT.md (Implementation Guide)
**30 minutes to read**
- Background on problem and solution
- Technical architecture and error flow
- Code examples for each phase
- Common patterns and anti-patterns
- Testing scenarios
- Common mistakes to avoid

**Reference:** While implementing, when specific guidance needed.

---

## User Decisions Made

User chose all recommended approaches:

✅ **Error Classification:** Error type property approach
- Flexible and extensible
- Supports adding new error types without handler changes

✅ **Response Enhancement:** Add error metadata to responses
- Helps client-side error handling
- Tool name, error type, recoverable flag

✅ **Error Logging:** Console logging with structured format
- Simple and follows common practice
- Includes timestamp, error type, tool name, connection ID, suggestion

---

## Sprint Summary

### What Gets Built

| Component | Scope | Effort |
|-----------|-------|--------|
| Error type properties | 4 error classes get errorInfo property | 15 min |
| Classification logic | classifyError() function | 10 min |
| Logging function | logErrorEvent() structured logging | 10 min |
| Global handler | Updated with classification and logging | 15 min |
| Response enhancement | Add metadata fields if MCP allows | 5 min |
| Documentation | Comments and guides | 15 min |
| **Total** | **All phases** | **~70 min** |

### What Stays the Same

- ✓ All individual tool error handling (already working)
- ✓ BrowserManager error methods (already working)
- ✓ Error message content (preserved)
- ✓ Response structure (backward compatible)
- ✓ Tool behavior and functionality

### Success Criteria

✅ Build passes (0 errors)
✅ Both modes start without errors
✅ Error messages enhanced with suggestions
✅ Console logs structured and parseable
✅ Error type and tool name in logs
✅ Backward compatible
✅ No breaking changes

---

## Quick Start

### To Review This Plan

```bash
# 1. Read EVALUATION for context and user decisions
cat EVALUATION-20260119.md

# 2. Read PLAN for implementation phases
cat SPRINT-20260119-routing-errors-PLAN.md

# 3. Read CONTEXT for code examples and patterns
cat SPRINT-20260119-routing-errors-CONTEXT.md

# 4. Use DOD as checklist during implementation
cat SPRINT-20260119-routing-errors-DOD.md
```

### To Implement

```bash
# 1. Start Phase 1: Add error type properties
#    Edit: src/errors.ts
#    Add: ErrorInfo interface
#    Add: errorInfo property to each error class

# 2. Test Phase 1
npm run build  # Should pass with 0 errors

# 3. Continue with Phase 2, 3, 4
#    Follow detailed guidance in SPRINT-20260119-routing-errors-CONTEXT.md

# 4. Verify Complete
npm run build  # Final build
npm start      # Test both modes
```

### To Verify Success

```bash
# Build should pass
npm run build
echo $?  # Should be 0

# Both modes should start
node build/src/index.js
# Output: "Cherry Chrome MCP Server running on stdio [MODE: SMART TOOLS]"
# Press Ctrl-C

USE_LEGACY_TOOLS=true node build/src/index.js
# Output: "Cherry Chrome MCP Server running on stdio [MODE: LEGACY TOOLS]"
# Press Ctrl-C

# Manual test: Call tool without connecting
# Should see:
# - Error message with suggestion
# - Console output with [ERROR:CONNECTION] marker
# - Connection error type identified
```

---

## Key Decisions

### 1. Error Classification Approach
**Chosen:** Error type property on error objects
**Why:** Flexible, extensible, no need to import all error classes in handler

### 2. Response Enhancement
**Chosen:** Add error metadata fields (_toolName, _errorType, _recoverable)
**Why:** Helps client-side error handling without breaking backward compatibility

### 3. Logging Strategy
**Chosen:** Console logging with structured format
**Why:** Simple, follows Node.js conventions, parseable for analysis

---

## Implementation Notes

### Important: Preserve Error Messages
Don't change error message content. Messages are already good:
```typescript
// ✓ Correct - message unchanged
super("Chrome not connected. To connect...");
```

### Important: No Tool Changes
Tools already handle errors correctly. No changes needed in src/tools/*.

### Important: Backward Compatibility
Keep `content` and `isError` fields in response. Can add new fields with prefix.

---

## Risk Assessment: LOW

**Why low risk:**
- Only 2 files modified: src/errors.ts, src/index.ts
- Changes are additive (new properties, new functions)
- Existing error handling preserved
- No tool behavior changes
- Easy to roll back if needed

---

## Timeline

**Planning:** Complete ✅
**Implementation:** ~70 minutes estimated
**Testing:** ~15 minutes estimated
**Total:** ~85 minutes

---

## Files Structure

```
.agent_planning/centralize-tool-routing-errors/
├── README.md                                    (this file)
├── EVALUATION-20260119.md                      (current state, analysis, decisions)
├── SPRINT-20260119-routing-errors-PLAN.md      (implementation phases)
├── SPRINT-20260119-routing-errors-DOD.md       (acceptance criteria)
├── SPRINT-20260119-routing-errors-CONTEXT.md   (code examples, patterns)
└── USER-RESPONSE-20260119.md                   (user decisions recorded)
```

---

## Questions?

See SPRINT-20260119-routing-errors-CONTEXT.md for:
- Common patterns and anti-patterns
- Code examples for each phase
- Testing scenarios
- Common mistakes to avoid

---

## Approval Status

**Ready for implementation:** YES ✅

**Prerequisites met:**
- ✅ Problem identified and analyzed
- ✅ Solution designed with 3 options presented
- ✅ User decisions recorded
- ✅ Technical path clear (no unknowns)
- ✅ Acceptance criteria defined
- ✅ Risk assessment completed

**Next Action:** User approves this plan → Begin implementation

---

**Plan Generated:** 2026-01-19
**Confidence:** HIGH
**Status:** READY FOR IMPLEMENTATION

Start with EVALUATION-20260119.md →
