# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Cherry Chrome MCP is a TypeScript MCP server for Chrome automation with CSS selector-based querying and full JavaScript debugger support. Ported from Python `chrome-debugger-mcp`.

**Key Features:**
- CSS selector-based DOM queries (not accessibility tree refs)
- DOM depth filtering (prevents returning entire pages)
- Multi-instance Chrome connection support
- Full JavaScript debugger via CDP (breakpoints, stepping, evaluation)
- Smart result size analysis (rejects oversized results with suggestions)

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
├── index.ts          # MCP server entry point, tool registration
├── browser.ts        # BrowserManager - multi-instance connection management
├── config.ts         # Configuration constants
├── response.ts       # Response formatting, size checking utilities
├── types.ts          # TypeScript type definitions
└── tools/
    ├── index.ts      # Tool exports
    ├── chrome.ts     # Connection tools (5): connect, launch, list, switch, disconnect
    ├── dom.ts        # DOM tools (5): query_elements, click, fill, navigate, console
    └── debugger.ts   # Debugger tools (11): enable, breakpoints, stepping, evaluation
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
- `MAX_DOM_DEPTH = 3` - Default DOM depth filter
- `HARD_MAX_DOM_DEPTH = 10` - Maximum allowed depth

### Tool Categories

**Chrome Connection (5 tools):** `chrome_connect`, `chrome_launch`, `chrome_list_connections`, `chrome_switch_connection`, `chrome_disconnect`

**DOM Interaction (5 tools):** `query_elements`, `click_element`, `fill_element`, `navigate`, `get_console_logs`

**Debugger (11 tools):** `debugger_enable`, `debugger_set_breakpoint`, `debugger_get_call_stack`, `debugger_evaluate_on_call_frame`, `debugger_step_over`, `debugger_step_into`, `debugger_step_out`, `debugger_resume`, `debugger_pause`, `debugger_remove_breakpoint`, `debugger_set_pause_on_exceptions`

## Implementation Patterns

### DOM Depth Filtering

The `query_elements` tool filters out deeply nested elements using JavaScript executed in the page:

```typescript
// Depth is measured from document.body
function getDepth(el: Element): number {
  let depth = 0;
  let current = el;
  while (current && current !== document.body) {
    depth++;
    current = current.parentElement;
  }
  return depth;
}
```

Elements at max depth show: `[ELIDED N DIRECT CHILD ELEMENTS (M total). INCREASE SELECTOR SPECIFICITY]`

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

## Reference Implementations

### `references/reference-chrome-devtools-mcp/`
Official Chrome DevTools MCP server - use for:
- Puppeteer patterns (`src/browser.ts`)
- Tool definition structure (`src/tools/`)

### `references/chrome-debugger-mcp/`
Original Python implementation - use for:
- Tool behavior and signatures
- DOM depth filtering logic
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

## Development Tips

- All DOM operations use `page.evaluate()` with JavaScript
- CDP commands go through `cdpSession.send()`
- Line numbers: user-facing is 1-indexed, CDP is 0-indexed
- Connection ID `"default"` is used for single-connection workflows
- Error messages should include context and potential fixes
