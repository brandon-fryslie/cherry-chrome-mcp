# Cherry Chrome MCP Roadmap

Last updated: 2026-01-18

## Phase 1: Usability Improvements [ACTIVE]

Goal: Make debugging web apps easier and more reliable for AI agents

### Topics

#### target-management [PROPOSED]

**Description**: Tools to discover and switch between browser targets (pages, workers, service workers) within a connection.

**Tools to implement**:
- `list_targets` - Show all pages/workers/service workers for a connection with:
  - Index number for easy selection
  - Target type (page, worker, service_worker, iframe)
  - Title and URL
  - Active indicator showing which target is currently selected

- `switch_target` - Change active page within connection by:
  - Index number (e.g., `switch_target(0)`)
  - Title pattern (e.g., `switch_target("GitKraken Desktop")`)
  - URL pattern (e.g., `switch_target("*index.html*")`)

**Pain point**: Currently Puppeteer grabs the first available page, which may not be the main UI. Required shell-out to `curl + python` to even see what targets exist.

**Directory**: `.agent_planning/target-management/`

---

#### connection-diagnostics [PROPOSED]

**Description**: Better visibility into connection state and failure modes.

**Improvements**:
- Detect and warn about port conflicts (multiple processes listening on same port)
- Surface clearer error messages when connections hang or fail
- Show connection health/state in `chrome_list_connections` output
- Add timeout visibility (show how long operations are taking)

**Pain point**: Connection hung for minutes with no feedback. Had to use `lsof` to discover two processes were fighting over the same port.

**Directory**: `.agent_planning/connection-diagnostics/`

---

#### console-log-improvements [PROPOSED]

**Description**: Better console log visibility and filtering for efficient triage.

**Tools to implement**:
- `console_stats` - Show log counts by level without fetching messages:
  - Total message count
  - Count by level (errors, warnings, info, log, debug)
  - Quick overview without pulling full message payload

- Add `pattern` parameter to `get_console_logs` - Filter by text/regex:
  - `get_console_logs(pattern="CommitStore", limit=10)`
  - `get_console_logs(pattern="error|failed", limit=20)`
  - Supports both substring and regex patterns

**Pain point**: With 1000+ messages, had to pull all logs to see counts or find specific entries. No way to quickly check "are there errors?" or search without manual scanning.

**Directory**: `.agent_planning/console-log-improvements/`

---

## Phase 2: Agent Effectiveness [ACTIVE]

Goal: Reduce wasted agent turns through better feedback and guidance

### Topics

#### smart-element-suggestions [PLANNED]

**Description**: When `query_elements` returns 0 results, analyze the page and suggest alternative selectors.

**Output example**:
```
No elements found matching selector: .login-btn

Similar selectors that exist:
  - .login-button (3 elements) - class contains "login"
  - #loginBtn (1 element) - ID contains "login"

Page structure: 12 buttons, 5 inputs, 8 links
```

**Pain point**: Agents waste turns guessing at selectors with no guidance.

**Directory**: `.agent_planning/smart-element-suggestions/`

---

#### page-state-diffing [PLANNED]

**Description**: Track DOM changes after actions (click, fill, navigate). Show what was added/removed/changed.

**Output example**:
```
--- DOM Changes ---
Added: .success-toast, .confirmation-modal
Removed: .loading-spinner
Changed: #status text "Pending" → "Complete"
```

**Pain point**: Agents can't see what changed after an action without manual re-querying.

**Directory**: `.agent_planning/page-state-diffing/`

---

#### selector-builder [PLANNED]

**Description**: Interactive element discovery using natural language and spatial hints.

**Tool signature**:
```typescript
inspect_element({
  description: "the login button",      // Natural language
  near: { selector: "#header" },        // Spatial hints
  contains_text: "Sign In"              // Content hints
})
```

**Returns**: Best selector for the described element, using multiple strategies:
- Text content matching
- Position/layout analysis
- Attribute analysis (data-testid, aria-label, etc.)
- Suggests most stable selector (ID > unique class > nth-child)

**Pain point**: Agents guess at selectors when they could describe what they're looking for.

**Directory**: `.agent_planning/selector-builder/`

---

## Phase 3: Advanced Debugging [QUEUED]

Goal: Deep debugging capabilities for complex web apps

### Topics

(No topics yet)

---

## Phase 3: Developer Experience [QUEUED]

Goal: Polish and convenience features

### Topics

(No topics yet)
