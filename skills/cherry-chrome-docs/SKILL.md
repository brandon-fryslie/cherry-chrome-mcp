---
name: Cherry Chrome Tool Documentation
description: >
  This skill should be used when an agent needs detailed documentation about
  cherry-chrome-mcp tools - including prerequisites, output formats, parameter
  mappings, or usage examples. Covers all 19 smart-mode tools. Includes a
  comprehensive debugger guide for JavaScript debugging workflows.
---

# Cherry Chrome MCP - Tool Reference Index

**Before using any tool, read its reference file** from `references/<tool-name>.md`.
Each file contains: prerequisites, parameters, output format, and examples.

## Debugger Guide

**Read `references/debugger-guide.md` before any debugging session.** The JavaScript
debugger freezes execution at any point, exposing every variable, the full call stack,
and all closure state. It is faster and more thorough than console.log - use it first
when diagnosing unexpected behavior, wrong return values, state mutation bugs, or
silent failures.

## Tool Index

| Tool | Reference | Purpose |
|------|-----------|---------|
| `connect` | `references/connect.md` | Connect to or launch Chrome |
| `chrome_list_connections` | `references/chrome-list-connections.md` | List active connections |
| `chrome_switch_connection` | `references/chrome-switch-connection.md` | Switch active connection |
| `chrome_disconnect` | `references/chrome-disconnect.md` | Disconnect from Chrome |
| `target` | `references/target.md` | List or switch browser tabs/targets |
| `query_elements` | `references/query-elements.md` | Find DOM elements by CSS selector |
| `interact` | `references/interact.md` | Click, scroll, press keys, select options (8 actions) |
| `fill_element` | `references/fill-element.md` | Type text into inputs |
| `navigate` | `references/navigate.md` | Navigate to URL |
| `get_console_logs` | `references/get-console-logs.md` | Read browser console |
| `inspect_element` | `references/inspect-element.md` | Discover CSS selectors from description |
| `get_page_text` | `references/get-page-text.md` | Extract text content from elements |
| `enable_debug_tools` | `references/enable-debug-tools.md` | Enable JavaScript debugger |
| `breakpoint` | `references/breakpoint.md` | Set or remove breakpoints |
| `step` | `references/step.md` | Step through paused code |
| `execution` | `references/execution.md` | Resume or pause execution |
| `call_stack` | `references/call-stack.md` | Get call frames when paused |
| `evaluate` | `references/evaluate.md` | Evaluate expressions in call frame |
| `pause_on_exceptions` | `references/pause-on-exceptions.md` | Configure exception pausing |

Cross-cutting references:
- `references/debugger-guide.md` - When and how to use the debugger (read this first for debugging)
- `references/workflows.md` - Common multi-tool patterns
