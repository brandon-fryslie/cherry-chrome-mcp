# Evaluation: Remove Dynamic Tool Loading

**Topic:** Remove dynamic tool loading and rename USE_SMART_TOOLS to USE_LEGACY_TOOLS
**Generated:** 2026-01-18
**Status:** READY FOR PLANNING

## Current State

### What Exists

The codebase currently implements a feature toggle system with two modes:

1. **Legacy Mode (default):** 23 granular tools
   - Configured via `USE_SMART_TOOLS=false` (default)
   - Traditional tool names: `chrome_connect`, `debugger_enable`, etc.

2. **Smart Mode:** 18 consolidated tools
   - Configured via `USE_SMART_TOOLS=true`
   - Action-based tools: `chrome(action="connect")`, `step(direction="over")`, etc.
   - Includes dynamic tool visibility filtering based on connection state

### Dynamic Loading Mechanism

**Location:** `src/index.ts`

The dynamic loading occurs in two places:

1. **Tool Registration** (line 1018):
   ```typescript
   const activeTools = USE_SMART_TOOLS ? smartTools : legacyTools;
   ```

2. **Tool Visibility Filtering** (lines 1029-1089):
   ```typescript
   function getVisibleSmartTools(): Tool[] {
     // State-based filtering logic
     // Not connected -> only chrome, chrome_list_connections
     // Connected -> add DOM tools
     // Debug enabled -> add breakpoint, execution
     // Paused -> only step, execution, evaluate, call_stack
   }

   server.setRequestHandler(ListToolsRequestSchema, async () => {
     if (!USE_SMART_TOOLS) {
       return { tools: activeTools };
     }
     const visibleTools = getVisibleSmartTools();
     return { tools: visibleTools };
   });
   ```

3. **BrowserManager Integration** (`src/browser.ts`, lines 72-89):
   ```typescript
   private hiddenTools: Set<string> = new Set();
   private toolListChangedCallback: (() => void) | null = null;

   setToolListChangedCallback(callback: () => void): void { ... }
   notifyToolListChanged(): void { ... }
   ```

4. **Callback Registration** (`src/index.ts`, lines 1284-1299):
   ```typescript
   if (USE_SMART_TOOLS) {
     browserManager.setToolListChangedCallback(() => {
       // Sends notifications/tools/list_changed
     });
   }
   ```

### Tool Routing

Both modes use separate switch statements (lines 1096-1265):
- Smart tools: lines 1098-1166
- Legacy tools: lines 1167-1264

All tool implementations exist in `src/tools/` and are imported at the top.

## What's Missing

Currently, the system works but has complexity:
- **Dynamic visibility filtering** - Tools appear/disappear based on state
- **Callback mechanism** - BrowserManager notifies index.ts of state changes
- **Conditional logic** - Multiple `if (USE_SMART_TOOLS)` checks throughout
- **Inverted naming** - `USE_SMART_TOOLS=true` enables new tools, but user wants the opposite

## What Needs Changes

### Files to Modify

1. **`src/config.ts`** (lines 47-64)
   - Rename `USE_SMART_TOOLS` → `USE_LEGACY_TOOLS`
   - Invert default: `false` (was implicitly false for smart tools)
   - Update documentation

2. **`src/index.ts`** (lines 18, 1018, 1029-1089, 1096-1166, 1284-1301)
   - Replace `USE_SMART_TOOLS` with `USE_LEGACY_TOOLS`
   - **Remove** `getVisibleSmartTools()` function entirely (lines 1029-1078)
   - **Simplify** `ListToolsRequestSchema` handler to always return full tool list
   - **Remove** callback registration logic (lines 1284-1299)
   - Invert conditional logic: `USE_LEGACY_TOOLS ? legacyTools : smartTools`

3. **`src/browser.ts`** (lines 71-89)
   - **Remove** `hiddenTools` Set (no longer needed)
   - **Remove** `toolListChangedCallback` (no longer needed)
   - **Remove** `setToolListChangedCallback()` method
   - **Remove** `notifyToolListChanged()` method
   - **Remove** `hideTools()`, `showTools()`, `isToolHidden()` methods (if they exist)

4. **`FEATURE-TOGGLE.md`**
   - Update all references: `USE_SMART_TOOLS` → `USE_LEGACY_TOOLS`
   - Update examples and usage instructions
   - Clarify that smart tools are now default

5. **`CLAUDE.md`**
   - Update project documentation
   - Update feature toggle description
   - Update testing commands

6. **`test-toggle.sh`** (if exists)
   - Update environment variable name
   - Update test assertions

7. **`README.md`** (if it mentions the toggle)
   - Update references to environment variable

### Architecture Changes

**Before:**
```
USE_SMART_TOOLS=false (default) → Legacy tools → All 23 tools shown always
USE_SMART_TOOLS=true → Smart tools → Dynamic filtering based on state
```

