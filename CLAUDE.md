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

## Common Commands

```bash
npm run build        # Compile TypeScript
npm run dev          # Watch mode
npm test             # Build and run tests
npm start            # Build and start server
npm run clean        # Remove build directory
```

### Testing with MCP Inspector
```bash
npx @modelcontextprotocol/inspector node build/src/index.js
```

### Testing with Claude Code
```bash
claude mcp add --scope project cherry-chrome -- node /absolute/path/to/build/src/index.js
```

## Architecture

### File Structure

```
src/
├── index.ts          # MCP server entry point and tool registration
├── browser.ts        # BrowserManager - multi-instance connection management
├── config.ts         # Configuration constants
├── response.ts       # Response formatting, size checking utilities
├── types.ts          # TypeScript type definitions
├── toolRegistry.ts   # Tool registry with O(1) name → handler lookup
├── handlers.ts       # Flat tool handler map and `interact` dispatcher
└── tools/
    ├── index.ts            # Tool function re-exports
    ├── chrome.ts           # Connection tools: connect, target, list/switch/disconnect
    ├── dom.ts              # DOM tools (query, click, fill, navigate, console, inspect, scroll, etc.)
    ├── debugger.ts         # Consolidated debugger tools (breakpoint, step, execution, ...)
    ├── context.ts          # Context gathering for smart responses (navigate, action, step, pause)
    ├── page-extractors.ts  # Composable semantic extractors (buttons, inputs, forms, landmarks, etc.)
    └── page-summary.ts     # Page summary orchestration with configurable output
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
- `CDP_TIMEOUT = 10000` - CDP command timeout (ms)
- `CHROME_LAUNCH_WAIT = 2000` - Wait after launching Chrome before connecting

**Tool Registry (`src/toolRegistry.ts`)**
- Map-based registry for O(1) tool lookup
- `ToolHandler` interface: name, definition, invoke method
- `ToolRegistry` interface: getHandler, getAllTools, size
- Validates all tools have handlers at initialization (fail-fast)

### Tool Catalog (19 tools total)

- **Chrome Connection (5):** `connect`, `chrome_list_connections`, `chrome_switch_connection`, `chrome_disconnect`, `target`
- **DOM Interaction (7):** `query_elements`, `interact` (8 actions: click, scroll, right-click, double-click, focus, blur, press-key, select-option), `fill_element`, `navigate`, `get_console_logs`, `inspect_element`, `get_page_text`
- **Debugger (7):** `enable_debug_tools`, `breakpoint`, `step`, `execution`, `call_stack`, `evaluate`, `pause_on_exceptions`

### Smart Connect Tool

The `connect` tool provides intelligent Chrome connection handling:

```typescript
// Launch new Chrome on random port (15000-18000) and navigate to URL
connect({ url: 'https://example.com' })

// Connect to existing Chrome on specific port (verifies port is in use first)
connect({ url: 'https://example.com', port: 9222 })
```

**Behavior:**
- **No port provided**: Launches new Chrome on a random port (15000-18000), navigates to URL, returns page context
- **Port provided**: Checks if something is running on that port first. If yes, connects and navigates. If no, returns helpful error message

**Parameters:**
- `url` (required): URL to navigate to after connecting
- `port` (optional): If provided, connects to existing Chrome. If omitted, launches new Chrome
- `connection_id` (optional): Unique identifier for this connection (default: "default")
- `headless` (optional): Run in headless mode when launching new Chrome
- `user_data_dir` (optional): Custom user data directory when launching
- `extra_args` (optional): Additional Chrome flags when launching

## Implementation Patterns

### Tool Registry Pattern

The server uses a Map-based registry for O(1) tool routing.

**Registry Initialization** (`src/index.ts`):

```typescript
// Single flat tool list — no mode branching
const toolHandlers = createToolHandlers(tools);
const toolRegistry = createToolRegistry(tools, toolHandlers);
```

**Handler Creation** (`src/handlers.ts`):

`createToolHandlers()` returns a flat `Map<string, ToolHandler>`. There is one entry per registered tool. The registry validates at initialization that every tool in the `tools` array has a matching handler — missing handlers throw immediately.

**Tool Routing**:

MCP request handlers use O(1) registry lookup:

```typescript
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools: toolRegistry.getAllTools() };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const handler = toolRegistry.getHandler(name);
  if (!handler) {
    throw new Error(`Unknown tool: ${name}`);
  }
  return await handler.invoke(args);
});
```

**Testing**:
- `tests/toolRegistry.test.ts` - Registry module unit tests
- `tests/registry-integration.test.ts` - Full request → registry → handler flow
- `tests/server.test.ts` - Tool catalog and config smoke tests

### Unified Interact Tool

The `interact` tool consolidates click and scroll operations into a single action-based interface using a discriminated union schema.

**Actions:**

1. **Click Action** - Click an element by CSS selector
```typescript
// Click first matching button
interact({ action: 'click', selector: 'button.submit' })

