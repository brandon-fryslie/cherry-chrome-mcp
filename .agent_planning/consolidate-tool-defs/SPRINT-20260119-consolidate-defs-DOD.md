# Definition of Done - Consolidate Tool Definitions

**Sprint:** SPRINT-20260119-consolidate-defs
**Confidence:** HIGH
**Verification Date:** 2026-01-19

---

## Scope Definition

**In Scope:**
- Extract 8 identical tool definitions into `toolMetadata` object
- Refactor `legacyTools` array to reference metadata
- Refactor `smartTools` array to reference metadata
- Verify refactored code compiles and functions correctly

**Out of Scope:**
- Changes to tool implementations in `src/tools/`
- Changes to router logic in CallToolRequestSchema handler
- Changes to tool behavior or functionality
- Adding new tools or removing tools

---

## Acceptance Criteria

### Phase 1: Extract toolMetadata

**Criterion 1.1: toolMetadata object exists**
- [ ] File: `src/index.ts`
- [ ] New `const toolMetadata = { ... }` object created
- [ ] Located BEFORE `legacyTools` definition
- [ ] TypeScript type: Plain object (no special types needed)

**Criterion 1.2: All 8 shared tools extracted**
- [ ] queryElements ✓
- [ ] clickElement ✓
- [ ] fillElement ✓
- [ ] navigate ✓
- [ ] getConsoleLogs ✓
- [ ] chromeListConnections ✓
- [ ] chromeSwitchConnection ✓
- [ ] chromeDisconnect ✓

**Criterion 1.3: Metadata organized by category**
- [ ] DOM tools grouped under `toolMetadata.dom`
- [ ] Connection tools grouped under `toolMetadata.connection`
- [ ] Each category is an object with tool keys
- [ ] Clear comments explaining categories

**Criterion 1.4: Content preserved exactly**
- [ ] Descriptions copied verbatim from original
- [ ] inputSchema objects copied verbatim
- [ ] No text modifications (no typo fixes, no rewording)
- [ ] All parameter defaults preserved (limit: 5, include_hidden: false, etc.)
- [ ] All required fields preserved

**Criterion 1.5: No TypeScript errors**
- [ ] `npm run build` succeeds
- [ ] Zero TypeScript compilation errors
- [ ] Zero warnings in output

---

### Phase 2: Refactor legacyTools Array

**Criterion 2.1: legacyTools uses metadata references**
- [ ] All 8 identical tools reference `toolMetadata.xxx`
- [ ] Each uses spread operator: `...toolMetadata.xxx`
- [ ] Tool name property still present: `name: 'query_elements'`
- [ ] Original order preserved for easy diffing

**Criterion 2.2: Legacy-unique tools unchanged**
- [ ] chrome_connect: Original definition preserved ✓
- [ ] chrome_launch: Original definition preserved ✓
- [ ] list_targets: Original definition preserved ✓
- [ ] switch_target: Original definition preserved ✓
- [ ] All 11 debugger tools: Original definitions preserved ✓

**Criterion 2.3: Array completeness**
- [ ] Total tool count = 23 (unchanged)
- [ ] Each tool has: name, description, inputSchema
- [ ] No undefined or missing properties
- [ ] No extra properties added

**Criterion 2.4: Visual verification**
- [ ] Diff comparison: legacyTools structure identical to original
- [ ] Sample verification: query_elements looks correct
- [ ] Sample verification: chrome_connect looks correct
- [ ] No accidental deletions

**Criterion 2.5: Compilation succeeds**
- [ ] `npm run build` succeeds
- [ ] Zero TypeScript errors specific to legacyTools

---

### Phase 3: Refactor smartTools Array

**Criterion 3.1: smartTools uses metadata references**
- [ ] All 8 identical tools reference `toolMetadata.xxx`
- [ ] Each uses spread operator: `...toolMetadata.xxx`
- [ ] Tool name property still present
- [ ] Original order preserved for easy diffing

**Criterion 3.2: Smart-unique/consolidated tools unchanged**
- [ ] chrome (consolidated): Original definition preserved ✓
- [ ] target (consolidated): Original definition preserved ✓
- [ ] enable_debug_tools: Original definition preserved ✓
- [ ] breakpoint (consolidated): Original definition preserved ✓
- [ ] step (consolidated): Original definition preserved ✓
- [ ] execution (consolidated): Original definition preserved ✓
- [ ] call_stack: Original definition preserved ✓
- [ ] evaluate: Original definition preserved ✓
- [ ] pause_on_exceptions: Original definition preserved ✓

**Criterion 3.3: Array completeness**
- [ ] Total tool count = 18 (unchanged)
- [ ] Each tool has: name, description, inputSchema
- [ ] No undefined or missing properties
- [ ] No extra properties added

**Criterion 3.4: Visual verification**
- [ ] Diff comparison: smartTools structure identical to original
- [ ] Sample verification: query_elements looks correct
- [ ] Sample verification: chrome (consolidated) looks correct
- [ ] No accidental deletions

**Criterion 3.5: Compilation succeeds**
- [ ] `npm run build` succeeds
- [ ] Zero TypeScript errors specific to smartTools

---

### Phase 4: Overall Verification

**Criterion 4.1: Build succeeds**
- [ ] Command: `npm run build`
- [ ] Exit code: 0
- [ ] Output: Clean build with no errors
- [ ] Output: No warnings related to tool definitions

