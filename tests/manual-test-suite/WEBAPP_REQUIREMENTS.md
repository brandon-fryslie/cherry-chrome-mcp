# Webapp Requirements Summary

## Overview
This document outlines the requirements for the test webapps needed to support the Scenario Catalog. These webapps will be implemented in a future sprint.

## Webapp 1: Form-Heavy Application

### Purpose
Test selector refinement, form interactions, and hidden element discovery.

### Functional Requirements
- **Login Form**: Standard email/password with "Remember Me" checkbox (Supports S1.5, S2.2).
- **Registration Form**: Nested structure with repeated class names (e.g., address lines) to test selector refinement (Supports S1.2).
- **Conditional Fields**: Dropdown selection (e.g., "Account Type") that dynamically reveals new inputs (Supports S2.3).
- **Hidden Elements**: Modal dialogs and dropdown menus controlled by CSS display/visibility properties (Supports S1.4).
- **Button Variety**: Multiple buttons with distinct text labels, including one unique "Submit Order" (Supports S1.1).

## Webapp 2: Interactive Dashboard

### Purpose
Test dynamic updates, large DOMs, and console/state tracking.

### Functional Requirements
- **Toggle Elements**: Buttons that visibly change page state (e.g., show/hide panel) for DOM diffing (Supports S2.1).
- **Console Logging**: Actions that trigger specific console.log/warn/error messages (Supports S3.2).
- **Live Updates**: A section that updates content automatically (e.g., every 2s) to test race conditions and stability (Supports S6.2).
- **Data Table**: A table capable of rendering 500+ rows to test large DOM handling (Supports S6.1).

## Webapp 3: Debuggable Application

### Purpose
Test JavaScript debugger capabilities (breakpoints, stepping, scope).

### Functional Requirements
- **Local Variables**: Functions with clear local variable scopes for inspection (Supports S4.1).
- **Conditional Logic**: Functions with if/else branches to test stepping controls (Supports S4.2).
- **Async Operations**: Buttons that trigger `fetch` or `setTimeout` chains to test async debugging (Supports S4.3).
- **Intentional Errors**: A button that throws a `TypeError` to test error capture and stack traces (Supports S3.1).

## Webapp 4: Multi-Page/Tab Application

### Purpose
Test navigation, connection management, and frame handling.

### Functional Requirements
- **Client-Side Routing**: SPA architecture (e.g., simple hash router or History API) with multiple views (Supports S5.2).
- **New Tab Links**: Links with `target="_blank"` to test multi-tab management (Supports S5.1).
- **iFrames**: A page embedding another local page via iframe to test context boundaries (Supports S6.3).

## Technical Requirements (All Webapps)

- **Architecture**: Lightweight Node.js/Express or purely static files.
- **Dependency Free**: No external API calls; all data should be mocked/local.
- **Reproducibility**: State should be reset on reload.
- **No Complex Build**: Should be runnable with `npm start` or similar simple command.
- **Accessibility**: Use standard semantic HTML to ensure accessibility tree is populated (crucial for some MCP tools).