// Click specific element index
interact({ action: 'click', selector: 'button', index: 2 })

// Include element state after click
interact({ action: 'click', selector: '#btn', include_context: true })
```

2. **Scroll Action** - Scroll by direction or to element
```typescript
// Scroll down 300px
interact({ action: 'scroll', direction: 'down', pixels: 300 })

// Scroll to top/bottom
interact({ action: 'scroll', direction: 'top' })

// Scroll element into view
interact({ action: 'scroll', selector: '#error-message' })
```

3. **Right-click Action** - Context menu trigger
```typescript
interact({ action: 'right-click', selector: '.menu-item' })
```

4. **Double-click Action** - Element selection, grid rows, map zoom
```typescript
interact({ action: 'double-click', selector: 'span.text-to-select' })
```

5. **Focus Action** - Set keyboard focus (accessibility testing)
```typescript
interact({ action: 'focus', selector: 'input#email' })
```

6. **Blur Action** - Remove focus
```typescript
interact({ action: 'blur', selector: 'input#email' })
```

7. **Press Key Action** - Keyboard events (Enter, Tab, Escape, arrows, combinations)
```typescript
// Single key on focused element
interact({ action: 'press-key', key: 'Enter' })

// Key with selector (focuses first)
interact({ action: 'press-key', selector: 'form', key: 'Enter' })

// Key combinations
interact({ action: 'press-key', key: 'Control+a' })
interact({ action: 'press-key', key: 'Shift+Tab' })

// Navigation keys
interact({ action: 'press-key', key: 'ArrowDown' })
```

8. **Select Option Action** - Dropdown selection
```typescript
// By text (case-insensitive)
interact({ action: 'select-option', selector: 'select#country', option_text: 'United States' })

// By index
interact({ action: 'select-option', selector: 'select#country', option_index: 2 })

// By value
interact({ action: 'select-option', selector: 'select#country', option_value: 'us' })
```

**Schema Design:**
- Root `oneOf` discriminates by action (8 variants: click, scroll, right-click, double-click, focus, blur, press-key, select-option)
- Each action has specific required/optional parameters
- Press-key selector is optional (uses document.activeElement if not provided)
- Select-option requires one of: option_text, option_index, or option_value
- `additionalProperties: false` prevents invalid parameter combinations

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

### Semantic Page Summary

The `navigate` tool now provides an actionable semantic page summary instead of raw element counts. The summary is generated using composable extractors that identify interactive elements, landmarks, and UI state.

**Architecture:**

The page summary system consists of two layers:

1. **Page Extractors** (`src/tools/page-extractors.ts`): Composable, framework-agnostic extraction functions
   - Each extractor runs a single `page.evaluate()` call for efficiency
   - Returns typed results with configurable limits
   - Uses only HTML semantics and ARIA roles (no framework detection)

2. **Page Summary Composer** (`src/tools/page-summary.ts`): Orchestrates extractors into formatted output
   - Configurable which extractors to run
   - Per-category limits
   - Human-readable formatting

**Available Extractors:**

| Extractor | Detects | Default Limit |
|-----------|---------|---------------|
| `extractFocused` | Currently focused element | N/A (1 item) |
| `extractButtons` | `button`, `[role="button"]` | 10 |
| `extractLinks` | `a[href]` | 10 |
| `extractInputs` | `input`, `textarea`, `select` | 10 |
| `extractForms` | `form` with child input summary | 5 |
| `extractToggles` | `input[type="checkbox"]`, `[role="switch"]` | 10 |
| `extractAlerts` | `[role="alert"]`, `[role="status"]` | 5 |
| `extractModals` | `[role="dialog"]`, `[aria-modal="true"]` | 3 |
| `extractErrors` | `[aria-invalid="true"]`, `[aria-errormessage]` | 10 |
| `extractLandmarks` | `header`, `nav`, `main`, `aside`, `footer`, ARIA roles | 10 |
| `extractTabs` | `[role="tablist"]` > `[role="tab"]` | 5 |
| `extractHeadings` | `h1`-`h6` | 10 (opt-in) |

**Example Output:**

```
Title: Dashboard

── Focused ──
input#search-blocks (text)

── Buttons (7) ──
<button>New</button>
<button>Open</button>
<button>Save</button>
+4 more...

── Inputs (3) ──
#project-name (text): "Shape Kaleidoscope" [placeholder: "Project name"]
#search-blocks (text): ""
#default-patch (number): 5

── Toggles (2) ──
[x] Enable Debug Mode
[ ] Show Minimap

── Landmarks ──
header, nav (Library), main, aside (Inspector), aside (Settings)

── Tabs ──
[Console] [Logs] [Continuity] [*Compilation*]

