# Consolidate Tool Definitions - Sprint Planning

**Status:** ✅ Ready for Implementation
**Confidence:** HIGH
**Effort:** ~90 minutes
**Priority:** P1 (Critical - Duplication Reduction)

---

## What Is This?

Complete sprint plan for consolidating duplicated tool definitions in Cherry Chrome MCP.

**Problem:** 8 tool definitions are identical in both `legacyTools` and `smartTools` arrays (~172 lines of verbatim repetition).

**Solution:** Extract shared metadata into single object, derive arrays from it.

**Result:** Eliminates 85+ lines of duplication, single source of truth for tool definitions.

---

## Planning Documents

Read in this order:

### 1. 📋 PLAN-SUMMARY.md (Start Here!)
**Quick overview of what's being built**
- The task in one page
- Before/after comparison
- Checklist for implementation
- Risk assessment

### 2. 📋 EVALUATION-20260119.md
**Current state analysis**
- What duplication was found
- Why it's a problem
- Confidence assessment: HIGH ✅
- No unknowns remaining

### 3. 📋 SPRINT-20260119-consolidate-defs-PLAN.md
**Detailed work breakdown**
- 4 phased work items
- Technical notes for each phase
- Acceptance criteria per phase
- Verification steps

### 4. 📋 SPRINT-20260119-consolidate-defs-DOD.md
**Definition of Done**
- 40 testable acceptance criteria
- What success looks like
- Sign-off checklist
- Testing strategy

### 5. 📋 SPRINT-20260119-consolidate-defs-CONTEXT.md
**Implementation context and code examples**
- Architecture overview
- Code before/after examples
- Common pitfalls to avoid
- Implementation steps with examples

---

## Quick Start

### To implement:

```bash
# 1. Read PLAN-SUMMARY.md to understand what's being built
cat PLAN-SUMMARY.md

# 2. Read CONTEXT.md for code examples
cat SPRINT-20260119-consolidate-defs-CONTEXT.md

# 3. Follow PLAN.md to execute the 4 work phases
cat SPRINT-20260119-consolidate-defs-PLAN.md

# 4. Use DOD.md as acceptance criteria checklist
cat SPRINT-20260119-consolidate-defs-DOD.md
```

### To verify success:

```bash
npm run build  # Should succeed with 0 errors
node -e "const m = require('./build/src/index.js'); console.log('Legacy:', m.legacyTools.length, 'Smart:', m.smartTools.length)"
# Should output: Legacy: 23 Smart: 18
```

---

## Key Facts

| Aspect | Details |
|--------|---------|
| **File to modify** | `src/index.ts` (only file changed) |
| **Lines of duplication** | 172 lines (8 tools × ~22 lines each) |
| **Tools affected** | query_elements, click_element, fill_element, navigate, get_console_logs, chrome_list_connections, chrome_switch_connection, chrome_disconnect |
| **Tool count after** | legacyTools: 23 (unchanged), smartTools: 18 (unchanged) |
| **Effort estimate** | 90 minutes |
| **Confidence** | HIGH ✅ |
| **Risk level** | LOW - Single file, reversible, straightforward |

---

## Deliverables After Implementation

✅ `toolMetadata` object created (lines ~72-150)
✅ `legacyTools` refactored (23 tools, metadata references)
✅ `smartTools` refactored (18 tools, metadata references)
✅ Build succeeds: `npm run build` → 0 errors
✅ Tool counts verified: 23 and 18
✅ No content changes (descriptions identical)

---

## Files Structure

```
.agent_planning/consolidate-tool-defs/
├── README.md (this file)
├── PLAN-SUMMARY.md
├── EVALUATION-20260119.md
├── SPRINT-20260119-consolidate-defs-PLAN.md
├── SPRINT-20260119-consolidate-defs-DOD.md
└── SPRINT-20260119-consolidate-defs-CONTEXT.md
```

---

## Execution Plan

1. **Read** PLAN-SUMMARY.md
2. **Understand** architecture from CONTEXT.md
3. **Execute** work items from PLAN.md
4. **Verify** acceptance criteria from DOD.md
5. **Test** with MCP Inspector (optional)
6. **Commit** with message: "refactor: consolidate tool definitions"

---

## Approval Status

**Ready for implementation?** YES ✅

**Prerequisites met?**
- ✅ Problem identified and quantified
- ✅ Solution designed and validated
- ✅ Technical path clear (no unknowns)
- ✅ Acceptance criteria defined
- ✅ Risk assessment completed

---

## Success Criteria (Quick Reference)

- ✅ `npm run build` succeeds (0 errors)
- ✅ legacyTools.length === 23
- ✅ smartTools.length === 18
- ✅ git diff shows only refactoring
- ✅ MCP Inspector works in both modes

---

## Questions?

Refer to CONTEXT.md section "Questions & Clarifications" for common questions.

---

**Generated:** 2026-01-19
**Sprint:** SPRINT-20260119-consolidate-defs
**Confidence:** HIGH ✅
**Status:** READY FOR IMPLEMENTATION

Start with PLAN-SUMMARY.md →
