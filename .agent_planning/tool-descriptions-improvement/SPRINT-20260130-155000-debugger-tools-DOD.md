# Definition of Done: Debugger Tools Phase 1

**Sprint:** Debugger Tools - Phase 1 Documentation Improvement
**Generated:** 2026-01-30T15:50:00Z

---

## Overview

All acceptance criteria must be met for this sprint to be considered complete. This is the verification contract - implementation quality is judged against these criteria.

---

## Acceptance Criteria

### 1. Debugger State Machine Documentation (ALL 18 TOOLS)

**Criterion:** Every debugger tool description includes consistent state machine documentation.

**Verification:**
```bash
# Check that all 18 debugger tools mention the state machine
grep -c "State: DISCONNECTED" src/index.ts  # Should return 18
grep -c "DEBUGGER_ENABLED" src/index.ts    # Should return 18
```

**What "done" looks like:**
- [ ] State machine diagram appears in every debugger tool description
- [ ] Diagram shows 4 states: DISCONNECTED → CONNECTED → DEBUGGER_ENABLED → (PAUSED ⟷ RUNNING)
- [ ] Each transition shows which tool triggers it
- [ ] Diagram is identical across all 18 tools (copy-pasted)
- [ ] Format is clear and easy to parse (markdown or ASCII art)

**Quality Check:**
- Diagram is present in `debugger_enable` description ✓
- Diagram is present in `enable_debug_tools` description ✓
- Diagram is present in `debugger_step_over` description ✓
- Diagram is present in `step` description ✓

---

### 2. Prerequisites Documentation (ALL 18 TOOLS)

**Criterion:** Every debugger tool has clear prerequisites section explaining required state/prior calls.

**Verification Methods:**

**Method 1 - Quick grep:**
```bash
# Every debugger tool should mention prerequisites
grep -A 5 "debugger_enable\|enable_debug_tools\|debugger_set_breakpoint\|breakpoint" src/index.ts | grep -i "prerequisite\|require" | wc -l
# Should be significant (multiple matches for each tool)
```

**Method 2 - Read and verify:**
- [ ] `enable_debug_tools`: Prerequisites = "Chrome connection only"
- [ ] `breakpoint` (set action): Prerequisites = "Debugger must be enabled"
- [ ] `step_over`: Prerequisites = "Debugger enabled AND execution PAUSED"
- [ ] `call_stack`: Prerequisites = "Execution must be PAUSED"
- [ ] `evaluate`: Prerequisites = "Execution PAUSED + call_frame_id from call_stack()"
- [ ] All other debugger tools have appropriate prerequisites listed

**What "done" looks like:**
- [ ] Prerequisites section present in all 18 tool descriptions
- [ ] Prerequisites use consistent language/format
- [ ] Each tool's prerequisites are accurate and complete
- [ ] Error scenarios referenced (e.g., "If debugger not enabled, error: ...")
- [ ] Related tools mentioned (e.g., "Call enable_debug_tools() first")

**Quality Checks:**
- Prerequisite text is 1-3 sentences (not too verbose)
- Prerequisite mentions what to call if missing (e.g., "Call enable_debug_tools() first")
- Smart and legacy tools have matching prerequisites
- Prerequisites reference actual states/tools that exist

---

### 3. Output Format Specifications (CALL_STACK, EVALUATE, + others)

**Criterion:** Tools with complex output document their return format with examples.

**Verification:**

**Tools requiring output format:**
- [ ] `call_stack()` / `debugger_get_call_stack`:
  - [ ] Description includes return type: "Array of CallFrame objects"
  - [ ] CallFrame structure documented (callFrameId, functionName, location, scopeChain, this)
  - [ ] Example output provided
  - [ ] Sample output is realistic (not placeholder text)

- [ ] `evaluate()` / `debugger_evaluate_on_call_frame`:
  - [ ] Description includes return type: "Evaluated value or error"
  - [ ] Example of successful evaluation provided
  - [ ] Example of error scenario provided

- [ ] Other complex-output tools:
  - [ ] `pause_on_exceptions` / `debugger_set_pause_on_exceptions`: Return format documented
  - [ ] Any other tools with non-trivial output documented

**What "done" looks like:**
- [ ] Output format section present in each affected tool description
- [ ] Return type is explicitly stated (e.g., "Returns: Array of CallFrame objects")
- [ ] Example outputs are realistic and match actual code behavior
- [ ] Examples show both success and error cases where applicable
- [ ] TypeScript interface names referenced where relevant

