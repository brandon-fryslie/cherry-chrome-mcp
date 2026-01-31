# Implementation Context: Debugger Tools Phase 1

**Sprint:** Debugger Tools - Phase 1 Documentation Improvement
**Generated:** 2026-01-30T15:50:00Z
**Audience:** do:iterative-implementer agent

---

## Executive Summary

Improve descriptions for 18 debugger tools (11 legacy + 7 smart mode) by adding:
1. Debugger state machine documentation (universal block, copy-pasted)
2. Prerequisites section (tool-specific)
3. Output format specifications with examples (for call_stack, evaluate, etc.)
4. call_frame_id lifecycle documentation

This addresses critical documentation gap (current score 3/10) that prevents users from understanding debugger workflow.

---

## File Locations

**Primary File to Edit:**
- `src/index.ts` - All tool definitions live here

**Reference Files to Review:**
- `src/browser.ts` - Actual debugger implementation to verify output types
- `src/types.ts` - CallFrame and other type definitions
- `build/src/index.js` - Compiled version (regenerated after changes)

---

## Tool List (18 Total)

### Legacy Tools (11)
1. `debugger_enable`
2. `debugger_set_breakpoint`
3. `debugger_remove_breakpoint`
4. `debugger_get_call_stack`
5. `debugger_evaluate_on_call_frame`
6. `debugger_step_over`
7. `debugger_step_into`
8. `debugger_step_out`
9. `debugger_resume`
10. `debugger_pause`
11. `debugger_set_pause_on_exceptions`

### Smart Mode Tools (7)
1. `enable_debug_tools`
2. `breakpoint` (consolidates set/remove)
3. `call_stack`
4. `evaluate`
5. `step` (consolidates over/into/out)
6. `execution` (consolidates resume/pause)
7. `pause_on_exceptions`

---

## Debugger State Machine (UNIVERSAL BLOCK)

Use this exact block for ALL 18 tools. It's the same for each tool - copy and paste:

```markdown
**Debugger State Machine:**

The debugger follows a state machine with these transitions:

```
State: DISCONNECTED
  ↓ chrome()
State: CONNECTED
  ↓ enable_debug_tools()
State: DEBUGGER_ENABLED
  ↓ breakpoint(action='set') / debugger_set_breakpoint()
  (Breakpoint is now armed and waiting)
  ↓ Code execution hits breakpoint
State: PAUSED
  ├─ query_elements() - DOM tools work (browser is frozen)
  ├─ call_stack() - Get execution frames
  ├─ evaluate() - Inspect variables in context
  ├─ step(direction='over'|'into'|'out') - Advance execution
  └─ (Multiple step/evaluate calls allowed while paused)
  ↓ execution(action='resume') / debugger_resume()
State: RUNNING
  ↓ Hit another breakpoint or call execution(action='pause')
State: PAUSED (repeat)
```

This state machine applies to all debugger tools. Tools are only available in specific states.
```

**Usage in descriptions:**
- Add this block AFTER the one-sentence purpose statement
- Before the parameters section
- Include for ALL 18 tools (legacy and smart)

---

## Prerequisites by Tool

### chrome() / chrome_connect() / chrome_launch()
**State:** DISCONNECTED
**Prerequisites:** None (starts workflow)

### enable_debug_tools() / debugger_enable
**State:** CONNECTED
**Prerequisites:** Chrome connection required (from chrome() or chrome_connect())
**Error recovery:** If not connected, error: "No Chrome connection found" → Call chrome() first

### breakpoint() / debugger_set_breakpoint()
**State:** DEBUGGER_ENABLED (for set action) or PAUSED (for remove by location)
**Prerequisites:**
- Debugger enabled (call enable_debug_tools() first)
- For 'set' action: URL and line number of breakpoint location
- For 'remove' action: breakpoint_id from previous set action
**Error recovery:** If debugger not enabled, error message will say so → Call enable_debug_tools()

### call_stack() / debugger_get_call_stack
**State:** PAUSED only
**Prerequisites:** Execution must be paused (at breakpoint or via pause())
**Error recovery:** If not paused, error: "Execution not paused" → Call execution(action='pause') first

### evaluate() / debugger_evaluate_on_call_frame
**State:** PAUSED only
**Prerequisites:** Execution must be PAUSED + call_frame_id from call_stack()
**Error recovery:** If not paused, error: "Execution not paused" → Call execution(action='pause') first
**Note:** call_frame_id becomes invalid after resume() - must re-call call_stack() after each pause

