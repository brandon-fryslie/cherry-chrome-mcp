# Plan Summary: Consolidate Tool Definitions

**Sprint:** SPRINT-20260119-consolidate-defs
**Confidence:** HIGH
**Status:** ✅ READY FOR IMPLEMENTATION
**Generated:** 2026-01-19

---

## The Task

Eliminate 85+ lines of verbatim duplication in tool metadata by extracting 8 identical tool definitions into a single `toolMetadata` object, then deriving both `legacyTools` (23 tools) and `smartTools` (18 tools) arrays from it.

---

## Planning Deliverables

### 📋 EVALUATION-20260119.md
**Current state analysis and confidence assessment**
- Current tool definition structure (legacyTools vs smartTools)
- Duplication analysis (172 identical lines identified)
- Clear technical path forward
- **Verdict: CONTINUE** - HIGH confidence, no unknowns

### 📋 SPRINT-20260119-consolidate-defs-PLAN.md
**Detailed work breakdown and acceptance criteria**
- 4 phased work items with detailed technical notes
- Phase 1: Extract `toolMetadata` object (25 min)
- Phase 2: Refactor `legacyTools` array (15 min)
- Phase 3: Refactor `smartTools` array (15 min)
- Phase 4: Verify build and test (20 min)
- **Total effort: 90 minutes**

### 📋 SPRINT-20260119-consolidate-defs-DOD.md
**Definition of Done - 40 testable acceptance criteria**
- Phase 1 acceptance (5 criteria): Metadata extraction complete
- Phase 2 acceptance (5 criteria): Legacy array refactored
- Phase 3 acceptance (5 criteria): Smart array refactored
- Phase 4 acceptance (5 criteria): Overall verification
- Optional Phase 5 (4 criteria): Runtime testing
- **Sign-off**: ALL criteria must pass

### 📋 SPRINT-20260119-consolidate-defs-CONTEXT.md
**Implementation context and technical guidance**
- Background: Why this work exists
- Architecture overview: Current structure and solution
- Code examples: Before/after for each tool type
- Verification plan: Automated and manual testing
- Common pitfalls: What NOT to do
- **Ready to implement**: YES

---

## What Gets Built

### Before (Current)

```typescript
const legacyTools: Tool[] = [
  // 23 tools, including...
  { name: 'query_elements', description: '...', inputSchema: {...} },  // 35 lines
  { name: 'click_element', description: '...', inputSchema: {...} },   // 30 lines
  // ... etc (484 lines total)
];

const smartTools: Tool[] = [
  // 18 tools, including...
  { name: 'query_elements', description: '...', inputSchema: {...} },  // 35 lines IDENTICAL
  { name: 'click_element', description: '...', inputSchema: {...} },   // 30 lines IDENTICAL
  // ... etc (430 lines total)
];
```

### After (Consolidated)

```typescript
const toolMetadata = {
  dom: {
    queryElements: {
      description: '...',
      inputSchema: {...}
    },
    clickElement: { ... },
    fillElement: { ... },
    navigate: { ... },
    getConsoleLogs: { ... },
  },
  connection: {
    chromeListConnections: { ... },
    chromeSwitchConnection: { ... },
    chromeDisconnect: { ... },
  },
};

const legacyTools: Tool[] = [
  // 23 tools, including...
  { name: 'query_elements', ...toolMetadata.dom.queryElements },  // 1 line!
  { name: 'click_element', ...toolMetadata.dom.clickElement },    // 1 line!
  // ... etc (reduced from 484 lines)
];

const smartTools: Tool[] = [
  // 18 tools, including...
  { name: 'query_elements', ...toolMetadata.dom.queryElements },  // 1 line!
  { name: 'click_element', ...toolMetadata.dom.clickElement },    // 1 line!
  // ... etc (reduced from 430 lines)
];
```

**Impact:**
- Eliminates ~85 lines of duplication
- Single source of truth for shared tool metadata
- Easier to maintain and update

---

## Files in This Plan

