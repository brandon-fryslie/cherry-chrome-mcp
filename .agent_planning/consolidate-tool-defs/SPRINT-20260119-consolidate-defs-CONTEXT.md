# Implementation Context - Consolidate Tool Definitions

**Sprint:** SPRINT-20260119-consolidate-defs
**Date:** 2026-01-19
**Confidence:** HIGH

---

## Background

### Why This Work?

**Audit Finding 1.1 - Duplication Problem**

During a comprehensive audit of duplication, architecture, and usability, we identified that tool definitions are duplicated across two arrays:

- `legacyTools` (23 tools, lines 72-555 in src/index.ts)
- `smartTools` (18 tools, lines 556-985 in src/index.ts)

**Problem:** 8 tools are defined identically in both arrays:
- DOM tools: query_elements, click_element, fill_element, navigate, get_console_logs
- Connection tools: chrome_list_connections, chrome_switch_connection, chrome_disconnect

**Impact:** ~172 lines of verbatim repetition creates maintenance burden:
- Bug fix in one array must be duplicated in the other
- Changes to descriptions must happen in two places
- Risk of divergence (accidentally different descriptions)

### Architecture Context

The project uses a **feature toggle pattern** via `USE_LEGACY_TOOLS` environment variable:

```
USE_LEGACY_TOOLS=false (default) → smartTools (18 consolidated tools)
USE_LEGACY_TOOLS=true → legacyTools (23 granular tools)
```

Both modes are actively maintained. Tool definitions must exist in both modes.

---

## Technical Architecture

### Current Structure

```typescript
// src/index.ts (line 72-985)

const legacyTools: Tool[] = [
  // Chrome Connection Management (7 tools)
  { name: 'chrome_connect', description: '...', inputSchema: {...} },
  { name: 'chrome_launch', description: '...', inputSchema: {...} },
  { name: 'chrome_list_connections', description: '...', inputSchema: {...} },
  { name: 'chrome_switch_connection', description: '...', inputSchema: {...} },
  { name: 'chrome_disconnect', description: '...', inputSchema: {...} },
  { name: 'list_targets', description: '...', inputSchema: {...} },
  { name: 'switch_target', description: '...', inputSchema: {...} },

  // DOM Tools (5 tools) - IDENTICAL IN SMART MODE
  { name: 'query_elements', description: '...', inputSchema: {...} },
  { name: 'click_element', description: '...', inputSchema: {...} },
  { name: 'fill_element', description: '...', inputSchema: {...} },
  { name: 'navigate', description: '...', inputSchema: {...} },
  { name: 'get_console_logs', description: '...', inputSchema: {...} },

  // Debugger Tools (11 tools)
  { name: 'debugger_enable', description: '...', inputSchema: {...} },
  // ... more debugger tools
];

const smartTools: Tool[] = [
  // Chrome Connection Management (consolidated, 5 tools)
  { name: 'chrome', description: '...', inputSchema: {...} },
  { name: 'chrome_list_connections', description: '...', inputSchema: {...} },  // IDENTICAL
  { name: 'chrome_switch_connection', description: '...', inputSchema: {...} },  // IDENTICAL
  { name: 'chrome_disconnect', description: '...', inputSchema: {...} },         // IDENTICAL
  { name: 'target', description: '...', inputSchema: {...} },

  // DOM Tools (5 tools) - IDENTICAL IN LEGACY MODE
  { name: 'query_elements', description: '...', inputSchema: {...} },
  { name: 'click_element', description: '...', inputSchema: {...} },
  { name: 'fill_element', description: '...', inputSchema: {...} },
  { name: 'navigate', description: '...', inputSchema: {...} },
  { name: 'get_console_logs', description: '...', inputSchema: {...} },

  // Debugger Tools (consolidated, 7 tools)
  { name: 'enable_debug_tools', description: '...', inputSchema: {...} },
  // ... more consolidated debugger tools
];

const activeTools = USE_LEGACY_TOOLS ? legacyTools : smartTools;
```

### Solution: Extract Metadata

Replace verbatim definitions with metadata references:

```typescript
// STEP 1: Define shared metadata ONCE
const toolMetadata = {
  dom: {
    queryElements: {
      description: 'Find elements by CSS selector...',
      inputSchema: { ... }
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

// STEP 2: Use metadata in legacyTools
const legacyTools: Tool[] = [
  { name: 'chrome_connect', description: '...', inputSchema: {...} },
  { name: 'chrome_launch', description: '...', inputSchema: {...} },
  { name: 'query_elements', ...toolMetadata.dom.queryElements },  // ← Reference
  { name: 'click_element', ...toolMetadata.dom.clickElement },    // ← Reference
  // ... etc
];

// STEP 3: Use metadata in smartTools
const smartTools: Tool[] = [
  { name: 'chrome', description: '...', inputSchema: {...} },
  { name: 'query_elements', ...toolMetadata.dom.queryElements },  // ← Reference
  { name: 'click_element', ...toolMetadata.dom.clickElement },    // ← Reference
  // ... etc
];
```

