# Definition of Done: Metrics and Scenarios Design

Sprint: SPRINT-20260120-metrics-scenarios
Generated: 2026-01-20

## Deliverable 1: Evaluation Framework Document

### Acceptance Criteria

- [ ] **Metric Categories Complete**: All 6 categories defined (Tool Selection, Functionality, Efficiency, Cognitive Flow, Reliability, Debugger-Specific)
- [ ] **Metrics Enumerated**: Each category has 3-6 specific, measurable metrics
- [ ] **Scoring Rubrics**: Every metric has clear scoring (binary Y/N, counts, or 1-5 scale with anchor definitions)
- [ ] **Interpretation Guide**: Explanation of what scores mean and how to aggregate across metrics

### Verification

Manual review confirms:
1. Any evaluator can understand and apply the metrics consistently
2. Metrics cover the full tool surface (no tool category unmeasured)
3. Scoring is objective enough for cross-evaluator agreement

---

## Deliverable 2: Scenario Catalog

### Acceptance Criteria

- [ ] **Coverage**: Minimum 15 scenarios total
- [ ] **DOM Query Scenarios**: At least 6 scenarios covering `query_elements` and `inspect_element`
- [ ] **DOM Action Scenarios**: At least 4 scenarios covering `click_element`, `fill_element`, `navigate`
- [ ] **Console Scenarios**: At least 2 scenarios covering `get_console_logs`
- [ ] **Debugger Scenarios**: At least 3 scenarios covering breakpoints, stepping, evaluation
- [ ] **Connection Scenarios**: At least 2 scenarios covering multi-tab/target management
- [ ] **Edge Case Scenarios**: At least 3 scenarios covering stress tests and edge cases

### Scenario Quality Criteria (each scenario must have)

- [ ] **Goal**: Clear statement of what the agent is trying to accomplish
- [ ] **Page Requirements**: Specific DOM/JS features the test webapp needs
- [ ] **Expected Tool Chain**: Anticipated sequence of tool calls
- [ ] **Metrics Focus**: Which 2-4 metrics this scenario primarily evaluates

### Verification

1. Scenarios can be understood by someone unfamiliar with the project
2. No tool goes completely untested
3. Scenarios progress from simple to complex within each category

---

## Deliverable 3: Webapp Requirements

### Acceptance Criteria

- [ ] **Webapp Count**: 3-5 distinct webapp specifications
- [ ] **Feature Mapping**: Each webapp lists specific features required
- [ ] **Scenario Coverage**: Every scenario maps to exactly one webapp
- [ ] **Technical Constraints**: Common technical requirements documented (server, no-build, self-contained)
- [ ] **Determinism**: Requirements ensure reproducible test outcomes

### Verification

1. A developer could implement each webapp from the requirements alone
2. No scenario lacks a corresponding webapp
3. Webapps are minimal (no features beyond what scenarios require)

---

## Overall DoD

The sprint is complete when:

1. All three deliverables pass their acceptance criteria
2. Documents are saved in `.agent_planning/manual-test-suite/`
3. A reviewer (user) confirms the framework is suitable for future sprint implementation

---

## Exit Criteria to Next Sprint

This sprint enables:
- **Future Sprint A**: Build/acquire Webapp 1 (Form-Heavy)
- **Future Sprint B**: Build/acquire Webapp 2 (Interactive Dashboard)
- **Future Sprint C**: Build/acquire Webapp 3 (Debuggable Application)
- **Future Sprint D**: Build/acquire Webapp 4 (Multi-Page/Tab)
- **Future Sprint E**: Create test harness and scoring tooling

Each future sprint can proceed independently once this sprint's deliverables are approved.
