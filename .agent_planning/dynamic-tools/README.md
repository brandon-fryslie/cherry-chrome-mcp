# Dynamic MCP Tool Visibility

**Status:** Evaluation Complete  
**Date:** 2025-01-12  
**Evaluation Document:** `EVALUATION-20250112.md`

## Quick Summary

This folder contains evaluation and planning for implementing dynamic tool visibility in cherry-chrome-mcp using MCP's `list_changed` notifications.

### What This Feature Does

Instead of always showing all 23 tools, the server will dynamically show/hide tools based on current state:

- **No connection:** Show only `chrome_connect`, `chrome_launch`, `chrome_list_connections`
- **Connected, no debugger:** Show connection + DOM interaction tools (query, click, fill, navigate, console)
- **Debugger enabled:** Show debugger tools (breakpoints, stepping, evaluation)
- **Execution paused:** Show all debugger stepping tools

This reduces cognitive load and saves context tokens (~5-10% savings on tool list).

### Key Findings

✓ **All infrastructure exists:**
- BrowserManager tracks all necessary state
- MCP SDK provides `sendToolListChanged()` method
- No external dependencies needed

✓ **Straightforward implementation:**
- Extract tool definitions to separate module
- Create visibility rules module
- Add EventEmitter to state changes
- Wire up notifications

⚠ **5 ambiguities to resolve** (documented in evaluation)

### Implementation Estimate

~2.5 hours for Phase 1 (foundations)
- 30 min: Extract tool definitions
- 30 min: Create visibility module
- 30 min: Add EventEmitter to BrowserManager
- 20 min: Wire up notifications
- 45 min: Testing and verification

### Files Included

- `EVALUATION-20250112.md` - Complete evaluation with:
  - Current state analysis (tool registration, state tracking, MCP SDK)
  - What exists and what's missing
  - Implementation approach with specific steps
  - Dependencies and risks
  - 5 ambiguities requiring decision
  - Testing strategy
  - Success criteria
  - Estimated token impact

### Next Action

Read `EVALUATION-20250112.md` and make decisions on the 5 ambiguities:
1. Multiple connections - hide `chrome_switch_connection` if < 2 connections?
2. Debugger re-enable - clean state per connection?
3. Paused state - only show stepping tools when paused?
4. Debouncing - immediate notifications or debounce rapid changes?
5. Documentation - update all tool descriptions with visibility requirements?

### Recommendation

**Proceed with implementation** - high value (context savings), low risk (all tools still work, just hidden), straightforward engineering.
