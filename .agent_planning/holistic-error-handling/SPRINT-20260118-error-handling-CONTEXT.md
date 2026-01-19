# Implementation Context: Holistic Error Handling

## Key Files

- `src/errors.ts` - NEW file (already created with basic structure)
- `src/browser.ts` - Add *OrThrow methods to BrowserManager class
- `src/tools/dom.ts` - Update DOM tools to use throwing methods
- `src/tools/debugger.ts` - Update debugger tools to use throwing methods

## Current State

- `src/errors.ts` has been created with the four error classes
- No other changes have been made yet

## Implementation Notes

### Error Class Design

The error classes take optional `connectionId` parameter and construct the full message internally. This ensures consistent error messages across all call sites.

### Throwing Method Pattern

```typescript
// Pattern for all *OrThrow methods
getConnectionOrThrow(connectionId?: string): Connection {
  const connection = this.getConnection(connectionId);
  if (!connection) {
    throw new ChromeNotConnectedError(connectionId);
  }
  return connection;
}
```

### Tool Update Pattern

```typescript
// Before
const cdpSession = browserManager.getCDPSession(args.connection_id);
if (!cdpSession) {
  return errorResponse('Debugger not enabled...');
}

// After
try {
  const cdpSession = browserManager.getCDPSessionOrThrow(args.connection_id);
  // ... rest of implementation
} catch (error) {
  return errorResponse(error instanceof Error ? error.message : String(error));
}
```

### Files Already Read/Analyzed

- `src/browser.ts` - BrowserManager class with current null-returning methods
- `src/tools/dom.ts` - DOM tools with local getPage() helper
- `src/tools/debugger.ts` - Debugger tools with inconsistent error handling