**After:**
```
USE_LEGACY_TOOLS=false (default) → Smart tools → All 18 tools shown always
USE_LEGACY_TOOLS=true → Legacy tools → All 23 tools shown always
```

**Key Difference:** No dynamic filtering in either mode. All tools are always visible.

### Code to Remove

1. **Dynamic visibility function** (`src/index.ts`, lines 1029-1078):
   - Entire `getVisibleSmartTools()` function

2. **Callback infrastructure** (`src/index.ts`, lines 1284-1299):
   - Tool list change callback registration

3. **BrowserManager state tracking** (`src/browser.ts`):
   - `hiddenTools` Set
   - `toolListChangedCallback`
   - All related methods

4. **Tool management tools** (`src/tools/chrome.ts` or similar):
   - `hideTools()` implementation
   - `showTools()` implementation
   - Related tool definitions from `smartTools` array

### Code to Add

None. This is purely a removal/simplification.

### Code to Change

1. **Variable rename** throughout codebase:
   ```typescript
   // Before
   USE_SMART_TOOLS

   // After
   USE_LEGACY_TOOLS
   ```

2. **Logic inversion**:
   ```typescript
   // Before
   const activeTools = USE_SMART_TOOLS ? smartTools : legacyTools;

   // After
   const activeTools = USE_LEGACY_TOOLS ? legacyTools : smartTools;
   ```

3. **Simplified tool list handler**:
   ```typescript
   // Before
   server.setRequestHandler(ListToolsRequestSchema, async () => {
     if (!USE_SMART_TOOLS) {
       return { tools: activeTools };
     }
     const visibleTools = getVisibleSmartTools();
     return { tools: visibleTools };
   });

   // After
   server.setRequestHandler(ListToolsRequestSchema, async () => {
     return { tools: activeTools };
   });
   ```

4. **Simplified main()**:
   ```typescript
   // Before
   async function main() {
     const transport = new StdioServerTransport();
     await server.connect(transport);

     if (USE_SMART_TOOLS) {
       browserManager.setToolListChangedCallback(() => { ... });
     }

     const mode = USE_SMART_TOOLS ? 'SMART TOOLS' : 'LEGACY TOOLS';
     console.error(`Cherry Chrome MCP Server running on stdio [MODE: ${mode}]`);
   }

   // After
   async function main() {
     const transport = new StdioServerTransport();
     await server.connect(transport);

     const mode = USE_LEGACY_TOOLS ? 'LEGACY TOOLS' : 'SMART TOOLS';
     console.error(`Cherry Chrome MCP Server running on stdio [MODE: ${mode}]`);
     console.error(`Set USE_LEGACY_TOOLS=true to use original granular tools`);
   }
   ```

## Dependencies and Risks

### Dependencies
- None. This is an internal refactoring.

### Risks

1. **Breaking Change for Smart Tools Users**
   - **Risk:** Users currently using `USE_SMART_TOOLS=true` will lose dynamic visibility
   - **Mitigation:** Document that all tools are now always visible
   - **Impact:** Low - feature was experimental (P1 in docs)

2. **Breaking Change for Env Var**
   - **Risk:** Variable rename breaks existing configurations
   - **Mitigation:** Document migration in CHANGELOG
   - **Impact:** Medium - users must update configs, but docs will guide them

3. **Tool Overlap/Confusion**
   - **Risk:** Having all tools visible at once might be overwhelming
   - **Mitigation:** Trust MCP clients (like Claude) to handle tool selection intelligently
   - **Impact:** Low - clients are designed for large tool sets

4. **Regression in Functionality**
   - **Risk:** Removing hide_tools/show_tools removes functionality
   - **Mitigation:** These were experimental P1 features, not in core use
   - **Impact:** Low - minimal adoption expected

## Ambiguities and Unknowns

### Questions

1. **Should we remove `hide_tools` and `show_tools` tool implementations?**
   - They were only in smart mode
   - They depend on the dynamic visibility infrastructure
   - Removing them simplifies the codebase
   - **Recommendation:** YES, remove them

2. **Should we support backward compatibility for `USE_SMART_TOOLS`?**
   - Could check both env vars and log deprecation warning
   - Adds complexity we're trying to remove
   - **Recommendation:** NO, clean break with docs

3. **Should smart tools become the new default?**
   - User request implies smart tools are preferred
   - Setting `USE_LEGACY_TOOLS=false` as default makes smart tools default
   - **Recommendation:** YES, as requested

4. **Do any tests rely on dynamic visibility?**
   - Need to check test files for assertions about tool counts
   - **Action:** Search for tests before implementation

### Resolved Decisions

- **Default mode:** Smart tools (USE_LEGACY_TOOLS=false)
- **Dynamic loading:** Remove completely
- **Tool visibility:** All tools always visible
- **hide_tools/show_tools:** Remove from smart tools list

## Verdict

**CONTINUE** - This is a straightforward refactoring with clear requirements.

All questions can be answered during implementation or are low-risk decisions. No user input needed to proceed with planning.
