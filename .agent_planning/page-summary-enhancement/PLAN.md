# Page Summary Enhancement Plan

## Goal

Replace the current useless page summary:
```
Page Summary:
  31 buttons
  40 inputs
  1 links
  0 forms
```

With actionable, semantically-extracted information that helps agents navigate and interact with any web page.

## Design Principles

1. **Framework-agnostic**: Only use HTML semantics and ARIA roles - no framework-specific detection
2. **Composable**: Build as independent extractors that can be reused across the codebase
3. **Deterministic**: Algorithmic extraction, no LLM interpretation required
4. **Bounded output**: Each extractor has configurable limits to prevent token bloat

## Architecture

### New Module: `src/tools/page-extractors.ts`

A collection of independent, composable extractor functions that each:
- Take a Puppeteer `Page` as input
- Return a typed result object
- Can be used standalone or combined
- Have configurable limits

```
src/tools/
├── page-extractors.ts      # NEW: Composable extraction functions
├── page-summary.ts         # NEW: Orchestrates extractors into summary output
├── context.ts              # Existing: Will import from page-summary.ts
└── ...
```

### Extractor Interface

```typescript
interface ExtractorConfig {
  limit?: number;           // Max items to return
  includeHidden?: boolean;  // Include hidden elements
}

interface ExtractorResult<T> {
  items: T[];
  total: number;            // Total found before limiting
  truncated: boolean;       // Whether limit was applied
}
```

### Extractors to Implement

| Extractor | Selector/Detection | Output Type |
|-----------|-------------------|-------------|
| `extractFocused` | `document.activeElement` | `FocusedElement` |
| `extractButtons` | `button`, `[role="button"]` | `ButtonInfo[]` |
| `extractLinks` | `a[href]` | `LinkInfo[]` |
| `extractInputs` | `input`, `textarea`, `select` | `InputInfo[]` |
| `extractForms` | `form` | `FormInfo[]` |
| `extractToggles` | `[type="checkbox"]`, `[role="switch"]` | `ToggleInfo[]` |
| `extractAlerts` | `[role="alert"]`, `[role="status"]` | `AlertInfo[]` |
| `extractModals` | `[role="dialog"]`, `[aria-modal="true"]` | `ModalInfo[]` |
| `extractErrors` | `[aria-invalid="true"]`, `[aria-errormessage]` | `ErrorInfo[]` |
| `extractLandmarks` | `header`, `nav`, `main`, `aside`, `footer`, `[role="banner"]`, etc. | `LandmarkInfo[]` |
| `extractTabs` | `[role="tablist"]` > `[role="tab"]` | `TabGroupInfo[]` |
| `extractHeadings` | `h1`-`h6` | `HeadingInfo[]` |

### Type Definitions (add to `types.ts`)

```typescript
// Focused element
interface FocusedElement {
  tag: string;
  id?: string;
  name?: string;
  type?: string;
  selector: string;
}

// Button info
interface ButtonInfo {
  html: string;           // Full opening tag
  text: string;           // Button text content
  hasHandler: boolean;    // Has onclick or event listeners
  disabled: boolean;
  selector: string;       // Best selector to target it
}

// Link info
interface LinkInfo {
  text: string;
  href: string;
  selector: string;
}

// Input info
interface InputInfo {
  type: string;           // text, email, password, etc.
  name?: string;
  id?: string;
  value?: string;         // Current value
  placeholder?: string;
  selector: string;
}

// Form info
interface FormInfo {
  action?: string;
  method?: string;
  inputCount: number;
  selector: string;
  inputs: InputInfo[];    // Child inputs (limited)
}

// Toggle info (checkbox, switch)
interface ToggleInfo {
  label?: string;
  checked: boolean;
  selector: string;
}

// Alert info
interface AlertInfo {
  role: string;           // alert or status
  text: string;
  selector: string;
}

// Modal info
interface ModalInfo {
  open: boolean;
  title?: string;
  selector: string;
}

// Error info
interface ErrorInfo {
  element: string;        // Element with error
  message?: string;       // aria-errormessage content
  selector: string;
}

// Landmark info
interface LandmarkInfo {
  type: string;           // header, nav, main, etc.
  label?: string;         // aria-label if present
  selector: string;
}

// Tab group info
interface TabGroupInfo {
  tabs: { label: string; selected: boolean }[];
  selector: string;
}

// Heading info
interface HeadingInfo {
  level: number;          // 1-6
  text: string;
  selector: string;
}
```

