# Implementation Context: Metrics and Scenarios Design

Sprint: SPRINT-20260120-metrics-scenarios
Generated: 2026-01-20

## Tool Surface Reference

This document captures the tool surface being tested for quick reference during scenario design.

### Smart Mode Tools (17 total)

#### Connection Management (5)
| Tool | Purpose | Key Parameters |
|------|---------|----------------|
| `chrome` | Connect to existing or launch new Chrome | `action: connect\|launch`, `port`, `host` |
| `chrome_list_connections` | Show all connections | - |
| `chrome_switch_connection` | Change active connection | `connection_id` |
| `chrome_disconnect` | Close a connection | `connection_id` |
| `target` | List or switch browser targets | `action: list\|switch`, `url`, `title`, `index` |

#### DOM Query (2)
| Tool | Purpose | Key Parameters |
|------|---------|----------------|
| `query_elements` | Find elements by CSS selector | `selector`, `limit`, `text_contains`, `include_hidden` |
| `inspect_element` | Discover selectors from description | `description`, `text_contains`, `tag`, `attributes`, `near` |

#### DOM Actions (4)
| Tool | Purpose | Key Parameters |
|------|---------|----------------|
| `click_element` | Click an element | `selector`, `index`, `include_context` |
| `fill_element` | Type into input | `selector`, `text`, `index`, `submit`, `include_context` |
| `navigate` | Go to URL | `url`, `include_context` |
| `get_console_logs` | Get browser console | `filter_level`, `limit` |

#### Debugger (7)
| Tool | Purpose | Key Parameters |
|------|---------|----------------|
| `enable_debug_tools` | Enable debugger | - |
| `breakpoint` | Set or remove breakpoint | `action: set\|remove`, `url`, `line_number`, `condition`, `breakpoint_id` |
| `step` | Step through code | `direction: over\|into\|out`, `include_context` |
| `execution` | Resume or pause | `action: resume\|pause`, `include_context` |
| `call_stack` | Get call frames | - |
| `evaluate` | Eval expression in frame | `expression`, `call_frame_id` |
| `pause_on_exceptions` | Configure exception pausing | `state: none\|uncaught\|all` |

## Key Tool Features to Test

### query_elements Outputs
- Element index, tag, ID, classes
- Text content (truncated)
- HTML snippet (opening tag)
- Structure skeleton (CSS-like child pattern)
- Interactive elements list
- Attributes (type, name, placeholder, value)
- Visibility status
- Child counts (direct, total)
- **On 0 results**: Smart suggestions (similar selectors, page structure)

### inspect_element Outputs
- Ranked selector candidates
- Stability scores (ID=95, data-testid=90, aria-label=85, etc.)
- Strategy used (ID, data-testid, aria-label, role+aria, unique class, tag+class, nth-child)
- Element details (tag, text, visibility, HTML)

### Action Context (click, fill, navigate)
- DOM diff (added, removed, changed elements)
- Element state after action
- Page title and element summary (navigate)

### Console Freshness
- Navigation epoch
- HMR update tracking
- Delta vs. last query

### Debugger Context (step, execution pause)
- Current location (file, line, column)
- Local variables with [CHANGED] markers
- Recent console logs

## Scenario Design Guidelines

1. **One primary goal per scenario** - Don't combine multiple objectives
2. **Specific page requirements** - Must be implementable, not vague
3. **Natural tool chain** - What a reasonable agent would attempt
4. **Measurable outcomes** - Can verify success/failure objectively
5. **Complexity gradient** - Start simple, increase within category

## Future Sprint Considerations

When building webapps:
- Use semantic HTML (helps selector stability)
- Include data-testid attributes on key elements
- Make JS debuggable (not minified, source maps optional)
- Keep state predictable (seed random, disable animations for testing)
- Provide reset mechanism (clear state between tests)

## Reference Materials

- `CLAUDE.md`: Full tool documentation with examples
- `src/tools/dom.ts`: query_elements implementation details
- `src/tools/inspect.ts`: inspect_element strategies and scoring
- `src/tools/debugger.ts`: Debugger tool behaviors
- `.agent_planning/ROADMAP.md`: Feature status and pain points
