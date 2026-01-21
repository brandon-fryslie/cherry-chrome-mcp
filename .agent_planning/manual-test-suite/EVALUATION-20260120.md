# Evaluation: Manual Test Suite for Cherry Chrome MCP

Generated: 2026-01-20
Topic: Manual test suite for evaluating MCP server effectiveness from within Claude Code

## Executive Summary

This evaluation analyzes what's needed to create a comprehensive manual test suite for the Cherry Chrome MCP server. The goal is to enable human-in-the-loop evaluation of how well the MCP tools work when used by an AI agent in realistic scenarios.

## Current State

### What Exists
- **17 Smart Mode tools** (default): Connection management (5), DOM interaction (5 + inspect_element), Debugger (7)
- **No existing test webapp infrastructure** - only `tests/server.test.ts` which tests server config values
- **Manual testing today**: Using MCP Inspector or Claude Code against arbitrary web pages

### Tool Surface to Test

| Category | Tools | Key Functionality |
|----------|-------|-------------------|
| **Connection** | `chrome`, `target`, `chrome_list_connections`, `chrome_switch_connection`, `chrome_disconnect` | Connect/launch Chrome, manage multiple connections, switch browser targets |
| **DOM Query** | `query_elements`, `inspect_element` | CSS selector queries with filters (text, visibility), smart suggestions on 0 results, selector discovery from natural language |
| **DOM Actions** | `click_element`, `fill_element`, `navigate`, `get_console_logs` | Interact with elements, auto-context (DOM diff, element state), console access |
| **Debugger** | `enable_debug_tools`, `breakpoint`, `step`, `execution`, `call_stack`, `evaluate`, `pause_on_exceptions` | Full JS debugger via CDP |

## User's Requirements

1. **Lightweight webserver** serving demo webapps
2. **Demo webapps** with complex DOM, complex JS, representative scenarios
3. **Sprint 1 (This Plan)**: Define evaluation metrics and test scenarios
4. **Deferred**: Actually build/acquire the test webapps

## Evaluation Focus Areas

### 1. Intuitive Use (Did the agent choose correctly?)
- Did the model select the right tool for the task?
- How many attempts before successful tool selection?
- Did it need to read tool docs/descriptions or figure it out from names alone?
- Was tool usage syntactically correct on first try?

### 2. Functionality (Did it achieve the goal?)
- Did the tool return correct/complete information?
- Were action tools (click, fill, navigate) effective?
- Did contextual features (DOM diff, suggestions) help?
- Were error messages actionable?

### 3. Efficiency (Token and turn economy)
- How many tokens to achieve outcome?
- How many tool calls required?
- Were there wasted turns (retries, wrong tools, etc.)?

### 4. Cognitive Flow (Distraction potential)
- Did tool use break the agent's train of thought?
- Did the agent get sidetracked by tool output?
- Was the agent able to seamlessly continue after tool use?

### 5. Reliability (Consistency across attempts)
- Same task, same outcome across multiple trials?
- Stable behavior across different page structures?
- Graceful degradation on edge cases?

## Verdict: CONTINUE

The scope is clear: First sprint focuses on defining metrics and scenarios (research/planning). This is appropriate as a MEDIUM confidence sprint since we need to brainstorm and validate the approach before building anything.

## Ambiguities Identified

1. **Webapp acquisition strategy**: Build custom vs. adapt existing test fixtures vs. use real websites?
   - Resolved in sprint plan: Design scenarios first, then decide build/acquire approach per scenario

2. **Evaluation methodology**: Qualitative observation vs. structured scoring vs. automated metrics?
   - Resolved in sprint plan: Define scoring rubric in this sprint, defer automation

## Next Steps

Generate a MEDIUM confidence sprint plan for:
1. Brainstorming comprehensive evaluation metrics
2. Designing test scenarios that cover the tool surface
3. Producing scenario specifications ready for implementation in future sprints
