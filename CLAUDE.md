# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Cherry Chrome MCP is a TypeScript MCP server for Chrome automation with CSS selector-based querying and full JavaScript debugger support. Ported from Python `chrome-debugger-mcp`.

**Key Features:**
- CSS selector-based DOM queries (not accessibility tree refs)
- Result limit controls (default 5 elements, max 20)
- Text and visibility filters for query_elements
- HTML snippets and structure summaries in query results
- Multi-instance Chrome connection support
- Full JavaScript debugger via CDP (breakpoints, stepping, evaluation)
- Smart result size analysis (rejects oversized results with suggestions)
- **Console log pattern compression** with similarity matching (see below)
- **Feature toggle:** Legacy vs Smart consolidated tools (see `FEATURE-TOGGLE.md`)

## Common Commands

```bash
npm run build        # Compile TypeScript
npm run dev          # Watch mode
npm test             # Build and run tests
npm start            # Build and start server
npm run clean        # Remove build directory
./test-toggle.sh     # Test feature toggle (legacy vs smart modes)
```

### Testing with MCP Inspector
```bash
# Smart mode (default)
npx @modelcontextprotocol/inspector node build/src/index.js

# Legacy mode
USE_LEGACY_TOOLS=true npx @modelcontextprotocol/inspector node build/src/index.js
```

### Testing with Claude Code
```bash
claude mcp add --scope project cherry-chrome -- node /absolute/path/to/build/src/index.js
```

## Feature Toggle: Legacy vs Smart Tools

The server supports two tool modes via `USE_LEGACY_TOOLS` environment variable:

- **Smart Mode (default):** 17 consolidated action-based tools (`chrome`, `step`, `execution`, etc.)
- **Legacy Mode:** 23 granular tools (`chrome_connect`, `debugger_enable`, etc.)

See `FEATURE-TOGGLE.md` for full details, usage examples, and tool comparison table.

## Architecture

### File Structure

```
src/
├── index.ts          # MCP server entry point, tool registration (with feature toggle)
├── browser.ts        # BrowserManager - multi-instance connection management
├── config.ts         # Configuration constants (including USE_LEGACY_TOOLS flag)
├── response.ts       # Response formatting, size checking utilities
├── types.ts          # TypeScript type definitions
└── tools/
    ├── index.ts      # Tool exports (legacy + consolidated)
    ├── chrome.ts     # Connection tools: legacy (5) + smart (3 consolidated)
    ├── dom.ts        # DOM tools (5): query_elements, click, fill, navigate, console
    └── debugger.ts   # Debugger tools: legacy (11) + smart (7 consolidated)
```

### Key Components

**BrowserManager (`src/browser.ts`)**
- Manages multiple Chrome connections via Puppeteer
- Each `connection_id` maps to a Browser + Page + CDPSession
- Tracks active connection for default tool operations
- Handles CDP event listeners for `Debugger.paused` / `Debugger.resumed`

**Response Utilities (`src/response.ts`)**
- `checkResultSize()` - Rejects oversized results with smart suggestions
- `analyzeQueryElementsData()` - Suggests narrowing based on classes/IDs found
- `escapeForJs()` - Escapes strings for JavaScript execution

**Configuration (`src/config.ts`)**
- `MAX_RESULT_SIZE = 5000` - Result size limit (~1250 tokens)
- `USE_LEGACY_TOOLS` - Feature toggle (default: `false`, smart tools enabled)

### Tool Categories

**Legacy Mode (23 tools):**
- Chrome Connection (7): `chrome_connect`, `chrome_launch`, `chrome_list_connections`, `chrome_switch_connection`, `chrome_disconnect`, `list_targets`, `switch_target`
- DOM Interaction (5): `query_elements`, `click_element`, `fill_element`, `navigate`, `get_console_logs`
- Debugger (11): `debugger_enable`, `debugger_set_breakpoint`, `debugger_get_call_stack`, `debugger_evaluate_on_call_frame`, `debugger_step_over`, `debugger_step_into`, `debugger_step_out`, `debugger_resume`, `debugger_pause`, `debugger_remove_breakpoint`, `debugger_set_pause_on_exceptions`

**Smart Mode (17 tools):**
- Chrome Connection (5): `chrome` (consolidated), `chrome_list_connections`, `chrome_switch_connection`, `chrome_disconnect`, `target` (consolidated)
- DOM Interaction (5): Same as legacy mode
- Debugger (7): `enable_debug_tools`, `breakpoint` (consolidated), `step` (consolidated), `execution` (consolidated), `call_stack`, `evaluate`, `pause_on_exceptions`

## Implementation Patterns