**Benefits:**
- Single source of truth for shared tool metadata
- Fix a description once, affects both modes
- Eliminates ~172 lines of duplication
- Easier to maintain consistency

---

## File Structure

### Primary File

**`src/index.ts`** (1186 lines total)

Key sections:
- Lines 1-71: Imports and config
- Lines 72-555: `legacyTools` array (484 lines)
- Lines 556-985: `smartTools` array (430 lines)
- Lines 986-1000: Tool selection and registration
- Lines 1001+: Server handler and main()

### Related Files (No changes needed)

- `src/tools/index.ts` - Tool implementations (unchanged)
- `src/tools/chrome.ts` - Connection tools (unchanged)
- `src/tools/dom.ts` - DOM tools (unchanged)
- `src/tools/context.ts` - Context/debugger tools (unchanged)
- `src/browser.ts` - BrowserManager (unchanged)

---

## Implementation Steps

### Step 1: Organize Shared Tools

Identify the 8 tools that are identical in both modes:

**DOM Tools (5):**
- query_elements
- click_element
- fill_element
- navigate
- get_console_logs

**Connection Tools (3):**
- chrome_list_connections
- chrome_switch_connection
- chrome_disconnect

### Step 2: Extract Metadata

Create `const toolMetadata` object with these tools organized by category.

Key points:
- Use camelCase for metadata keys (queryElements, not query_elements)
- Tool name property stays as 'query_elements' (MCP requirement)
- Preserve all descriptions and schemas verbatim
- No modifications to content

### Step 3: Refactor Arrays

Update `legacyTools` and `smartTools` to reference metadata:

```typescript
// Before:
{
  name: 'query_elements',
  description: 'Find elements by CSS selector...',
  inputSchema: { ... }
}

// After:
{
  name: 'query_elements',
  ...toolMetadata.dom.queryElements
}
```

### Step 4: Verify

- Build succeeds: `npm run build`
- Tool counts unchanged: legacy=23, smart=18
- No TypeScript errors
- Diff shows only structural changes

---

## Code Examples

### Example 1: Extracting query_elements

**Current (duplicated):**
```typescript
{
  name: 'query_elements',
  description: 'Find elements by CSS selector. Returns tag, text, id, classes, visibility. Returns up to limit elements (default 5, max 20).',
  inputSchema: {
    type: 'object',
    properties: {
      selector: {
        type: 'string',
        description: 'CSS selector to query (e.g., ".class", "#id", "button")',
      },
      limit: {
        type: 'number',
        description: 'Maximum number of elements to return',
        default: 5,
      },
      text_contains: {
        type: 'string',
        description: 'Filter to elements containing this text (case-insensitive partial match)',
      },
      include_hidden: {
        type: 'boolean',
        description: 'Include hidden elements (display:none, visibility:hidden, zero size). Default: false (visible only)',
        default: false,
      },
      connection_id: {
        type: 'string',
        description: 'Chrome connection to use (uses active if not specified)',
      },
    },
    required: ['selector'],
  },
}

// ... same thing again in smartTools ...
```

**After extraction:**
```typescript
// In toolMetadata
const toolMetadata = {
  dom: {
    queryElements: {
      description: 'Find elements by CSS selector. Returns tag, text, id, classes, visibility. Returns up to limit elements (default 5, max 20).',
      inputSchema: {
        type: 'object',
        properties: {
          selector: { ... },
          limit: { ... },
          text_contains: { ... },
          include_hidden: { ... },
          connection_id: { ... },
        },
        required: ['selector'],
      },
    },
    // ... other DOM tools ...
  },
};

// In legacyTools
{ name: 'query_elements', ...toolMetadata.dom.queryElements }

// In smartTools
{ name: 'query_elements', ...toolMetadata.dom.queryElements }
```

### Example 2: Connection Tools

**Metadata organization:**
```typescript
const toolMetadata = {
  connection: {
    chromeListConnections: {
      description: 'List all active Chrome connections...',
      inputSchema: { type: 'object', properties: {} },
    },
    chromeSwitchConnection: {
      description: 'Switch the active Chrome connection...',
      inputSchema: {
        type: 'object',
        properties: {
          connection_id: { type: 'string', description: 'ID of the connection to make active' },
        },
        required: ['connection_id'],
      },
    },
    chromeDisconnect: {
      description: 'Disconnect from a specific Chrome instance...',
      inputSchema: {
        type: 'object',
        properties: {
          connection_id: { type: 'string', description: 'ID of the connection to disconnect' },
        },
        required: ['connection_id'],
      },
    },
  },
};
```

---

## Verification Plan

