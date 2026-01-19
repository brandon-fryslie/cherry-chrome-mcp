# Console Log Freshness - Context Document

**Sprint ID:** console-log-freshness-20260118

## Problem Summary

Agents using `get_console_logs` receive stale messages from before page reloads or HMR updates, causing confusion and wasted effort (restarting servers, killing browsers unnecessarily).

## Key Files

| File | Purpose |
|------|---------|
| `src/browser.ts` | BrowserManager - manages connections, console listeners |
| `src/tools/dom.ts` | `getConsoleLogs()` function |
| `src/types.ts` | `Connection` and `ConsoleMessage` interfaces |

## Current Behavior

1. Console messages captured via `page.on('console', ...)` in `browser.ts:130-137`
2. Messages stored in `connection.consoleLogs` array
3. Array only cleared on target switch (`switchPage`), never on navigation/reload
4. `getConsoleLogs` returns most recent N messages with no freshness context

## Desired Behavior

1. Track navigation epochs (increment on reload/navigation)
2. Tag each console message with its navigation epoch
3. Clear old messages on navigation
4. Detect HMR updates via console message patterns
5. Include freshness metadata in `get_console_logs` response

## Technical References

- Puppeteer `page.on('load')` event fires on full page load
- Puppeteer `page.on('framenavigated')` fires on frame navigation
- HMR frameworks log patterns like `[HMR]`, `[WDS]`, `[vite]`

## Related Planning Documents

- [PLAN](./SPRINT-20260118-console-freshness-PLAN.md) - Detailed implementation plan
- [DOD](./SPRINT-20260118-console-freshness-DOD.md) - Definition of Done
