# Sprint: Remove Dynamic Tool Loading

**Generated:** 2026-01-18
**Confidence:** HIGH
**Status:** READY FOR IMPLEMENTATION

## Sprint Goal

Remove all dynamic tool loading code and rename `USE_SMART_TOOLS` to `USE_LEGACY_TOOLS` with inverted logic, making smart tools the default mode. All tools will be statically registered and always visible regardless of connection state.

## Scope

**Deliverables:**
1. Rename `USE_SMART_TOOLS` → `USE_LEGACY_TOOLS` with inverted default
2. Remove dynamic tool visibility filtering logic
3. Remove BrowserManager callback infrastructure
4. Remove `hide_tools` and `show_tools` from smart tools
5. Update all documentation to reflect changes

## Work Items

### P0: Rename Environment Variable and Invert Logic

**Files:** `src/config.ts`, `src/index.ts`

**Acceptance Criteria:**
- [ ] `USE_SMART_TOOLS` renamed to `USE_LEGACY_TOOLS` in `src/config.ts`
- [ ] Default value is `false` (smart tools enabled by default)
- [ ] All references in `src/index.ts` updated to `USE_LEGACY_TOOLS`
- [ ] Logic inverted: `USE_LEGACY_TOOLS ? legacyTools : smartTools`
- [ ] Conditional checks inverted throughout
- [ ] Server startup message shows correct mode

**Technical Notes:**
- In `src/config.ts` line 64: Change `USE_SMART_TOOLS` to `USE_LEGACY_TOOLS`
- Update comment block (lines 47-63) to reflect new naming
- In `src/index.ts` line 18: Update import
- In `src/index.ts` line 1018: Invert ternary operator
- In `src/index.ts` lines 1096, 1167: Invert conditionals in switch routing
- In `src/index.ts` lines 1284, 1301: Invert conditional for callback registration
- In `src/index.ts` line 1301: Update mode display string

### P0: Remove Dynamic Tool Visibility Function

**Files:** `src/index.ts`

**Acceptance Criteria:**
- [ ] `getVisibleSmartTools()` function removed (lines 1029-1078)
- [ ] `ListToolsRequestSchema` handler simplified to return `activeTools` directly
- [ ] No state-based tool filtering occurs
- [ ] All tools in selected mode are always visible

**Technical Notes:**
- Delete entire `getVisibleSmartTools()` function
- Replace handler implementation:
  ```typescript
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return { tools: activeTools };
  });
  ```

### P0: Remove BrowserManager Callback Infrastructure

**Files:** `src/browser.ts`, `src/index.ts`

**Acceptance Criteria:**
- [ ] `hiddenTools` Set removed from BrowserManager class
- [ ] `toolListChangedCallback` property removed
- [ ] `setToolListChangedCallback()` method removed
- [ ] `notifyToolListChanged()` method removed
- [ ] `isToolHidden()` method removed (if exists)
- [ ] Callback registration block removed from `main()` in `src/index.ts`

**Technical Notes:**
- In `src/browser.ts`:
  - Remove line 71: `private hiddenTools: Set<string> = new Set();`
  - Remove line 72: `private toolListChangedCallback: (() => void) | null = null;`
  - Remove lines 78-80: `setToolListChangedCallback()` method
  - Remove lines 85-89: `notifyToolListChanged()` method
  - Search for and remove any `hideTools()`, `showTools()`, `isToolHidden()` methods
  - Remove any calls to `notifyToolListChanged()` throughout the class

- In `src/index.ts`:
  - Remove lines 1284-1299: Callback registration in `main()`

### P0: Remove hide_tools and show_tools from Smart Tools

**Files:** `src/index.ts`, `src/tools/chrome.ts` (or wherever implemented)

**Acceptance Criteria:**
- [ ] `hide_tools` tool definition removed from `smartTools` array
- [ ] `show_tools` tool definition removed from `smartTools` array
- [ ] `hideTools` and `showTools` implementation functions removed
- [ ] Imports for these functions removed
- [ ] Switch case handlers removed from smart tools routing

**Technical Notes:**
- In `src/index.ts`:
  - Remove tool definitions from `smartTools` array (lines 978-1014)
  - Remove imports from `src/tools/index.js` (lines 33-34)
  - Remove case handlers from smart tools switch (lines 1158-1162)

- Search all tool files for implementation and remove:
  ```bash
  grep -r "hideTools\|showTools" src/tools/
  ```

### P1: Update Documentation

**Files:** `FEATURE-TOGGLE.md`, `CLAUDE.md`, `README.md` (if applicable)

