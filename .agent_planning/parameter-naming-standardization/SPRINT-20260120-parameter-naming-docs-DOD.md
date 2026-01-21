# Definition of Done: Parameter Naming Documentation

**Sprint:** Parameter Naming Documentation
**Generated:** 2026-01-20 09:50:00
**Confidence:** HIGH

## Overview

This Definition of Done specifies the acceptance criteria for documenting the existing parameter naming convention. **NOTE:** This is a documentation sprint - no code changes required, as all 40+ tools already follow the correct snake_case convention.

---

## Deliverable 1: CLAUDE.md Documentation

**File:** `CLAUDE.md`

### Acceptance Criteria

- [ ] **AC1.1:** "Parameter Naming Convention" section added after "Implementation Patterns"
  - Section exists in CLAUDE.md
  - Located in logical position within document
  - Properly formatted with markdown headers

- [ ] **AC1.2:** External API (MCP Parameters) documented:
  - Explicitly states snake_case convention
  - Lists 5+ common parameter examples
  - Provides code example from real tool (e.g., queryElements)
  - Explains MCP SDK standard

- [ ] **AC1.3:** Internal TypeScript implementation documented:
  - Explicitly states camelCase convention for internal variables
  - Provides conversion example (snake_case → camelCase)
  - Shows code example from real tool
  - Explains separation of external API vs internal code

- [ ] **AC1.4:** CDP parameter conversion documented:
  - Explains CDP expects camelCase
  - Provides conversion example (line_number → lineNumber)
  - Shows code example from debugger tool
  - Notes 0-indexing vs 1-indexing where applicable

- [ ] **AC1.5:** Contributing guidelines added:
  - Subsection "Contributing: Adding New Tool Parameters"
  - 4+ rules for new tool development
  - Examples of good vs bad parameter names
  - Reference to existing tools for consistency

**Verification Method:**
- Manual review: Read CLAUDE.md section
- Checklist: All subsections present
- Code review: Examples accurate and runnable

---

## Deliverable 2: README.md Update

**File:** `README.md`

### Acceptance Criteria

- [ ] **AC2.1:** Parameter naming note added:
  - Appears in "Architecture" or "Common Commands" section
  - 1-2 sentences maximum (keep brief)
  - References CLAUDE.md for details

- [ ] **AC2.2:** Cross-reference to CLAUDE.md:
  - Link or reference to CLAUDE.md documentation
  - Directs developers to full details
  - User-facing docs remain concise

**Verification Method:**
- Manual review: Check README.md
- Link test: Verify CLAUDE.md reference works

---

## Deliverable 3: (Optional) ESLint Rule

**File:** `.eslintrc.js` or `.eslintrc.json`

### Acceptance Criteria (DEFERRED)

- [ ] **AC3.1:** ESLint rule enforces snake_case:
  - Rule configured for @typescript-eslint/naming-convention
  - Applies to tool parameter interfaces in src/tools/
  - Warnings (not errors) for violations

- [ ] **AC3.2:** CI integration:
  - ESLint runs in CI pipeline
  - Fails build on violations (after warning period)
  - Provides clear error messages

**Status:** DEFERRED (not required for MVP)

---

## Quality Gates

### Documentation Quality

- [ ] **QG1:** Accuracy:
  - All code examples are from actual codebase
  - Examples compile and run
  - No outdated or fictional code

- [ ] **QG2:** Completeness:
  - All common parameter patterns documented
  - Edge cases mentioned (nested objects, CDP conversion)
  - Contributing guidelines comprehensive

- [ ] **QG3:** Clarity:
  - Explanations clear for new contributors
  - Examples illustrate concepts effectively
  - No jargon without explanation

### Consistency

- [ ] **QG4:** Style consistency:
  - Markdown formatting matches existing CLAUDE.md
  - Code blocks properly formatted
  - Headers follow document hierarchy

- [ ] **QG5:** Content consistency:
  - Documentation matches actual code behavior
  - Examples use real tool names and parameters
  - No contradictions with existing docs

### Maintenance

- [ ] **QG6:** Sustainability:
  - Documentation easy to update
  - Examples reference stable code patterns
  - Guidelines prevent future drift

---

## Documentation Requirements

### CLAUDE.md Sections

**Required Sections:**
1. Parameter Naming Convention (new)
   - External API (MCP Parameters)
   - Internal TypeScript (Implementation)
   - CDP Parameter Conversion
   - Contributing: Adding New Tool Parameters

**Content Requirements:**
- Minimum 300 words
- 5+ code examples
- 3+ tools referenced (queryElements, debuggerSetBreakpoint, inspectElement)
- Clear good/bad comparison for contributing

### README.md Update

**Required Content:**
- 1-2 sentence note
- Reference to CLAUDE.md
- Located in appropriate section

---

## Verification Checklist

Before marking sprint complete:

### Phase 1: CLAUDE.md

- [ ] Section added after "Implementation Patterns"
- [ ] External API (snake_case) documented with examples
- [ ] Internal TypeScript (camelCase) documented with examples
- [ ] CDP conversion pattern explained
- [ ] Contributing guidelines added
- [ ] 5+ parameter examples provided
- [ ] 3+ tools referenced
- [ ] Code examples accurate and tested

### Phase 2: README.md

- [ ] Parameter naming note added
- [ ] CLAUDE.md reference included
- [ ] Content brief and user-focused

### Phase 3: Optional (Deferred)

- [ ] ESLint rule configured (if implemented)
- [ ] CI integration complete (if implemented)

---

## Sign-Off Checklist

Before marking sprint complete, verify:

- [ ] All Phase 1 acceptance criteria met
- [ ] All Phase 2 acceptance criteria met
- [ ] Quality gates passed
- [ ] Documentation reviewed by at least one person
- [ ] Code examples compile and run
- [ ] No conflicts with existing documentation
- [ ] Changes committed to version control

---

**Definition of Done Status:** DEFINED
**Approved By:** Pending user approval
**Implementation Ready:** YES
**Estimated Effort:** 1-2 hours