**Quality Checks:**
- Examples match actual tool implementations (verify against src/browser.ts)
- Example JSON/objects are valid and parseable
- Examples are concise but complete enough to be useful
- No placeholder text like "[...]" or "omitted for brevity"

---

### 4. Call_frame_id Documentation

**Criterion:** Relationship between call_stack (producer) and evaluate (consumer) is clear.

**Verification:**
```bash
# Search for call_frame_id documentation
grep -i "call_frame_id\|callFrameId" src/index.ts | wc -l
# Should show multiple matches in evaluate/evaluate_on_call_frame descriptions
```

**What "done" looks like:**
- [ ] `call_stack()` / `debugger_get_call_stack` description explains what call_frame_id is
  - Explanation: "Unique identifier for a stack frame returned in this tool's output"
- [ ] `evaluate()` / `debugger_evaluate_on_call_frame` description explains call_frame_id source
  - Explanation: "Use call_frame_id values obtained from call_stack() to target specific frames"
- [ ] Relationship is clear: "Get from call_stack() → Pass to evaluate()"
- [ ] All tools accepting call_frame_id document where to get it
- [ ] Lifecycle is clear (obtained once → passed multiple times → invalidated on resume)

**Quality Checks:**
- Explanation is 1-2 sentences (concise)
- Explanation mentions both tools (source and consumer)
- Lifecycle constraints are noted (e.g., "Invalid after resume()")
- Both legacy and smart tool variants documented consistently

---

## Test/Validation Procedures

### Automated Checks

```bash
# 1. TypeScript compilation succeeds
npm run build
# Expected: No errors, exit code 0

# 2. Tool registry validates all tools
npm test
# Expected: All tests pass

# 3. MCP server starts
npx @modelcontextprotocol/inspector node build/src/index.js
# Expected: Server starts, tools listed correctly
```

### Manual Verification

1. **Read all 18 tool descriptions:**
   - Open `build/src/index.ts` or `src/index.ts`
   - Read each debugger tool's description
   - Verify it includes: state machine + prerequisites + output format (if applicable)

2. **Trace debugger workflow:**
   - Read `enable_debug_tools` description
   - Read `breakpoint` description
   - Read `step` description
   - Read `call_stack` description
   - Read `evaluate` description
   - Verify you can understand the complete workflow from descriptions alone

3. **Verify prerequisites consistency:**
   - For each tool, identify its prerequisites
   - Check that error messages reference unmet prerequisites
   - Verify related tools are mentioned

4. **Validate output format examples:**
   - For `call_stack`, verify example matches actual CallFrame structure
   - For `evaluate`, verify example shows realistic evaluation result
   - Check that examples are not truncated or placeholder text

---

## Definition of Done Checklist

- [ ] All 18 debugger tools have state machine documentation
- [ ] All 18 debugger tools have prerequisites section
- [ ] `call_stack`/`debugger_get_call_stack` have output format with example
- [ ] `evaluate`/`debugger_evaluate_on_call_frame` have output format with example
- [ ] `call_frame_id` lifecycle documented in 2+ tools
- [ ] TypeScript builds with no errors (`npm run build`)
- [ ] All tests pass (`npm test`)
- [ ] Manual verification: Can understand complete debugger workflow from tool descriptions alone
- [ ] Documentation is consistent across legacy and smart tool variants
- [ ] No placeholder text or incomplete documentation remains

---

## Success Indicators

**User Can:**
- [ ] Understand debugger state machine from any debugger tool description
- [ ] Know what prerequisites are required before calling each tool
- [ ] Know what to call if prerequisites are missing
- [ ] Understand what output to expect
- [ ] Trace complete debugger workflow without consulting CLAUDE.md
- [ ] Understand relationship between call_stack and evaluate

**Code Quality:**
- [ ] All descriptions follow consistent template structure
- [ ] No duplication of effort (state machine copied, not rewritten)
- [ ] Descriptions are clear but concise (not verbose)
- [ ] Build succeeds, tests pass
- [ ] No TypeScript errors

---

## Out of Scope

- Implementing actual debugger functionality (already done)
- Creating usage examples for all tools (deferred to Phase 4)
- Error recovery documentation (deferred to Phase 4)
- Related tools cross-references (deferred to Phase 4)
- Tool descriptions for non-debugger tools (separate sprints)

---

## Sign-Off

This Definition of Done is APPROVED and ready for implementation.

**Approval Date:** 2026-01-30
**Approved By:** Architecture Review (inline feedback)