**Acceptance Criteria:**
- [ ] `FEATURE-TOGGLE.md` updated with new variable name
- [ ] All examples show `USE_LEGACY_TOOLS` instead of `USE_SMART_TOOLS`
- [ ] Default mode documented as smart tools
- [ ] Dynamic visibility section removed
- [ ] `hide_tools`/`show_tools` removed from feature descriptions
- [ ] `CLAUDE.md` updated with new variable name
- [ ] Testing commands updated
- [ ] Configuration examples updated

**Technical Notes:**
- Update all instances of `USE_SMART_TOOLS` → `USE_LEGACY_TOOLS`
- Update mode descriptions:
  - "Legacy Mode: USE_LEGACY_TOOLS=true"
  - "Smart Mode (Default): USE_LEGACY_TOOLS=false or unset"
- Remove mentions of dynamic tool visibility
- Remove `hide_tools` and `show_tools` from tool comparison table
- Update tool counts: Smart tools now 16 (was 18)

### P1: Update Test Scripts

**Files:** `test-toggle.sh`, `package.json`

**Acceptance Criteria:**
- [ ] `test-toggle.sh` uses `USE_LEGACY_TOOLS` variable
- [ ] Test expectations updated for new tool counts
- [ ] Test output messages reference correct mode names
- [ ] `package.json` scripts updated if they reference the env var

**Technical Notes:**
- Search for any test scripts:
  ```bash
  find . -name "*.sh" -o -name "*.test.*" | xargs grep -l "USE_SMART_TOOLS"
  ```
- Update variable references
- Update assertions for tool counts (smart tools: 16, legacy tools: 23)

### P2: Verify No Breaking Changes in Tool Implementations

**Files:** All files in `src/tools/`

**Acceptance Criteria:**
- [ ] All legacy tool implementations unchanged
- [ ] All smart tool implementations unchanged (except removed hide/show)
- [ ] No tools depend on dynamic visibility state
- [ ] All tool routing logic still correct

**Technical Notes:**
- Review each tool file:
  - `src/tools/chrome.ts`
  - `src/tools/dom.ts`
  - `src/tools/debugger.ts`
- Verify no tools call `browserManager.notifyToolListChanged()`
- Verify no tools check `browserManager.isToolHidden()`

## Dependencies

- None - This is isolated refactoring work

## Risks

1. **Breaking Change for Existing Users**
   - **Risk:** Users with `USE_SMART_TOOLS=true` in configs must update
   - **Mitigation:** Document migration clearly in commit message and docs
   - **Severity:** Medium - affects early adopters only

2. **Regression in Tool Functionality**
   - **Risk:** Tool implementations might depend on removed infrastructure
   - **Mitigation:** Thorough testing after implementation
   - **Severity:** Low - evaluation shows clean separation

3. **Test Failures**
   - **Risk:** Tests might assert specific tool counts or visibility
   - **Mitigation:** Update tests as part of P1
   - **Severity:** Low - test suite should catch issues

## Testing Strategy

1. **Manual Testing:**
   - Start server in legacy mode: `USE_LEGACY_TOOLS=true npm start`
   - Verify 23 tools registered
   - Test tool execution in legacy mode
   - Start server in smart mode: `npm start` (default)
   - Verify 16 tools registered
   - Test tool execution in smart mode
   - Verify no dynamic filtering (all tools always visible)

2. **Automated Testing:**
   - Run existing test suite: `npm test`
   - Run toggle test script: `./test-toggle.sh` (after updating)

3. **Integration Testing:**
   - Test with MCP Inspector in both modes
   - Verify tool lists are static (don't change based on connection state)

## Success Criteria

- [ ] Server starts successfully in both modes
- [ ] Correct tool count in each mode (legacy: 23, smart: 16)
- [ ] All tools execute correctly in both modes
- [ ] No dynamic visibility behavior
- [ ] Documentation accurately reflects new behavior
- [ ] All tests pass
- [ ] No console errors or warnings

## Implementation Order

1. P0: Rename environment variable (isolated change)
2. P0: Remove dynamic visibility function (depends on #1)
3. P0: Remove callback infrastructure (depends on #2)
4. P0: Remove hide/show tools (can be parallel with #3)
5. P1: Update documentation (after all code changes)
6. P1: Update test scripts (after all code changes)
7. P2: Verify tool implementations (final validation)

## Rollback Plan

If issues arise:
1. Revert commit(s)
2. Restore `USE_SMART_TOOLS` variable
3. Restore dynamic visibility code
4. Keep smart tools as non-default experimental feature
