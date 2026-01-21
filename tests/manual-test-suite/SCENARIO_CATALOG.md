# Test Scenario Catalog

## Overview
This document specifies the test scenarios for evaluating the Cherry Chrome MCP server. Scenarios are organized by tool category and complexity.

## Scenario Set 1: DOM Query & Inspection

### S1.1 - Simple Element Lookup
- **Goal**: Find a specific button by text content
- **Page Requirements**: Page with 5+ buttons, one with unique text "Submit Order"
- **Tool Chain**: `query_elements` with `text_contains`
- **Metrics Focus**: A1, B1, B2, C1

### S1.2 - Complex Selector Refinement
- **Goal**: Find an element that requires iterative selector refinement
- **Page Requirements**: Nested form with repeated `.form-field` classes, need to find email input specifically
- **Tool Chain**: `query_elements` (broad) → analyze → `query_elements` (narrowed)
- **Metrics Focus**: A5, C1, C4, D1

### S1.3 - Zero Results with Suggestions
- **Goal**: Search for non-existent element, use suggestions to recover
- **Page Requirements**: Page with `.login-btn` but agent searches for `.signin-btn`
- **Tool Chain**: `query_elements` → interpret suggestions → corrected `query_elements`
- **Metrics Focus**: B4, B6, C4

### S1.4 - Hidden Element Discovery
- **Goal**: Find elements hidden via CSS (display:none, visibility:hidden)
- **Page Requirements**: Modal with hidden overlay, dropdown with hidden menu
- **Tool Chain**: `query_elements` with `include_hidden: true`
- **Metrics Focus**: B1, A4

### S1.5 - Natural Language Selector Discovery
- **Goal**: Find "the login button" using natural language
- **Page Requirements**: Page with various buttons, login button has id and aria-label
- **Tool Chain**: `inspect_element` with `description`
- **Metrics Focus**: A1, B1, B2

### S1.6 - Spatial Element Discovery
- **Goal**: Find input "below the header"
- **Page Requirements**: Header with multiple inputs elsewhere, one input directly below header
- **Tool Chain**: `inspect_element` with `near` parameter
- **Metrics Focus**: B1, A4

## Scenario Set 2: DOM Actions

### S2.1 - Click with Verification
- **Goal**: Click a button and verify the resulting DOM change
- **Page Requirements**: Button that toggles a panel's visibility
- **Tool Chain**: `click_element` → observe DOM diff in response
- **Metrics Focus**: B3, B6, D4

### S2.2 - Form Fill Workflow
- **Goal**: Fill a multi-field form and submit
- **Page Requirements**: Login form (email, password, remember-me, submit)
- **Tool Chain**: Multiple `fill_element` → `click_element` (submit)
- **Metrics Focus**: B3, C1, A5

### S2.3 - Dynamic Form Interactions
- **Goal**: Fill form where inputs appear conditionally
- **Page Requirements**: Form where selecting "Business" shows additional fields
- **Tool Chain**: `fill_element` → `click_element` (radio) → `query_elements` (find new fields) → `fill_element`
- **Metrics Focus**: E3, A5, C1

### S2.4 - Navigate and Orient
- **Goal**: Navigate to a page and understand its structure
- **Page Requirements**: Multi-page app with distinct pages
- **Tool Chain**: `navigate` → use context to identify key elements
- **Metrics Focus**: B6, D2, D4

## Scenario Set 3: Console & Debugging

### S3.1 - Error Triage
- **Goal**: Page has JS errors, identify the issue
- **Page Requirements**: Page with intentional TypeError
- **Tool Chain**: `get_console_logs` with `filter_level: "error"`
- **Metrics Focus**: B1, B2, C3

### S3.2 - State Change Tracking
- **Goal**: Detect console activity after an action
- **Page Requirements**: Button that triggers console.log statements
- **Tool Chain**: `get_console_logs` (before) → `click_element` → `get_console_logs` (after)
- **Metrics Focus**: B6 (freshness indicators), D1

## Scenario Set 4: JavaScript Debugging

### S4.1 - Breakpoint Workflow
- **Goal**: Set breakpoint, trigger it, inspect variables
- **Page Requirements**: Page with button that calls function with local variables
- **Tool Chain**: `enable_debug_tools` → `breakpoint(set)` → `click_element` (trigger) → `call_stack` → `evaluate`
- **Metrics Focus**: F1, F2, A5

### S4.2 - Step Through Logic
- **Goal**: Step through a function to understand flow
- **Page Requirements**: Function with conditional logic (if/else branches)
- **Tool Chain**: (paused at breakpoint) → `step(over)` multiple times → observe flow
- **Metrics Focus**: F3, B6 (step context)

### S4.3 - Async Debugging
- **Goal**: Debug async code with promises
- **Page Requirements**: Button that triggers async fetch, process result
- **Tool Chain**: Breakpoint in async function → step → inspect awaited values
- **Metrics Focus**: F4, E4

## Scenario Set 5: Connection Management

### S5.1 - Multi-Tab Management
- **Goal**: Open multiple tabs, switch between them
- **Page Requirements**: App that opens new tabs (e.g., "Open in new tab" link)
- **Tool Chain**: `target(list)` → `target(switch)`
- **Metrics Focus**: B1, A1

### S5.2 - SPA Navigation
- **Goal**: Handle client-side routing in SPA
- **Page Requirements**: React/Vue-style SPA with client-side routes
- **Tool Chain**: `navigate` → `query_elements` → observe SPA behavior
- **Metrics Focus**: E2, B3

## Scenario Set 6: Edge Cases & Stress Tests

### S6.1 - Large DOM
- **Goal**: Query page with 1000+ elements
- **Page Requirements**: Table/list with 500+ rows
- **Tool Chain**: `query_elements` → handle limit gracefully
- **Metrics Focus**: B5, C3

### S6.2 - Rapid State Changes
- **Goal**: Interact with page that changes frequently
- **Page Requirements**: Live-updating dashboard (simulated with setInterval)
- **Tool Chain**: Actions during updates, verify consistency
- **Metrics Focus**: E3, E4

### S6.3 - iFrame Interaction
- **Goal**: Query elements inside iframes
- **Page Requirements**: Page with embedded iframe containing form
- **Tool Chain**: Attempt query, observe behavior/limitations
- **Metrics Focus**: E2, B4
