# Sprint: Metrics and Scenarios Design

Generated: 2026-01-20
Confidence: HIGH
Status: READY FOR IMPLEMENTATION

## Sprint Goal

Define comprehensive evaluation metrics and design test scenarios that thoroughly exercise Cherry Chrome MCP functionality, producing specifications ready for webapp implementation in future sprints.

## Deliverables

1. **Evaluation Framework Document**: Complete metrics taxonomy with scoring rubrics
2. **Scenario Catalog**: Detailed specifications for test scenarios organized by tool category
3. **Webapp Requirements**: Technical requirements for test webapps based on scenario needs

---

## Part 1: Evaluation Metrics Taxonomy

### Category A: Tool Selection & Intuition

| Metric | Description | Scoring |
|--------|-------------|---------|
| **A1. First-Try Selection** | Did agent pick the correct tool on first attempt? | Binary (Y/N) |
| **A2. Selection Latency** | How many turns before correct tool was chosen? | Count (1 = ideal) |
| **A3. Description Sufficiency** | Did tool descriptions alone guide selection, or was trial-and-error needed? | 1-5 scale |
| **A4. Parameter Discovery** | Were required/optional params understood without examples? | Binary (Y/N) |
| **A5. Tool Chaining Intuition** | When multi-tool workflow needed, was sequence natural? | 1-5 scale |

### Category B: Functional Correctness

| Metric | Description | Scoring |
|--------|-------------|---------|
| **B1. Result Accuracy** | Did tool return factually correct information? | Binary (Y/N) |
| **B2. Result Completeness** | Was returned info sufficient for the task? | 1-5 scale |
| **B3. Action Effectiveness** | For mutations (click/fill/navigate), did intended effect occur? | Binary (Y/N) |
| **B4. Error Quality** | When errors occur, were messages actionable? | 1-5 scale |
| **B5. Edge Case Handling** | How did tool behave on unusual inputs (empty results, large datasets)? | 1-5 scale |
| **B6. Context Utility** | Was auto-context (DOM diff, suggestions) helpful vs. noise? | 1-5 scale |

### Category C: Efficiency

| Metric | Description | Scoring |
|--------|-------------|---------|
| **C1. Tool Call Count** | How many calls to achieve outcome? | Count (lower = better) |
| **C2. Token Consumption** | Approximate tokens used (input + output) | Count |
| **C3. Result Density** | Useful info / total output ratio | Percentage |
| **C4. Retry Rate** | Calls that had to be retried with different params | Count (0 = ideal) |
| **C5. Dead-End Rate** | Tool calls that contributed nothing to outcome | Count (0 = ideal) |

### Category D: Cognitive Flow

| Metric | Description | Scoring |
|--------|-------------|---------|
| **D1. Focus Retention** | Did agent stay on task or get distracted by tool output? | Binary (Y/N) |
| **D2. Continuation Quality** | After tool use, was agent's reasoning coherent? | 1-5 scale |
| **D3. Information Overload** | Did verbose output cause agent to miss key details? | 1-5 scale (5=no overload) |
| **D4. Tool-Goal Alignment** | Were tool results immediately applicable to user's goal? | 1-5 scale |

### Category E: Reliability

| Metric | Description | Scoring |
|--------|-------------|---------|
| **E1. Cross-Trial Consistency** | Same task, same approach, across N trials? | Percentage |
| **E2. Structure Robustness** | Works on varied page structures (SPA, MPA, iframe)? | Percentage |
| **E3. State Tolerance** | Handles page state changes mid-workflow? | Binary (Y/N) |
| **E4. Timeout Resilience** | Graceful behavior on slow responses? | 1-5 scale |

### Category F: Debugger-Specific

| Metric | Description | Scoring |
|--------|-------------|---------|
| **F1. Breakpoint Accuracy** | Set at intended line, triggers when expected? | Binary (Y/N) |
| **F2. Variable Inspection** | Can retrieve expected values in scope? | Binary (Y/N) |
| **F3. Step Navigation** | Step over/into/out behaves as expected? | Binary (Y/N) |
| **F4. Async Debugging** | Can debug promises/async-await code? | Binary (Y/N) |

---

## Part 2: Test Scenario Catalog

