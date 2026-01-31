# Sprint: Debugger Tools - Phase 1 Documentation Improvement

**Generated:** 2026-01-30T15:50:00Z
**Confidence:** HIGH: 2, MEDIUM: 1, LOW: 0
**Status:** READY FOR IMPLEMENTATION (2/3 items HIGH, 1 item MEDIUM)

---

## Sprint Goal

Enhance debugger tool descriptions (11 legacy + 7 smart) with complete state machine documentation, clear prerequisites, output format specifications, and call_frame_id documentation. This addresses the critical gap preventing users from understanding the debugger workflow.

---

## Scope

**Deliverables:**
1. Add debugger state machine documentation to all 18 debugger tools
2. Document prerequisites and state dependencies for each tool
3. Add output format specifications and examples
4. Document call_frame_id concept and lifecycle

**Tools Affected:**
- Legacy (11): `debugger_enable`, `debugger_set_breakpoint`, `debugger_get_call_stack`, `debugger_evaluate_on_call_frame`, `debugger_step_over`, `debugger_step_into`, `debugger_step_out`, `debugger_resume`, `debugger_pause`, `debugger_remove_breakpoint`, `debugger_set_pause_on_exceptions`
- Smart (7): `enable_debug_tools`, `breakpoint`, `step`, `execution`, `call_stack`, `evaluate`, `pause_on_exceptions`

---

## Work Items

### P0: Add Debugger State Machine Documentation

**Confidence:** HIGH

**Description:** Add comprehensive state machine documentation explaining the debugger lifecycle to every debugger tool description.

**Acceptance Criteria:**
- [ ] Every debugger tool description includes the debugger state machine diagram (same diagram for all)
- [ ] Diagram shows transitions: DISCONNECTED → CONNECTED → DEBUGGER_ENABLED → PAUSED ⟷ RUNNING
- [ ] Each state transition shows which tool triggers it
- [ ] All 18 debugger tools have identical state machine documentation

**Technical Notes:**
- State machine is universal across all debugger tools
- Copy-paste the same documentation block to each tool's description
- Format as a markdown diagram or ASCII art for clarity
- Location: Add to all tool descriptions in `src/index.ts`

**Files to Modify:**
- `src/index.ts` - Update tool descriptions for all 18 debugger tools

---

### P1: Document Prerequisites and State Dependencies

**Confidence:** HIGH

**Description:** Add prerequisites section to each debugger tool explaining what state is required before it can be called.

**Acceptance Criteria:**
- [ ] Every debugger tool has a "Prerequisites" section in its description
- [ ] Prerequisites clearly state:
  - Required connection state (e.g., "Chrome connection required via enable_debug_tools()")
  - Required execution state (e.g., "Execution must be PAUSED")
  - Required prior calls (e.g., "call_stack() required to get call_frame_id")
- [ ] Error messages reference what prerequisites are missing
- [ ] Tools that have no prerequisites explicitly state "None" or "Chrome connection only"

**Technical Notes:**
- Use consistent language across all 18 tools
- Prerequisites vary:
  - `enable_debug_tools`: Needs only connection
  - `set_breakpoint`: Needs debugger enabled
  - `step_over`, `step_into`, `step_out`: Need execution PAUSED
  - `evaluate_on_call_frame`: Needs execution PAUSED + call_frame_id from call_stack
  - `get_call_stack`: Needs execution PAUSED
  - `pause`: Needs debugger enabled
  - `resume`: Needs execution PAUSED
- Location: Add to all tool descriptions in `src/index.ts`

**Files to Modify:**
- `src/index.ts` - Update tool descriptions for all 18 debugger tools

---

### P2: Add Output Format Specifications

**Confidence:** MEDIUM

**Description:** Document return value structure and format for debugger tools that have complex output.

**Acceptance Criteria:**
- [ ] `call_stack()` description includes:
  - Return format: Array of CallFrame objects
  - CallFrame structure with all fields (callFrameId, functionName, location, scopeChain, this)
  - Example output showing real structure
- [ ] `evaluate_on_call_frame()` description includes:
  - Return format: Evaluated value or error
  - Example outputs (successful evaluation, error)
- [ ] `get_pause_on_exceptions()` description includes return format
- [ ] All output examples are realistic and match actual return values
- [ ] TypeScript interfaces referenced (e.g., "CallFrame" from types.ts)

**Technical Notes:**
- Review actual return types in `src/browser.ts` and `src/types.ts`
- Ensure examples match real outputs
- Use TypeScript-style notation for clarity
- Call_frame_id is documented as: "Unique identifier returned by call_stack() used to target a specific stack frame for evaluate_on_call_frame()"

**Unknowns to Resolve:**
- Should examples include full nested objects or simplified summaries?
- How verbose should TypeScript interface documentation be in descriptions?

**Exit Criteria:**
- Reviewed actual tool implementations and confirmed output types
- Created realistic example outputs
- Decided on documentation verbosity level

**Files to Modify:**
- `src/index.ts` - Update tool descriptions for `call_stack`, `evaluate_on_call_frame`, `debugger_get_call_stack`, `debugger_evaluate_on_call_frame`

---

### P3: Document call_frame_id Concept (Shared Across All Items)

**Acceptance Criteria:**
- [ ] At least 2 tools that use call_frame_id explain what it is
- [ ] Explanation states: "Unique identifier for a stack frame, obtained from call_stack()"
- [ ] Relationship is clear: "Get from call_stack() → Pass to evaluate_on_call_frame()"
- [ ] All tools that accept call_frame_id document its source

**Technical Notes:**
- This is a cross-cutting concept referenced by:
  - `debugger_get_call_stack` / `call_stack` (returns it)
  - `debugger_evaluate_on_call_frame` / `evaluate` (accepts it)
- Ensure consistency across both legacy and smart tool names

---

## Dependencies

**Internal Dependencies:**
- Tools must be defined before descriptions can be updated
- `src/index.ts` is single source of truth for tool definitions

**External Dependencies:**
- None - all tools are already implemented

---

## Implementation Order

1. **Create state machine documentation block** - write once, copy to all 18 tools
2. **Update prerequisites section** - add to each tool with appropriate content
3. **Add output format specifications** - focus on call_stack and evaluate first
4. **Document call_frame_id** - ensure consistency across both tool names (legacy + smart)
5. **Review and validate** - ensure all 18 tools have consistent documentation

---

## Risks and Mitigations

| Risk | Mitigation |
|------|-----------|
| Inconsistent documentation across tools | Use templated sections that are copy-pasted with tool-specific variations |
| Output format examples don't match actual code | Review src/browser.ts implementations before writing examples |
| Prerequisites too verbose/confusing | Use bulleted format, match existing tool description style |
| Smart mode tools (enable_debug_tools, breakpoint, etc.) differ from legacy | Document both tool names and ensure smart mode consolidation is clear |

---

## Success Metrics

- All 18 debugger tools have updated descriptions
- New descriptions follow consistent template structure
- Users can determine prerequisites and state requirements from descriptions alone
- Users understand call_frame_id lifecycle (get from call_stack, pass to evaluate)
- Debugger state machine is clearly documented in every tool

---

## Notes

- This sprint addresses the "CRITICAL" evaluation finding (score 3/10 for debugger tools)
- Fixes architectural violation: "GOALS MUST BE VERIFIABLE"
- Enables users to use debugger tools without external documentation
- Phase 2 will address consolidated tool (smart mode) action-parameter mappings