── Alerts ──
None

── Modals ──
None

── Errors ──
None
```

**Configuration:**

```typescript
import { gatherPageSummary } from './tools/page-summary.js';

// Default: All extractors except headings
const summary = await gatherPageSummary(page);

// Custom: Only specific extractors
const summary = await gatherPageSummary(page, {
  include: {
    buttons: true,
    inputs: true,
    forms: true,
    landmarks: true,
    // All others: false
  },
  limits: {
    buttons: 5,    // Show max 5 buttons
    inputs: 20,    // Show max 20 inputs
  },
});
```

**Extractor Reuse:**

The extractors are designed to be composable and reusable:

```typescript
// Use extractors directly in other tools
import { extractButtons, extractInputs } from './tools/page-extractors.js';

const buttons = await extractButtons(page, { limit: 5 });
const inputs = await extractInputs(page, { includeHidden: true });

// Check result metadata
if (buttons.truncated) {
  console.log(`Found ${buttons.total} buttons, showing ${buttons.items.length}`);
}
```

**Integration:**

- `gatherNavigateContext()` in `context.ts` now uses `gatherPageSummary()` instead of raw counts
- All extractors use the same helper functions (`generateSelector`, `isElementVisible`)
- Results include selector strings for immediate tool use (e.g., `click_element`, `fill_element`)

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

### Parameter Naming Convention

All tool parameters follow a consistent naming convention to maintain clarity between the external MCP API and internal TypeScript implementation.

**External API (MCP Parameters):** Use **snake_case** for all tool parameter names. This aligns with MCP SDK standards and provides a uniform interface:

```typescript
export async function queryElements(args: {
  selector: string;
  limit?: number;
  text_contains?: string;      // snake_case
  include_hidden?: boolean;     // snake_case
  connection_id?: string;       // snake_case
}): Promise<ToolResult>
```

Common parameter patterns:
- `connection_id` - Chrome connection identifier
- `text_contains` - Text filter for element search
- `include_hidden` - Include hidden elements flag
- `line_number` - Line number for breakpoints (1-indexed)
- `column_number` - Column number in text
- `call_frame_id` - CDP call frame identifier
- `include_context` - Include surrounding element state

**Internal TypeScript:** Convert to **camelCase** when working with parameters inside function implementations:

```typescript
const page = browserManager.getPageOrThrow(args.connection_id);
const textContainsFilter = args.text_contains;  // Convert to camelCase
const includeHidden = args.include_hidden ?? false;
```

**CDP Parameter Conversion:** Chrome DevTools Protocol expects **camelCase** parameters. Always convert when calling CDP methods:

```typescript
// MCP parameter (snake_case)
const args = {
  line_number: 42,
  column_number: 10,
};

// CDP call (camelCase)
await cdpSession.send('Debugger.setBreakpointByUrl', {
  lineNumber: args.line_number - 1,      // Converted + adjusted
  columnNumber: args.column_number ?? 0, // Converted
});
```

**Contributing: Adding New Tool Parameters**

When adding new tools or parameters, follow these guidelines:

1. **Use snake_case for all MCP parameter names**
   - Good: `data_testid`, `aria_label`, `include_context`, `option_text`
   - Bad: `dataTestId`, `ariaLabel`, `includeContext`, `optionText`

2. **Convert to camelCase for internal variables**
   - External: `some_param_name`
   - Internal: `const someParamValue = args.some_param_name;`

3. **Match existing parameter names for consistency**
   - Use `connection_id` (not `conn_id`, `connection`, etc.)
   - Use `include_hidden` (not `show_hidden`, `hidden`, etc.)
   - Use `text_contains` (not `search_text`, `text_filter`, etc.)

4. **Document parameter purpose in schema**
   - Add clear `description` field
   - Specify default values
   - Note any validation rules

**Examples from Real Tools:**

From `queryElements`:
```typescript
// Parameter names (snake_case) → internal variables (camelCase)
selector: string;           // Used directly
limit?: number;             // const limit = args.limit ?? 5;
text_contains?: string;     // const textFilter = args.text_contains;
include_hidden?: boolean;   // const includeHidden = args.include_hidden ?? false;
connection_id?: string;     // const page = browserManager.getPageOrThrow(args.connection_id);
```

From `interact` (unified DOM interaction tool):
```typescript
// Parameter names describe both action type and required inputs
action: 'click' | 'scroll' | 'right-click' | 'double-click' | 'focus' | 'blur' | 'press-key' | 'select-option';
selector?: string;          // Optional for some actions (e.g., press-key with focused element)
include_context?: boolean;  // Boolean flag follows include_* pattern
option_text?: string;       // Snake_case for select-option action
option_index?: number;      // Numeric variant of option_*
option_value?: string;      // String variant of option_*
connection_id?: string;     // Standard connection identifier
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