### Scenario Set 1: DOM Query & Inspection

#### S1.1 - Simple Element Lookup
**Goal**: Find a specific button by text content
**Page Requirements**: Page with 5+ buttons, one with unique text "Submit Order"
**Tool Chain**: `query_elements` with `text_contains`
**Metrics Focus**: A1, B1, B2, C1

#### S1.2 - Complex Selector Refinement
**Goal**: Find an element that requires iterative selector refinement
**Page Requirements**: Nested form with repeated `.form-field` classes, need to find email input specifically
**Tool Chain**: `query_elements` (broad) → analyze → `query_elements` (narrowed)
**Metrics Focus**: A5, C1, C4, D1

#### S1.3 - Zero Results with Suggestions
**Goal**: Search for non-existent element, use suggestions to recover
**Page Requirements**: Page with `.login-btn` but agent searches for `.signin-btn`
**Tool Chain**: `query_elements` → interpret suggestions → corrected `query_elements`
**Metrics Focus**: B4, B6, C4

#### S1.4 - Hidden Element Discovery
**Goal**: Find elements hidden via CSS (display:none, visibility:hidden)
**Page Requirements**: Modal with hidden overlay, dropdown with hidden menu
**Tool Chain**: `query_elements` with `include_hidden: true`
**Metrics Focus**: B1, A4

#### S1.5 - Natural Language Selector Discovery
**Goal**: Find "the login button" using natural language
**Page Requirements**: Page with various buttons, login button has id and aria-label
**Tool Chain**: `inspect_element` with `description`
**Metrics Focus**: A1, B1, B2

#### S1.6 - Spatial Element Discovery
**Goal**: Find input "below the header"
**Page Requirements**: Header with multiple inputs elsewhere, one input directly below header
**Tool Chain**: `inspect_element` with `near` parameter
**Metrics Focus**: B1, A4

### Scenario Set 2: DOM Actions

#### S2.1 - Click with Verification
**Goal**: Click a button and verify the resulting DOM change
**Page Requirements**: Button that toggles a panel's visibility
**Tool Chain**: `click_element` → observe DOM diff in response
**Metrics Focus**: B3, B6, D4

#### S2.2 - Form Fill Workflow
**Goal**: Fill a multi-field form and submit
**Page Requirements**: Login form (email, password, remember-me, submit)
**Tool Chain**: Multiple `fill_element` → `click_element` (submit)
**Metrics Focus**: B3, C1, A5

#### S2.3 - Dynamic Form Interactions
**Goal**: Fill form where inputs appear conditionally
**Page Requirements**: Form where selecting "Business" shows additional fields
**Tool Chain**: `fill_element` → `click_element` (radio) → `query_elements` (find new fields) → `fill_element`
**Metrics Focus**: E3, A5, C1

#### S2.4 - Navigate and Orient
**Goal**: Navigate to a page and understand its structure
**Page Requirements**: Multi-page app with distinct pages
**Tool Chain**: `navigate` → use context to identify key elements
**Metrics Focus**: B6, D2, D4

### Scenario Set 3: Console & Debugging

#### S3.1 - Error Triage
**Goal**: Page has JS errors, identify the issue
**Page Requirements**: Page with intentional TypeError
**Tool Chain**: `get_console_logs` with `filter_level: "error"`
**Metrics Focus**: B1, B2, C3

#### S3.2 - State Change Tracking
**Goal**: Detect console activity after an action
**Page Requirements**: Button that triggers console.log statements
**Tool Chain**: `get_console_logs` (before) → `click_element` → `get_console_logs` (after)
**Metrics Focus**: B6 (freshness indicators), D1

### Scenario Set 4: JavaScript Debugging

#### S4.1 - Breakpoint Workflow
**Goal**: Set breakpoint, trigger it, inspect variables
**Page Requirements**: Page with button that calls function with local variables
**Tool Chain**: `enable_debug_tools` → `breakpoint(set)` → `click_element` (trigger) → `call_stack` → `evaluate`
**Metrics Focus**: F1, F2, A5