### Page Summary Composer

```typescript
interface PageSummaryConfig {
  // Which extractors to run
  include?: {
    focused?: boolean;    // default: true
    buttons?: boolean;    // default: true
    links?: boolean;      // default: true
    inputs?: boolean;     // default: true
    forms?: boolean;      // default: true
    toggles?: boolean;    // default: true
    alerts?: boolean;     // default: true
    modals?: boolean;     // default: true
    errors?: boolean;     // default: true
    landmarks?: boolean;  // default: true
    tabs?: boolean;       // default: true
    headings?: boolean;   // default: false (verbose)
  };
  // Limits per category
  limits?: {
    buttons?: number;     // default: 10
    links?: number;       // default: 10
    inputs?: number;      // default: 10
    forms?: number;       // default: 5
    toggles?: number;     // default: 10
    alerts?: number;      // default: 5
    modals?: number;      // default: 3
    errors?: number;      // default: 10
    landmarks?: number;   // default: 10
    tabs?: number;        // default: 5
    headings?: number;    // default: 10
  };
}

async function gatherPageSummary(
  page: Page,
  config?: PageSummaryConfig
): Promise<string>
```

### Output Format

```
── Focused ──
input#search-blocks (text)

── Buttons (7) ──
<button>New</button>
<button>Open</button>
<button>Save</button>
<button>Export</button>
+3 more...

── Inputs (3) ──
#project-name (text): "Shape Kaleidoscope" [readonly]
#search-blocks (text): "" [focused]
#default-patch (number): 5

── Toggles (2) ──
[x] Enable Debug Mode
[x] Show Minimap

── Landmarks ──
header, nav (Library), main, aside (Inspector), aside (Settings)

── Tabs ──
[Console] [Logs] [Continuity] [*Compilation*]

── Alerts ──
None

── Modals ──
None

── Errors ──
None
```

## Implementation Tasks

### Phase 1: Core Infrastructure

1. **Create `src/tools/page-extractors.ts`**
   - Define extractor interface
   - Implement helper functions (selector generation, text truncation)
   - Single browser evaluate call pattern for efficiency

2. **Add types to `src/types.ts`**
   - All extraction result types
   - Config types

### Phase 2: Implement Extractors

Each extractor runs a single `page.evaluate()` call and returns typed results.

3. **Implement basic extractors** (most useful, lowest complexity)
   - `extractFocused`
   - `extractButtons`
   - `extractLinks`
   - `extractInputs`

4. **Implement form-related extractors**
   - `extractForms` (includes child input summary)
   - `extractToggles`
   - `extractErrors`

5. **Implement structural extractors**
   - `extractLandmarks`
   - `extractTabs`
   - `extractHeadings`

6. **Implement state extractors**
   - `extractAlerts`
   - `extractModals`

### Phase 3: Summary Composer

7. **Create `src/tools/page-summary.ts`**
   - `gatherPageSummary()` function
   - Formatting logic
   - Config handling

8. **Update `src/tools/context.ts`**
   - Replace `gatherNavigateContext` body with call to `gatherPageSummary`
   - Keep function signature for backward compatibility

### Phase 4: Testing & Refinement

9. **Add tests**
   - Unit tests for individual extractors
   - Integration test with sample HTML pages

10. **Documentation**
    - Update CLAUDE.md with new capabilities
    - Document extractor reuse patterns

## Reuse Opportunities

The extractors can be reused in:

- **`query_elements`**: Add extractor results as context when zero results
- **`click_element` / `fill_element`**: Show nearby interactive elements on failure
- **`inspect_element`**: Enhance with landmark/tab context
- **Future tools**: Element discovery, accessibility auditing

## Confidence Level

**HIGH** - This is straightforward extraction with well-defined selectors. No external dependencies, no architectural risk.

## Dependencies

None - uses existing Puppeteer Page API.

## Estimated Complexity

- Phase 1: Small (infrastructure setup)
- Phase 2: Medium (12 extractors, but each is simple)
- Phase 3: Small (orchestration)
- Phase 4: Small (testing)

Total: ~400-500 lines of new code across 2 new files + type additions.
