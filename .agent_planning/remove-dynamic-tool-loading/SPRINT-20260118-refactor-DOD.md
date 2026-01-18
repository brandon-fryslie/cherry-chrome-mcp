# Definition of Done: Remove Dynamic Tool Loading

**Sprint:** Remove Dynamic Tool Loading
**Generated:** 2026-01-18

## Code Changes

### Environment Variable

- [ ] `USE_SMART_TOOLS` renamed to `USE_LEGACY_TOOLS` in `src/config.ts`
- [ ] Default value is `false` (enables smart tools by default)
- [ ] JSDoc comment updated to reflect new naming and inverted logic
- [ ] All references updated in `src/index.ts`

### Dynamic Visibility Removal

- [ ] `getVisibleSmartTools()` function deleted from `src/index.ts`
- [ ] `ListToolsRequestSchema` handler simplified (no conditionals)
- [ ] Handler returns `activeTools` directly without filtering

### BrowserManager Cleanup

- [ ] `hiddenTools` property removed from BrowserManager class
- [ ] `toolListChangedCallback` property removed from BrowserManager class
- [ ] `setToolListChangedCallback()` method removed
- [ ] `notifyToolListChanged()` method removed
- [ ] `isToolHidden()` method removed (if exists)
- [ ] `hideTools()` method removed (if exists)
- [ ] `showTools()` method removed (if exists)
- [ ] All calls to `notifyToolListChanged()` removed from BrowserManager

### Index.ts Cleanup

- [ ] Callback registration block removed from `main()` function
- [ ] `hide_tools` import removed
- [ ] `show_tools` import removed
- [ ] `hide_tools` tool definition removed from `smartTools` array
- [ ] `show_tools` tool definition removed from `smartTools` array
- [ ] `hide_tools` case handler removed from smart tools switch
- [ ] `show_tools` case handler removed from smart tools switch
- [ ] Logic inverted in all conditionals (`USE_LEGACY_TOOLS` instead of `USE_SMART_TOOLS`)
- [ ] Mode display message updated in `main()` function

### Tool Implementations

- [ ] `hideTools()` implementation removed from `src/tools/chrome.ts` (or similar)
- [ ] `showTools()` implementation removed from `src/tools/chrome.ts` (or similar)
- [ ] No tool implementations reference removed infrastructure

## Documentation

- [ ] `FEATURE-TOGGLE.md` updated:
  - [ ] Variable name changed throughout
  - [ ] Mode descriptions updated (smart tools are default)
  - [ ] Examples updated with new variable name
  - [ ] Dynamic visibility sections removed
  - [ ] `hide_tools`/`show_tools` removed from tool comparison table
  - [ ] Tool counts updated (smart: 16, legacy: 23)

- [ ] `CLAUDE.md` updated:
  - [ ] Variable name changed
  - [ ] Feature toggle section updated
  - [ ] Testing commands updated
  - [ ] Tool counts updated

- [ ] `README.md` updated (if applicable):
  - [ ] Variable references updated
  - [ ] Examples updated

## Testing

### Manual Testing

- [ ] Legacy mode starts successfully:
  ```bash
  USE_LEGACY_TOOLS=true npm start
  ```

- [ ] Legacy mode shows 23 tools

- [ ] Legacy mode tools execute correctly (spot check):
  - [ ] `chrome_connect` works
  - [ ] `debugger_enable` works
  - [ ] `debugger_step_over` works

- [ ] Smart mode starts successfully (default):
  ```bash
  npm start
  ```

- [ ] Smart mode shows 16 tools (not 18)

- [ ] Smart mode tools execute correctly (spot check):
  - [ ] `chrome` with action="connect" works
  - [ ] `enable_debug_tools` works
  - [ ] `step` with direction="over" works

- [ ] No dynamic filtering occurs:
  - [ ] All 16 smart tools visible before connecting
  - [ ] All 16 smart tools visible after connecting
  - [ ] All 16 smart tools visible after enabling debugger
  - [ ] All 16 smart tools visible when paused

### Automated Testing

- [ ] `npm test` passes all tests

- [ ] `npm run build` completes without errors

- [ ] `./test-toggle.sh` passes (after updating script)

### Integration Testing

- [ ] MCP Inspector works in legacy mode:
  ```bash
  USE_LEGACY_TOOLS=true npx @modelcontextprotocol/inspector node build/src/index.js
  ```

- [ ] MCP Inspector works in smart mode:
  ```bash
  npx @modelcontextprotocol/inspector node build/src/index.js
  ```

- [ ] Tool lists remain static (no changes during connection lifecycle)

## Quality Checks

### Code Quality

- [ ] No TypeScript compilation errors
- [ ] No ESLint warnings (if configured)
- [ ] No unused imports
- [ ] No commented-out code left behind
- [ ] No TODO comments referencing removed features

### Architecture

- [ ] BrowserManager has no references to tool visibility
- [ ] No conditional tool registration logic remains
- [ ] Tool arrays are statically defined
- [ ] Single source of truth for environment variable

### Console Output

- [ ] No errors logged to stderr during startup
- [ ] No warnings about missing tools
- [ ] Mode display message shows correct mode
- [ ] Mode display message shows correct variable name

## Verification

### Grep Checks (No Matches Expected)

```bash
# Should find no matches in src/
grep -r "USE_SMART_TOOLS" src/

# Should find no matches
grep -r "getVisibleSmartTools" src/

# Should find no matches
grep -r "toolListChangedCallback" src/

# Should find no matches
grep -r "hiddenTools" src/

# Should find no matches
grep -r "hideTools\|showTools" src/

# Should find no matches
grep -r "notifyToolListChanged" src/

# Should find no matches
grep -r "isToolHidden" src/
```

### Positive Checks (Should Find Matches)

```bash
# Should find references in config.ts and index.ts
grep -r "USE_LEGACY_TOOLS" src/

# Should find one simple handler
grep -A 3 "ListToolsRequestSchema" src/index.ts
# Expected: return { tools: activeTools };
```

## Documentation Verification

- [ ] No references to `USE_SMART_TOOLS` in markdown files:
  ```bash
  grep -r "USE_SMART_TOOLS" *.md
  ```

- [ ] All examples use `USE_LEGACY_TOOLS`:
  ```bash
  grep -r "USE_LEGACY_TOOLS" *.md
  ```

- [ ] Tool counts are accurate in docs (16 smart, 23 legacy)

## Git

- [ ] Changes committed with descriptive message
- [ ] Commit message explains breaking change
- [ ] Commit message includes migration instructions

**Suggested Commit Message:**
```
refactor: remove dynamic tool loading, rename USE_SMART_TOOLS to USE_LEGACY_TOOLS

BREAKING CHANGE: Environment variable renamed

- Renamed USE_SMART_TOOLS to USE_LEGACY_TOOLS with inverted logic
- Smart tools are now the default (USE_LEGACY_TOOLS=false or unset)
- Removed dynamic tool visibility filtering (all tools always visible)
- Removed hide_tools and show_tools from smart mode
- Removed BrowserManager callback infrastructure

Migration:
- If you were using USE_SMART_TOOLS=true, remove it (smart is now default)
- If you want legacy tools, set USE_LEGACY_TOOLS=true
- hide_tools and show_tools are no longer available

Smart tools reduced from 18 to 16 tools (removed hide/show_tools).
Legacy tools unchanged at 23 tools.
```

## Sign-off

- [ ] All acceptance criteria met
- [ ] All tests passing
- [ ] Documentation updated
- [ ] No regressions identified
- [ ] Ready for production use
