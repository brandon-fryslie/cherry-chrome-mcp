# Development Guide

## Project Structure

```
cherry-chrome-mcp/
├── src/
│   ├── index.ts           # Main entry point, MCP server setup
│   └── tools/
│       └── index.ts       # Tool registration (empty stub)
├── tests/
│   └── server.test.ts     # Basic tests
├── build/                 # Compiled TypeScript output
├── package.json
├── tsconfig.json
└── README.md
```

## Getting Started

```bash
npm install        # Install dependencies
npm run build      # Build TypeScript
npm test           # Run tests
npm start          # Start server
```

## Development Workflow

1. **Watch mode during development:**
   ```bash
   npm run dev
   ```

2. **Run tests in watch mode:**
   ```bash
   npm test -- --watch
   ```

3. **Clean build:**
   ```bash
   npm run clean
   npm run build
   ```

## Testing the MCP Server

### Test locally with Claude Code:

```bash
claude mcp add --scope project cherry-chrome -- node ~/code/cherry-chrome-mcp/build/src/index.js
```

### Test with MCP Inspector:

```bash
npx @modelcontextprotocol/inspector node build/src/index.js
```

## Next Steps for Implementation

### 1. Create Browser Manager (`src/browser.ts`)
- Launch/connect to Chrome instances
- Manage multiple connections
- Track active connection

### 2. Copy WaitForHelper from reference server
- Copy `reference-chrome-devtools-mcp/src/WaitForHelper.ts`
- Critical for reliable automation

### 3. Implement DOM Tools (`src/tools/dom.ts`)
- `query_elements` - Use `page.$$()` for CSS selectors
- `click_element` - Use `page.click()`
- `fill_element` - Use `page.type()`
- `navigate` - Use `page.goto()`
- Reference: `reference-chrome-devtools-mcp/src/tools/input.ts` and `pages.ts`

### 4. Implement Debugger Tools (`src/tools/debugger.ts`)
- Use `page._client.send()` for CDP Debugger commands
- Copy patterns from reference server's CDP usage
- Handle paused events

### 5. Add Response Formatting
- Adapt from `reference-chrome-devtools-mcp/src/McpResponse.ts`
- Compact, readable output
- DOM depth filtering

## Code to Port from Python Wrapper

The Python wrapper has these components to port:

- `CDPConnectionManager` → `src/browser.ts`
- `query_elements`, `click_element`, `fill_element` → `src/tools/dom.ts`
- All `debugger_*` functions → `src/tools/debugger.ts`
- Logging → Add with `console.error()` for stderr

## TypeScript Tips

- Copy liberally from `reference-chrome-devtools-mcp/src/` - it's already working!
- Use `page._client` to access CDP directly (for debugger tools)
- Puppeteer types: `Page`, `Browser`, `ElementHandle`
- MCP SDK types: `CallToolResult`, `TextContent`
- Reference server is your template - when in doubt, see how they did it