### step() / debugger_step_over / debugger_step_into / debugger_step_out
**State:** PAUSED only (enters RUNNING temporarily, returns to PAUSED at next line/function)
**Prerequisites:** Execution must be PAUSED
**Error recovery:** If not paused, error: "Execution not paused" → Call execution(action='pause') first

### execution(action='pause') / debugger_pause
**State:** RUNNING
**Prerequisites:** Debugger enabled + code is running
**Error recovery:** If already paused, error: "Already paused" (benign) → Can call call_stack() directly

### execution(action='resume') / debugger_resume
**State:** PAUSED only
**Prerequisites:** Execution must be PAUSED
**Error recovery:** If already running, error: "Not paused" → No action needed, code is running

### pause_on_exceptions() / debugger_set_pause_on_exceptions
**State:** DEBUGGER_ENABLED or later
**Prerequisites:** Debugger enabled (call enable_debug_tools() first)
**Error recovery:** If debugger not enabled, error message will say so → Call enable_debug_tools()

---

## Output Format Documentation

### call_stack() / debugger_get_call_stack

**Returns:** Array of CallFrame objects

**Structure:**
```typescript
CallFrame {
  callFrameId: string;        // Unique identifier for this frame (use with evaluate)
  functionName: string;        // Name of the function executing in this frame
  location: {
    scriptId: string;          // CDP script identifier
    lineNumber: number;        // 0-indexed line number (tool reports as 1-indexed)
    columnNumber?: number;     // 0-indexed column number
  };
  url: string;                 // Script URL
  scopeChain: Scope[];         // Variables in scope (local, closure, global, etc.)
  this: unknown;               // Value of 'this' in this frame
}
```

**Example Output:**
```json
[
  {
    "callFrameId": "1",
    "functionName": "handleClick",
    "location": {
      "scriptId": "script-1",
      "lineNumber": 42,
      "columnNumber": 12
    },
    "url": "http://localhost:5174/app.js",
    "scopeChain": [
      {
        "type": "local",
        "object": {
          "event": {...},
          "element": {...},
          "counter": 5
        }
      },
      {
        "type": "global",
        "object": {...}
      }
    ],
    "this": {...}
  }
]
```

**What it means:**
- `callFrameId` ("1") can be passed to evaluate() to inspect variables in this specific frame
- `functionName` shows what code is executing
- `location` shows where execution is paused
- `scopeChain` includes local variables (including function parameters)
- `this` shows the context object

### evaluate() / debugger_evaluate_on_call_frame

**Returns:** Either:
- `{ value: any }` - Successful evaluation
- `{ error: string }` - Evaluation failed

**Example Success:**
```json
{
  "value": 42
}
```

**Example Expression:**
```json
{
  "value": {
    "x": 10,
    "y": 20,
    "type": "point"
  }
}
```

**Example Error:**
```json
{
  "error": "TypeError: Cannot read property 'x' of undefined"
}
```

**What it means:**
- Use successful evaluations to inspect variable values
- Pass expressions like: `"element.className"`, `"counter + 1"`, `"JSON.stringify(data)"`
- Errors occur for syntax errors or references to undefined variables

### pause_on_exceptions / debugger_set_pause_on_exceptions

**Returns:** Confirmation string

**Example:**
```
"Pause on exceptions: enabled"
```

or

```
"Pause on uncaught exceptions only"
```

**What it means:**
- Confirms exception pause behavior is set
- Tool will pause execution when exceptions occur (all or uncaught only)

---

## call_frame_id Lifecycle

Add this note to both call_stack and evaluate descriptions:

```markdown
**call_frame_id Lifecycle:**

1. **Obtain:** Call call_stack() to get an array of CallFrame objects, each with a callFrameId
2. **Use:** Pass any callFrameId to evaluate() to inspect variables in that specific frame
3. **Repeat:** You can evaluate multiple times in the same frame
4. **Invalidate:** When you call resume() or step(), all call_frame_ids become invalid
5. **Refresh:** After stepping or resuming, call call_stack() again to get fresh call_frame_ids

Example flow:
1. pause() → Execution is paused
2. call_stack() → Get frame array with callFrameId: "1", "2", "3"
3. evaluate(call_frame_id="2", expression="x + y") → Get result
4. evaluate(call_frame_id="1", expression="counter") → Get result
5. step(direction="over") → Execution advances
6. call_stack() → Previous callFrameIds are no longer valid, get new ones
7. evaluate(call_frame_id="X", ...) → Use new IDs
```

---

## Implementation Strategy

### Phase A: State Machine (1-2 hours)
1. Create the state machine markdown block above
2. Copy it to all 18 tool descriptions
3. Ensure consistent formatting