### Build Verification

```bash
# Step 1: Build
npm run build

# Expected output:
# - No TypeScript errors
# - No warnings
# - Exit code 0
```

### Count Verification

```bash
# Step 2: Verify tool counts
node -e "
  const m = require('./build/src/index.js');
  const legacy = m.legacyTools;
  const smart = m.smartTools;
  console.log('Legacy tools:', legacy.length, '(expected 23)');
  console.log('Smart tools:', smart.length, '(expected 18)');

  // Spot check query_elements
  const legacyQE = legacy.find(t => t.name === 'query_elements');
  const smartQE = smart.find(t => t.name === 'query_elements');
  console.log('query_elements in legacy:', legacyQE ? 'YES' : 'NO');
  console.log('query_elements in smart:', smartQE ? 'YES' : 'NO');
"
```

### Diff Verification

```bash
# Step 3: Visual inspection
git diff src/index.ts

# Expected changes:
# - New toolMetadata object added
# - legacyTools with metadata references
# - smartTools with metadata references
# - No content changes (descriptions identical)
# - No tool removals
# - No tool additions
```

### Runtime Verification (Optional)

```bash
# Test smart mode
npx @modelcontextprotocol/inspector node build/src/index.js

# In Inspector:
# 1. "List tools" → verify 18 tools
# 2. Call query_elements → verify works
# 3. Exit

# Test legacy mode
USE_LEGACY_TOOLS=true npx @modelcontextprotocol/inspector node build/src/index.js

# In Inspector:
# 1. "List tools" → verify 23 tools
# 2. Call query_elements → verify works (same result as smart mode)
# 3. Exit
```

---

## Key Constraints

### Must Preserve

✅ All tool descriptions (verbatim, no changes)
✅ All tool names (query_elements, not queryElements, in MCP layer)
✅ All inputSchema structures
✅ All parameter defaults (limit: 5, include_hidden: false)
✅ All required field lists
✅ Tool order (for easy diffing)
✅ Total tool count per mode

### Must NOT Change

❌ Tool implementations (in src/tools/)
❌ Router logic (in CallToolRequestSchema handler)
❌ Tool behavior or functionality
❌ Any descriptions or content
❌ activeTools selection logic

---

## Common Pitfalls

### Pitfall 1: Forgetting Spread Operator

**Wrong:**
```typescript
{ name: 'query_elements', toolMetadata.dom.queryElements }  // Missing ...
```

**Right:**
```typescript
{ name: 'query_elements', ...toolMetadata.dom.queryElements }  // Spread operator
```

### Pitfall 2: Using Wrong Case for Metadata Key

**Wrong:**
```typescript
{ name: 'query_elements', ...toolMetadata.dom.query_elements }  // snake_case
```

**Right:**
```typescript
{ name: 'query_elements', ...toolMetadata.dom.queryElements }  // camelCase
```

### Pitfall 3: Modifying Content

**Wrong:**
```typescript
queryElements: {
  description: 'Find elements (improved version)',  // Changed!
  // ...
}
```

**Right:**
```typescript
queryElements: {
  description: 'Find elements by CSS selector. Returns tag, text, id, classes, visibility. Returns up to limit elements (default 5, max 20).',  // Exact copy
  // ...
}
```

### Pitfall 4: Forgetting Tool Name Property

**Wrong:**
```typescript
...toolMetadata.dom.queryElements  // No name property!
```

**Right:**
```typescript
{ name: 'query_elements', ...toolMetadata.dom.queryElements }  // Name included
```

---

## Estimated Timeline

| Task | Time | Cumulative |
|------|------|-----------|
| Review current structure | 5 min | 5 min |
| Extract toolMetadata | 20 min | 25 min |
| Refactor legacyTools | 15 min | 40 min |
| Refactor smartTools | 15 min | 55 min |
| Build and verify | 15 min | 70 min |
| Testing (optional) | 15 min | 85 min |

---

## Success Indicators

✅ **You know you're done when:**

1. `npm run build` succeeds with zero errors
2. Both arrays still have correct tool count (23 and 18)
3. All tool names are present and correct
4. git diff shows ONLY structural refactoring (no content changes)
5. Tools work identically in both modes
6. No TypeScript errors or warnings

---

## Questions & Clarifications

**Q: Can I reorganize tool order?**
A: You can, but it makes diffing harder. Keep order same for review.

**Q: What if a tool schema is very complex?**
A: Still extract it. The metadata object can handle any schema.

**Q: Do I need to test both modes?**
A: Smart mode testing is required. Legacy mode testing is optional but recommended.

**Q: What if I make a mistake?**
A: Simply `git checkout src/index.ts` to revert. All changes in one file.

---

**Sprint:** SPRINT-20260119-consolidate-defs
**Confidence:** HIGH
**Ready for Implementation:** YES