### Query Elements with Filters

The `query_elements` tool supports limit controls and filtering:

**Limit Control:**
```typescript
// Returns first 5 elements matching selector by default
const result = await queryElements({ selector: 'button' });

// Can specify higher limit (up to 20)
const result = await queryElements({ selector: 'div', limit: 10 });
```

**Text Content Filtering:**
```typescript
// Find only buttons containing "Submit" (case-insensitive)
const result = await queryElements({
  selector: 'button',
  text_contains: 'Submit'
});

// Partial matches work ("Sub" matches "Submit Form")
const result = await queryElements({
  selector: 'button',
  text_contains: 'Sub'
});
```

**Visibility Filtering:**
```typescript
// By default, only visible elements are returned (include_hidden: false)
const result = await queryElements({ selector: 'div' });

// Include hidden elements (display:none, visibility:hidden, zero size)
const result = await queryElements({
  selector: 'div',
  include_hidden: true
});
```

**Combined Filters:**
```typescript
// Only visible buttons with "Login" text
const result = await queryElements({
  selector: 'button',
  text_contains: 'Login',
  include_hidden: false  // default, can be omitted
});
```

**Filter Order:**
1. CSS selector match (`document.querySelectorAll`)
2. Visibility filter (unless `include_hidden: true`)
3. Text filter (if `text_contains` provided)
4. Limit applied to remaining elements

When filters are active, output shows filter summary:
```
Found 50 element(s) matching 'button'
  Visibility filter: 10 hidden element(s) excluded
  Text filter "Submit": 35 element(s) excluded
Showing first 5 of 5 remaining:
```

### Query Elements Output Format

Each element returned by `query_elements` includes:

**Example Output:**
```
[0] <form>
    ID: #login-form
    Classes: auth-form, card
    Text: Log in to your account Email Password...
    HTML: <form id="login-form" class="auth-form card" action="/api/login" method="POST">
    Structure: .form-group*2 > (label + input) + .actions > (button.submit + a.forgot)
    Interactive: input#email, input#password, button.submit, a.forgot-password
    Attributes: {"method":"POST","action":"/api/login"}
    Visible: true
    Children: 3 direct, 11 total
```

**Field Descriptions:**

- **HTML**: Element's opening tag with all attributes (no children)
  - Truncated at 200 characters if needed
  - Always present
  - Example: `<div id="main" class="container" data-page="home">`

- **Structure**: CSS-like skeleton showing child element pattern
  - Only present if element has children
  - Depth limited to 2 levels
  - Grouped repeated siblings with `*N` notation
  - Uses `>` for child, `+` for sibling
  - Capped at ~100 characters
  - Examples:
    - `ul > li*5 > a` (list with 5 items)
    - `.field*3 > (label + input)` (3 form fields)
    - `header + main + footer` (layout sections)

- **Interactive**: List of interactive descendant elements
  - Only present if element has interactive children
  - Detects: `button`, `a`, `input`, `select`, `textarea`, `role=*`
  - Uses shortest selector: `id` > `data-testid` > `tag.class`
  - Shows up to 6 items with "+N more" if exceeded
  - Example: `input#email, button.submit, a.forgot +2 more`

- **Children**: Direct and total descendant counts
  - Format: `N direct, M total`
  - Only present if element has children

**Structure Syntax Reference:**
- `div` - Element tag
- `#id` - Element with ID
- `.class` - Element with class
- `element*N` - N repeated siblings of same type
- `>` - Direct child relationship
- `+` - Sibling relationship
- `(...)` - Grouping for complex patterns

**Implementation Notes:**
- Structure generation groups consecutive siblings with same tag+class signature
- Interactive detection walks all descendants (not just direct children)
- HTML extraction uses `cloneNode(false)` to get opening tag only
- All three new fields are generated in browser context for efficiency

### Console Log Pattern Compression

The `get_console_logs` tool automatically detects and compresses repeating patterns in console output using a greedy single-pass algorithm with **similarity matching**.

**Compression Types:**

```
Consecutive:  A A A → A x3
Alternating:  A B A B → (A B) x2
Complex:      A B C D A B C D → (A B C D) x2
Similar:      "Error: timeout 123ms" + "Error: timeout 456ms" → grouped
```

**Similarity Matching:**

Messages are considered similar if they match after normalization:
- Numbers normalized: `timeout 123ms` → `timeout <n>ms`
- UUIDs normalized: `user-550e8400-...` → `user-<uuid>`
- Hex values normalized: `0xdeadbeef` → `<hex>`
- Timestamps normalized: `2024-01-21T10:30:45Z` → `<ts>`
- Whitespace collapsed

