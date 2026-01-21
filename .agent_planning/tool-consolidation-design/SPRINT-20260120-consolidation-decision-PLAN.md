# Sprint: Tool Consolidation Design Decision

Generated: 2026-01-20 09:54:00
Confidence: HIGH
Status: DECISION COMPLETE - DOCUMENTATION SPRINT

## Sprint Goal

Document the tool consolidation design decision, formalizing the principle: **"Consolidate mutually exclusive modes; keep single responsibilities separate."** This is a **decision + documentation sprint**, not a code refactoring sprint.

## Decision Summary

**DECISION:** Maintain current consolidation approach. No further consolidation needed.

**Rationale:**
- Current strategy follows clear principle (mutual exclusivity)
- Three "unconsolidated" tools (call_stack, evaluate, pause_on_exceptions) are correctly separate
- Consolidating them would reduce usability without benefit

**Action Required:** Document the design rationale to prevent future drift.

## Scope

**Deliverables:**
1. Document tool consolidation strategy in CLAUDE.md
2. Explain consolidation principle (mutual exclusivity)
3. List consolidated vs separate tools with rationale
4. Provide guidelines for future tool additions

**Out of Scope:**
- Code changes (current implementation is correct)
- Further consolidation (not needed)
- Refactoring existing tools

## Work Item: Documentation

**File:** `CLAUDE.md`

**Acceptance Criteria:**
- [ ] Add "Tool Consolidation Strategy" section
- [ ] Document consolidation principle (mutual exclusivity)
- [ ] List all 5 consolidated tools with patterns
- [ ] List 3 separate tools with rationale
- [ ] Provide decision rule for future consolidation
- [ ] Add examples of when to consolidate vs keep separate

**Content Structure:**

```markdown
## Tool Consolidation Strategy

### Consolidation Principle

Cherry Chrome MCP uses **action-based consolidation** for tools that represent
mutually exclusive operational modes of a single concept. Tools with single
responsibilities remain separate.

### Consolidated Tools (5)

These tools use action parameters to gate mutually exclusive operations:

1. **chrome** - `action: 'connect' | 'launch'`
   - Manages Chrome instance creation
   - Connect to existing OR launch new (mutually exclusive)

2. **target** - `action: 'list' | 'switch'`
   - Manages browser page targets
   - List all OR switch to one (mutually exclusive)

3. **breakpoint** - `action: 'set' | 'remove'`
   - Manages debugging breakpoints
   - Set OR remove (inverse operations, same domain)

4. **step** - `direction: 'over' | 'into' | 'out'`
   - Controls execution stepping
   - Three variants of advancing execution (mutually exclusive)

5. **execution** - `action: 'pause' | 'resume'`
   - Controls execution flow state
   - Pause OR resume (opposite states, same control)

### Separate Tools (3 debugger tools)

These tools remain separate because they have single, distinct responsibilities:

1. **call_stack** - Gets call stack when execution is paused
   - **Why separate:** Pure query operation with no variants
   - **Not consolidated:** No alternative "action" exists

2. **evaluate** - Evaluates JavaScript expression in call frame
   - **Why separate:** Single operation (expression evaluation)
   - **Not consolidated:** No operational modes or variants

3. **pause_on_exceptions** - Configures exception pause behavior
   - **Why separate:** Configuration setter (state is value, not mode)
   - **Not consolidated:** Not an execution control; it's debugger configuration

### Design Rule

**"Consolidate mutually exclusive modes; keep single responsibilities separate."**

**When to consolidate:**
1. Multiple operations represent mutually exclusive modes of one concept
2. Tool name would be generic without action parameter
3. Parameters differ primarily by action/direction type
4. Consolidation reduces cognitive load

**When to keep separate:**
1. Tool has a distinct, single responsibility
2. Tool name is already a specific verb (evaluate, query, navigate)
3. No natural action parameter exists
4. Action parameter would be redundant ("get" as only action)

### Examples

**Good Consolidation:**
- ✅ `chrome(action='connect')` vs `chrome(action='launch')` - Mutually exclusive modes
- ✅ `step(direction='over')` vs `step(direction='into')` - Variants of same operation

**Bad Consolidation (would hurt usability):**
- ❌ `debugger(action='call_stack')` - Redundant action, obscures purpose
- ❌ `debugger(action='evaluate', expression='x')` - False grouping, unclear intent

### Future Tool Additions

When adding new tools, ask:

1. **Does this tool have multiple mutually exclusive modes?**
   - YES → Consider consolidation with action parameter
   - NO → Keep separate

2. **Would the tool name be too generic without an action?**
   - YES → Use action-based consolidation (e.g., `chrome(action)`)
   - NO → Tool name is already specific (e.g., `evaluate`)

3. **Would consolidation reduce or increase cognitive load?**
   - Reduce → Consolidate (fewer tools, clearer grouping)
   - Increase → Keep separate (redundant parameters confuse)
```

**Effort:** 1 hour

**Verification:**
- Manual review of CLAUDE.md
- Check all 5 consolidated tools documented
- Check all 3 separate tools explained
- Verify design rule is clear

## Dependencies

**None:** Can be implemented independently of other sprints

**Suggested Order:**
- Can be done BEFORE or AFTER tool registry implementation
- Can be done BEFORE or AFTER parameter naming documentation

## Risks

### Risk 1: Future Developer Ignores Rationale
**Severity:** Medium
**Impact:** Unnecessary consolidation breaks design principle
**Mitigation:**
- Clear documentation with examples
- Code review checklist references this principle
- Contributing guidelines mention consolidation rule

### Risk 2: Documentation Becomes Outdated
**Severity:** Low
**Impact:** New tools don't follow principle
**Mitigation:**
- Link from contributing guidelines
- Periodic documentation review
- Keep examples current with actual tools

## Success Criteria

### Documentation Quality
- ✅ CLAUDE.md has "Tool Consolidation Strategy" section
- ✅ Principle stated clearly (mutual exclusivity)
- ✅ All 5 consolidated tools documented with rationale
- ✅ All 3 separate tools explained
- ✅ Design rule provided for future decisions

### Clarity
- ✅ Developers understand when to consolidate vs keep separate
- ✅ Examples illustrate good and bad consolidation
- ✅ Guidelines prevent architectural drift

### Completeness
- ✅ All current tools categorized (consolidated or separate)
- ✅ Rationale provided for each category
- ✅ Future decision criteria documented

## Implementation Sequence

1. **Write Documentation** (1 hour)
   - Add "Tool Consolidation Strategy" section to CLAUDE.md
   - Document consolidated tools (5)
   - Document separate tools (3)
   - Provide design rule and examples

2. **Review and Refine** (15 minutes)
   - Verify accuracy
   - Check examples are clear
   - Ensure guidelines are actionable

**Total Effort:** 1-1.5 hours

## Exit Criteria

**MUST HAVE (blocking):**
- CLAUDE.md has "Tool Consolidation Strategy" section
- All 8 tools (5 consolidated + 3 separate) documented
- Design rule stated clearly
- Examples provided (good and bad)

**SHOULD HAVE (non-blocking):**
- Contributing guidelines reference this section
- Code review checklist mentions consolidation rule

**BLOCKED BY:**
- None (can start immediately)

---

**Status:** READY FOR IMPLEMENTATION
**Confidence:** HIGH
**Effort:** 1-1.5 hours (documentation only)
**Decision:** Keep current consolidation, document rationale
**Next Step:** Add documentation to CLAUDE.md