```
.agent_planning/consolidate-tool-defs/
├── EVALUATION-20260119.md                    # Current state analysis
├── SPRINT-20260119-consolidate-defs-PLAN.md # Detailed work breakdown
├── SPRINT-20260119-consolidate-defs-DOD.md  # Acceptance criteria (40 items)
├── SPRINT-20260119-consolidate-defs-CONTEXT.md  # Implementation guide
└── PLAN-SUMMARY.md                          # This file
```

---

## Quick Reference

### Confidence Level: HIGH

✅ Problem is clear: 172 lines of verbatim duplication
✅ Solution is clear: Extract metadata, reference from arrays
✅ Technical path is clear: Straightforward refactoring
✅ No unknowns: All details predetermined
✅ Easy to verify: Build succeeds, tool counts match

### Acceptance Criteria (Summary)

- ✅ `toolMetadata` created with 8 shared tools
- ✅ `legacyTools` refactored (23 tools, all with correct names)
- ✅ `smartTools` refactored (18 tools, all with correct names)
- ✅ Build succeeds: `npm run build` → 0 errors
- ✅ Diff shows ONLY structural changes (no content changes)
- ✅ Optional: Both modes work in MCP Inspector

### What Changed vs What Didn't

**Changed:**
- src/index.ts: Tool definitions refactored

**Unchanged:**
- Tool implementations (src/tools/)
- Router logic (CallToolRequestSchema handler)
- Tool functionality or behavior
- Any descriptions or content

---

## Implementation Checklist

After implementing, verify:

- [ ] Line 1: `const toolMetadata = { ... }` created
- [ ] Line X: `legacyTools` uses metadata references
- [ ] Line X: `smartTools` uses metadata references
- [ ] Command: `npm run build` succeeds (0 errors)
- [ ] Count: `legacyTools.length === 23`
- [ ] Count: `smartTools.length === 18`
- [ ] Diff: Shows only refactoring (no content changes)
- [ ] Test: Both modes work in MCP Inspector (optional)

---

## Next Steps

### To Begin Implementation

1. **Read CONTEXT.md** - Understand the architecture and code examples
2. **Follow PLAN.md** - Execute the 4 work phases in order
3. **Check PLAN.md DoD** - Verify each phase meets acceptance criteria
4. **Reference EVALUATION.md** - If questions arise about why this design

### Success Looks Like

```bash
$ npm run build
# ✅ No errors, no warnings

$ node -e "const m = require('./build/src/index.js'); console.log('Legacy:', m.legacyTools.length, 'Smart:', m.smartTools.length)"
# Legacy: 23 Smart: 18

$ git diff src/index.ts | head -50
# Shows toolMetadata extracted, arrays refactored, no content changes
```

---

## Risk Assessment

| Risk | Likelihood | Mitigation |
|------|------------|-----------|
| Accidentally remove tool | Low | Diff before commit, count verification |
| Break tool schema | Low | Spread operator preserves structure |
| TypeScript errors | Low | Build verification before commit |
| Tool name mismatch | Low | Code review: name property vs metadata key |

---

## Estimated Effort

| Phase | Effort |
|-------|--------|
| Extract metadata | 25 min |
| Refactor legacyTools | 15 min |
| Refactor smartTools | 15 min |
| Build & verify | 20 min |
| **Total** | **75 min** |

---

## Related Documents

- **Audit Report**: `.agent_planning/AUDIT-REPORT-20260119.md` - Finding 1.1
- **Deferred Work**: `.agent_planning/DEFERRED-WORK-AUDIT-20260119.md` - Item 1

---

## Sign-Off

**This plan is ready for implementation when:**

✅ All 4 planning documents reviewed
✅ Confidence is HIGH (no unknowns)
✅ Acceptance criteria understood
✅ No questions about approach

**User Approval Needed:** YES - Please review and approve before implementation

---

**Sprint:** SPRINT-20260119-consolidate-defs
**Confidence:** HIGH ✅
**Status:** READY FOR IMPLEMENTATION
**Generated:** 2026-01-19 by audit-master + plan-skill

For detailed information, see individual planning documents in this directory.