**Similarity Thresholds** (Dice coefficient on character bigrams):
- Same location (URL:line): 0.85 similarity required
- Different locations: 0.96 similarity required
- No location info: 0.92 similarity required

**Configuration** (in `src/tools/console-pattern.ts`):

```typescript
const DEFAULTS = {
  minTextSimilarity: 0.92,
  minTextSimilaritySameLocation: 0.85,
  minTextSimilarityDifferentLocation: 0.96,
  normalizeNumbers: true,
  normalizeHex: true,
  normalizeUUID: true,
  normalizeTimestamps: true,
  requireSameLevel: true,  // error != warning
};
```

**Performance:**
- Complexity: O(n√n) where n = number of logs
- Max pattern length: √n, capped at 20
- Compression shown when >20% reduction achieved

**Output Format:**

```
[Pattern compression: 50 → 12 lines (76% reduction)]

[10:30:45.123] [LOG] Error: timeout <n>ms x5
    Variations: 123, 456, 789, 234 +1 more

┌─ Pattern repeats x3 ─────
│ [10:30:46.000] [LOG] User <uuid> logged in
│ [10:30:46.100] [LOG] Request <n> completed
│ Variations: 550e8400-e29b-41d4-a716-446655440000, ..., 42, 43, 44 +3 more
└─────────────────────────────────
```

Variations show what was normalized (numbers, UUIDs, hex, timestamps) - up to 4 examples.

### CDP Debugger Access

Debugger tools use Puppeteer's CDP session:

```typescript
// Create CDP session from page
const cdpSession = await page.createCDPSession();

// Send CDP commands
await cdpSession.send('Debugger.enable');
await cdpSession.send('Debugger.setBreakpointByUrl', {
  url: scriptUrl,
  lineNumber: line - 1,  // CDP is 0-indexed, user input is 1-indexed
});

// Listen for events
cdpSession.on('Debugger.paused', (params) => {
  connection.pausedData = params;
});
```

### Multi-Instance Connections

Each connection maintains:
- `browser: Browser` - Puppeteer browser instance
- `page: Page` - Active page for the connection
- `cdpSession: CDPSession` - CDP session for debugger commands
- `pausedData: DebuggerPausedEvent | null` - Stored when paused
- `breakpoints: Map<string, BreakpointInfo>` - Tracked breakpoints

Tools accept optional `connection_id` parameter; if omitted, uses active connection.

### Result Size Analysis

Instead of truncating large results (which wastes tokens), we reject them with smart suggestions:

```typescript
function checkResultSize(result: string, maxSize = 5000, context?: string) {
  if (result.length <= maxSize) return result;

  // Analyze data and suggest narrowing
  const analysis = analyzeQueryElementsData(data);
  return `Result too large: ${sizeKb}KB (limit: ${limitKb}KB)\n\n${analysis}`;
}
```

### Feature Toggle Implementation

Tool registration and routing is conditional based on `USE_SMART_TOOLS`:

```typescript
// src/index.ts
import { USE_SMART_TOOLS } from './config.js';

const legacyTools: Tool[] = [ /* 23 legacy tool definitions */ ];
const smartTools: Tool[] = [ /* 18 smart tool definitions */ ];

const activeTools = USE_SMART_TOOLS ? smartTools : legacyTools;

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (USE_SMART_TOOLS) {
    // Route to consolidated tools
  } else {
    // Route to legacy tools
  }
});
```

## Reference Implementations

### `references/reference-chrome-devtools-mcp/`
Official Chrome DevTools MCP server - use for:
- Puppeteer patterns (`src/browser.ts`)
- Tool definition structure (`src/tools/`)

### `references/chrome-debugger-mcp/`
Original Python implementation - use for:
- Tool behavior and signatures
- Multi-instance connection management

## Testing

Tests use Node.js built-in test runner:

```typescript
import { describe, it } from 'node:test';
import assert from 'node:assert';

describe('Cherry Chrome MCP Server', () => {
  it('should have correct config values', async () => {
    const { MAX_RESULT_SIZE } = await import('../src/config.js');
    assert.strictEqual(MAX_RESULT_SIZE, 5000);
  });
});
```

Run with: `npm test`

Test feature toggle with: `./test-toggle.sh`

## Development Tips

- All DOM operations use `page.evaluate()` with JavaScript
- CDP commands go through `cdpSession.send()`
- Line numbers: user-facing is 1-indexed, CDP is 0-indexed
- Connection ID `"default"` is used for single-connection workflows
- Error messages should include context and potential fixes
- Feature toggle requires server restart (not runtime-switchable)
- Both modes share the same underlying `BrowserManager` and tool implementations