### Phase B: Prerequisites (2-3 hours)
1. For each tool, add prerequisites based on the list above
2. Use consistent format: "Prerequisites: [list]"
3. Include error recovery suggestions

### Phase C: Output Formats (1-2 hours)
1. Add output format sections to:
   - `call_stack()` / `debugger_get_call_stack` - Use example above
   - `evaluate()` / `debugger_evaluate_on_call_frame` - Use example above
   - `pause_on_exceptions` / `debugger_set_pause_on_exceptions` - Simple string
2. Verify examples match actual code in src/browser.ts

### Phase D: call_frame_id Documentation (30 min)
1. Add lifecycle documentation to `call_stack()` description
2. Add lifecycle documentation to `evaluate()` description
3. Ensure both mention the relationship

### Phase E: Testing (30 min)
1. `npm run build` - Ensure TypeScript compiles
2. `npm test` - Ensure all tests pass
3. Manual verification: Read descriptions and verify completeness

---

## Location of Tool Definitions in src/index.ts

Search for these patterns to find each tool definition:

```typescript
// Legacy tools
const debugger_enable: Tool = { ... }
const debugger_set_breakpoint: Tool = { ... }
const debugger_remove_breakpoint: Tool = { ... }
const debugger_get_call_stack: Tool = { ... }
const debugger_evaluate_on_call_frame: Tool = { ... }
const debugger_step_over: Tool = { ... }
const debugger_step_into: Tool = { ... }
const debugger_step_out: Tool = { ... }
const debugger_resume: Tool = { ... }
const debugger_pause: Tool = { ... }
const debugger_set_pause_on_exceptions: Tool = { ... }

// Smart mode tools
const enable_debug_tools: Tool = { ... }
const breakpoint: Tool = { ... }
const call_stack: Tool = { ... }
const evaluate: Tool = { ... }
const step: Tool = { ... }
const execution: Tool = { ... }
const pause_on_exceptions: Tool = { ... }
```

Each tool has this structure:
```typescript
const toolName: Tool = {
  name: "toolName",
  description: "...",  // <- UPDATE THIS SECTION
  inputSchema: {
    type: "object",
    properties: { ... },
    required: [ ... ]
  }
};
```

---

## Modification Checklist

- [ ] Found all 11 legacy debugger tools in src/index.ts
- [ ] Found all 7 smart mode debugger tools in src/index.ts
- [ ] Added state machine documentation to all 18 tools
- [ ] Added prerequisites section to all 18 tools
- [ ] Added output format to call_stack tools (legacy + smart)
- [ ] Added output format to evaluate tools (legacy + smart)
- [ ] Added output format to pause_on_exceptions (if applicable)
- [ ] Added call_frame_id lifecycle to both call_stack and evaluate
- [ ] Verified consistent formatting across all tools
- [ ] Verified no placeholder text remains
- [ ] Ran `npm run build` - no errors
- [ ] Ran `npm test` - all tests pass
- [ ] Manually verified descriptions are complete and clear

---

## Quality Assurance

**After Implementation:**

1. **Build Check:**
   ```bash
   npm run build
   ```
   Expected: No TypeScript errors, build succeeds

2. **Test Check:**
   ```bash
   npm test
   ```
   Expected: All tests pass

3. **Server Start Check:**
   ```bash
   npx @modelcontextprotocol/inspector node build/src/index.js
   ```
   Expected: Server starts, can list tools

4. **Manual Review:**
   - Open `src/index.ts` and scroll through tool descriptions
   - Verify:
     - [ ] State machine present in 18 tools
     - [ ] Prerequisites section in 18 tools
     - [ ] Output format in appropriate tools
     - [ ] Consistent formatting and language

5. **Workflow Verification:**
   - Read tool descriptions in order: chrome → enable_debug_tools → breakpoint → call_stack → evaluate → step → execution
   - Verify you can understand complete workflow without external docs

---

## Success Criteria

1. All 18 debugger tool descriptions updated
2. Zero TypeScript errors, all tests pass
3. Descriptions are self-contained (no "see CLAUDE.md")
4. Prerequisites and output formats are documented
5. User can understand debugger workflow from descriptions alone

---

## Notes for Implementer

- This is primarily documentation work - no code changes needed
- Use the state machine block as-is for all 18 tools (standardizes experience)
- Prerequisites vary by tool - refer to the list above for each one
- Output format examples must be realistic - review actual code if uncertain
- Maintain consistent formatting with existing tool descriptions
- Don't remove or change any existing documentation - only add new sections
- Smart mode (enable_debug_tools, breakpoint, etc.) may have slightly different wording but same requirements