**Criterion 4.2: No TypeScript errors anywhere**
- [ ] `src/index.ts` compilation clean
- [ ] `src/tools/` files unaffected
- [ ] No red squiggles in IDE
- [ ] Type checking passes completely

**Criterion 4.3: activeTools selection still works**
- [ ] Line: `const activeTools = USE_LEGACY_TOOLS ? legacyTools : smartTools;`
- [ ] activeTools points to correct array based on env var
- [ ] No errors when activeTools is used

**Criterion 4.4: Diff shows only structural changes**
- [ ] No content changes (descriptions identical)
- [ ] No property additions
- [ ] No property removals
- [ ] Only changes are: metadata extraction + references
- [ ] Original behavior preserved 100%

**Criterion 4.5: Tool counts verified**
- [ ] Verify: legacyTools.length === 23
- [ ] Verify: smartTools.length === 18
- [ ] Verify: activeTools selection works correctly

---

### Optional Phase 5: Runtime Verification

**Criterion 5.1: Smart mode registration**
- [ ] Run: `npx @modelcontextprotocol/inspector node build/src/index.js`
- [ ] In Inspector: List tools
- [ ] Verify: 18 tools appear
- [ ] Verify: All expected tools present (chrome, query_elements, breakpoint, etc.)

**Criterion 5.2: Legacy mode registration**
- [ ] Run: `USE_LEGACY_TOOLS=true npx @modelcontextprotocol/inspector node build/src/index.js`
- [ ] In Inspector: List tools
- [ ] Verify: 23 tools appear
- [ ] Verify: All expected tools present (chrome_connect, query_elements, debugger_step_over, etc.)

**Criterion 5.3: Sample tool execution (Smart mode)**
- [ ] In Inspector: Call `query_elements` with `{ selector: 'button' }`
- [ ] Verify: Tool executes without error
- [ ] Verify: Result format is correct
- [ ] Verify: Description and parameters match metadata

**Criterion 5.4: Sample tool execution (Legacy mode)**
- [ ] Switch to legacy mode
- [ ] In Inspector: Call `query_elements` with `{ selector: 'button' }`
- [ ] Verify: Tool executes without error
- [ ] Verify: Result format identical to smart mode
- [ ] Verify: Description and parameters match metadata

---

## Testing Strategy

### Automated Testing

**Build Verification:**
```bash
npm run build 2>&1 | tee build.log
# Verify:
# - Exit code 0
# - No "error" in output
# - File count matches expected
```

**Tool Count Verification:**
```bash
node -e "
  const m = require('./build/src/index.js');
  console.log('Legacy:', m.legacyTools?.length);
  console.log('Smart:', m.smartTools?.length);
  console.log('Expected legacy: 23, smart: 18');
"
```

### Manual Testing

**Code Review Checklist:**
- [ ] toolMetadata object properly formatted
- [ ] All 8 tools present in metadata
- [ ] No verbatim tool definitions remain in legacyTools
- [ ] No verbatim tool definitions remain in smartTools
- [ ] All unique legacy tools present
- [ ] All unique smart tools present
- [ ] No missing tools in either array

**Diff Verification:**
```bash
# Compare with original (if available)
git diff src/index.ts
# Should show:
# - New toolMetadata object added
# - legacyTools refactored (metadata references)
# - smartTools refactored (metadata references)
# - No content changes
```

---

## Sign-Off Criteria

**Ready for sign-off when ALL of the following are true:**

1. ✅ toolMetadata extracted with all 8 tools
2. ✅ legacyTools refactored (23 tools, includes metadata refs)
3. ✅ smartTools refactored (18 tools, includes metadata refs)
4. ✅ npm run build succeeds (0 errors, 0 warnings)
5. ✅ Diff shows only structural changes (no content changes)
6. ✅ Tool counts verified: legacy=23, smart=18
7. ✅ All tool names present and correct
8. ✅ All inputSchemas intact
9. ✅ TypeScript compilation clean
10. ✅ (Optional) MCP Inspector verification passed

---

## Known Issues / Non-Issues

**Not an issue:**
- Tool order changes: Order can change as long as count stays same
- Whitespace changes: Acceptable if only structural change
- Comment additions: Acceptable for clarity

**Actual issues:**
- Tool descriptions changed: FAIL
- Tools removed: FAIL
- Tools added: FAIL (out of scope)
- TypeScript errors: FAIL
- Build fails: FAIL

---

## Completion Tracking

| Phase | Status | Notes |
|-------|--------|-------|
| Extract metadata | ⬜ | In progress... |
| Refactor legacy | ⬜ | Waiting for phase 1 |
| Refactor smart | ⬜ | Waiting for phase 2 |
| Verify & test | ⬜ | Waiting for phase 3 |
| Sign-off | ⬜ | Waiting for all phases |

---

## Rollback Plan

**If issues encountered:**

1. Keep original `src/index.ts` backed up
2. Can easily revert using: `git checkout src/index.ts`
3. All changes are localized to single file
4. No changes to implementations or router logic

---

## Questions for Clarification

None identified at this time. Requirements are clear and unambiguous.

---

**Generated:** 2026-01-19
**Sprint:** SPRINT-20260119-consolidate-defs
**Confidence:** HIGH