#### S4.2 - Step Through Logic
**Goal**: Step through a function to understand flow
**Page Requirements**: Function with conditional logic (if/else branches)
**Tool Chain**: (paused at breakpoint) → `step(over)` multiple times → observe flow
**Metrics Focus**: F3, B6 (step context)

#### S4.3 - Async Debugging
**Goal**: Debug async code with promises
**Page Requirements**: Button that triggers async fetch, process result
**Tool Chain**: Breakpoint in async function → step → inspect awaited values
**Metrics Focus**: F4, E4

### Scenario Set 5: Connection Management

#### S5.1 - Multi-Tab Management
**Goal**: Open multiple tabs, switch between them
**Page Requirements**: App that opens new tabs (e.g., "Open in new tab" link)
**Tool Chain**: `target(list)` → `target(switch)`
**Metrics Focus**: B1, A1

#### S5.2 - SPA Navigation
**Goal**: Handle client-side routing in SPA
**Page Requirements**: React/Vue-style SPA with client-side routes
**Tool Chain**: `navigate` → `query_elements` → observe SPA behavior
**Metrics Focus**: E2, B3

### Scenario Set 6: Edge Cases & Stress Tests

#### S6.1 - Large DOM
**Goal**: Query page with 1000+ elements
**Page Requirements**: Table/list with 500+ rows
**Tool Chain**: `query_elements` → handle limit gracefully
**Metrics Focus**: B5, C3

#### S6.2 - Rapid State Changes
**Goal**: Interact with page that changes frequently
**Page Requirements**: Live-updating dashboard (simulated with setInterval)
**Tool Chain**: Actions during updates, verify consistency
**Metrics Focus**: E3, E4

#### S6.3 - iFrame Interaction
**Goal**: Query elements inside iframes
**Page Requirements**: Page with embedded iframe containing form
**Tool Chain**: Attempt query, observe behavior/limitations
**Metrics Focus**: E2, B4

---

## Part 3: Webapp Requirements Summary

Based on scenarios, the test webapp suite needs:

### Webapp 1: Form-Heavy Application
- Login form (S1.5, S2.2)
- Multi-step form with conditional fields (S2.3)
- Hidden modals/dropdowns (S1.4)
- Multiple buttons with varied text (S1.1)
- Nested form structure for selector refinement (S1.2)

### Webapp 2: Interactive Dashboard
- Buttons that toggle UI elements (S2.1)
- Console-logging interactions (S3.2)
- Simulated live updates (S6.2)
- Large data table (S6.1)

### Webapp 3: Debuggable Application
- Functions with inspectable local variables (S4.1)
- Conditional logic for stepping (S4.2)
- Async operations (S4.3)
- Intentional errors for console triage (S3.1)

### Webapp 4: Multi-Page/Tab Application
- Client-side routing (SPA) (S5.2)
- "Open in new tab" functionality (S5.1)
- iframe embedding (S6.3)

### Technical Requirements (All Webapps)
- Serve via lightweight Node.js/Express or static file server
- No build step required (vanilla HTML/CSS/JS or pre-built bundles)
- Self-contained (no external API dependencies)
- Deterministic behavior for reproducible testing

---

## Acceptance Criteria

### P0: Evaluation Framework
- [ ] All 6 metric categories documented with clear definitions
- [ ] Scoring rubrics defined (scales, interpretation)
- [ ] Metric applicability mapped to scenarios

### P1: Scenario Catalog
- [ ] Minimum 15 scenarios covering all tool categories
- [ ] Each scenario has: goal, page requirements, tool chain, metrics focus
- [ ] Scenarios ordered by complexity (simple → complex)

### P2: Webapp Requirements
- [ ] Technical requirements derived from scenarios
- [ ] Clear mapping: scenario → webapp → specific page features
- [ ] Enough detail to guide future implementation sprint

---

## Dependencies

- Understanding of all 17 MCP tools ✅ (from CLAUDE.md and source review)
- Clear user requirements ✅ (from user's request)

## Risks

| Risk | Mitigation |
|------|------------|
| Scenarios too narrow, miss real-world usage | Include exploratory scenarios, revisit after initial testing |
| Metrics hard to measure objectively | Use binary where possible, define anchor points for scales |
| Webapp complexity creeps up | Keep webapps minimal; one feature per scenario focus |
