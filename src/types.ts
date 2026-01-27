/**
 * Shared types for Cherry Chrome MCP
 */

import type { Browser, Page, CDPSession } from 'puppeteer';

/**
 * CDP Debugger.paused event parameters
 */
export interface DebuggerPausedEvent {
  callFrames: CallFrame[];
  reason: string;
  data?: unknown;
  hitBreakpoints?: string[];
  asyncStackTrace?: unknown;
}

/**
 * CDP call frame from Debugger.paused
 */
export interface CallFrame {
  callFrameId: string;
  functionName: string;
  location: {
    scriptId: string;
    lineNumber: number;
    columnNumber?: number;
  };
  url: string;
  scopeChain: Scope[];
  this: unknown;
}

/**
 * CDP scope from call frame
 */
export interface Scope {
  type: 'global' | 'local' | 'with' | 'closure' | 'catch' | 'block' | 'script' | 'eval' | 'module' | 'wasm-expression-stack';
  object: unknown;
  name?: string;
}

/**
 * Breakpoint information stored per connection
 */
export interface BreakpointInfo {
  url: string;
  lineNumber: number;
  columnNumber?: number;
  condition?: string;
}

/**
 * Snapshot of element state for DOM diffing
 */
export interface ElementSnapshot {
  tag: string;
  text: string;
  visible: boolean;
  disabled?: boolean;
  value?: string;
  classes: string[];
}

/**
 * DOM snapshot capturing page state at a point in time
 */
export interface DOMSnapshot {
  timestamp: number;
  navigationEpoch: number;
  counts: {
    total: number;
    buttons: number;
    inputs: number;
    links: number;
    forms: number;
    visible: number;
  };
  keyElements: Record<string, ElementSnapshot>;
}

/**
 * Change details for a single element
 */
export interface ElementChange {
  selector: string;
  changes: string[];
}

/**
 * Addition or removal details for a single element
 */
export interface ElementAddRemove {
  selector: string;
  element: ElementSnapshot;
}

/**
 * Count change details
 */
export interface CountChange {
  before: number;
  after: number;
}

/**
 * Difference between two DOM snapshots
 */
export interface DOMDiff {
  hasChanges: boolean;
  countChanges: Record<string, CountChange>;
  added: ElementAddRemove[];
  removed: ElementAddRemove[];
  changed: ElementChange[];
}

/**
 * A Chrome connection managed by BrowserManager
 */
export interface Connection {
  /** Puppeteer Browser instance */
  browser: Browser;
  /** Current active page */
  page: Page;
  /** CDP session for debugger commands */
  cdpSession: CDPSession | null;
  /** WebSocket URL for this connection */
  wsUrl: string;
  /** Debugger paused state (null if not paused) */
  pausedData: DebuggerPausedEvent | null;
  /** Tracked breakpoints */
  breakpoints: Map<string, BreakpointInfo>;
  /** Whether debugger is enabled */
  debuggerEnabled: boolean;
  /** Captured console messages */
  consoleLogs: ConsoleMessage[];
  /** Whether console capture is enabled */
  consoleEnabled: boolean;
  /** Previous step variables for change tracking (P2) */
  previousStepVars?: Record<string, string>;
  /** Navigation epoch - increments on each full navigation/reload */
  navigationEpoch: number;
  /** Timestamp of last navigation */
  lastNavigationTime: number;
  /** HMR update count since last navigation */
  hmrUpdateCount: number;
  /** Timestamp of last HMR update (null if none) */
  lastHmrTime: number | null;
  /** Timestamp of last get_console_logs call (null if never called) */
  lastConsoleQuery: number | null;
  /** Navigation epoch at last query (null if never queried) */
  lastQueryEpoch: number | null;
  /** Last DOM snapshot for diffing (null if no snapshot taken) */
  lastDOMSnapshot?: DOMSnapshot | null;
}

/**
 * Connection status for listing
 */
export interface ConnectionStatus {
  url: string;
  active: boolean;
  paused: boolean;
  debuggerEnabled: boolean;
}

/**
 * Result of query_elements JavaScript execution
 */
export interface QueryElementsResult {
  found: number;
  afterVisibilityFilter?: number;
  afterTextFilter?: number;
  hiddenFiltered?: number;
  textFiltered?: number;
  elements: ElementInfo[];
}

/**
 * Interactive element info for elements with interactive descendants
 */
export interface InteractiveInfo {
  items: string[];
  more: number;
}

/**
 * Element information returned by query_elements
 */
export interface ElementInfo {
  index: number;
  selector: string;
  tag: string;
  text: string;
  id: string | null;
  classes: string[];
  visible: boolean;
  childInfo: ChildInfo | null;
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  attributes: {
    type: string | null;
    name: string | null;
    placeholder: string | null;
    value: string | null;
  };
  /** Element's opening tag HTML with all attributes (no children) */
  html: string;
  /** CSS-like structure skeleton showing child pattern (null if no children) */
  structure: string | null;
  /** Interactive descendants with their selectors (empty if no interactive children) */
  interactive: InteractiveInfo;
}

/**
 * Child element info for elements with children
 */
export interface ChildInfo {
  directChildren: number;
  totalDescendants: number;
}

/**
 * Result of click/fill JavaScript execution
 */
export interface DomActionResult {
  success: boolean;
  error?: string;
  clicked?: string;
  filled?: string;
  text?: string;
  type?: string;
}

/**
 * Tool result content
 */
export interface ToolContent {
  type: 'text';
  text: string;
}

/**
 * Tool result
 */
export interface ToolResult {
  content: ToolContent[];
  isError?: boolean;
}

/**
 * Stack trace location from console message
 */
export interface StackTraceLocation {
  /** Source URL */
  url?: string;
  /** Line number (0-based from Puppeteer, we convert to 1-based) */
  lineNumber?: number;
  /** Column number (0-based) */
  columnNumber?: number;
}

/**
 * Console message captured from Runtime.consoleAPICalled
 */
export interface ConsoleMessage {
  /** Log level: log, info, warn, error, debug */
  level: string;
  /** Message text (short version) */
  text: string;
  /** Full stack trace string for errors (from Error.stack) */
  stackTrace?: string;
  /** Stack trace locations (from Puppeteer's stackTrace()) */
  stackLocations?: StackTraceLocation[];
  /** Timestamp when captured */
  timestamp: number;
  /** Source URL if available */
  url?: string;
  /** Line number if available */
  lineNumber?: number;
  /** Navigation epoch when message was captured */
  navigationEpoch: number;
}

/**
 * Page inventory for element suggestions
 */
export interface PageInventory {
  /** Class names with their occurrence counts */
  classCounts: Record<string, number>;
  /** ID values found on the page */
  ids: string[];
  /** Tag names with their occurrence counts */
  tagCounts: Record<string, number>;
  /** Data attributes with their occurrence counts */
  dataAttrs: Record<string, number>;
  /** Interactive element counts */
  interactive: {
    buttons: number;
    inputs: number;
    links: number;
    forms: number;
  };
  /** Total element count */
  totalElements: number;
}

/**
 * A selector suggestion with metadata
 */
export interface SelectorSuggestion {
  /** The suggested CSS selector */
  selector: string;
  /** Number of elements matching this selector */
  count: number;
  /** Reason for the suggestion */
  reason: string;
}

/**
 * Selector candidate for inspect_element
 */
export interface SelectorCandidate {
  /** The generated CSS selector */
  selector: string;
  /** Stability score (0-100) - higher is more stable */
  stability: number;
  /** Strategy used to generate selector (e.g., "ID", "data-testid", "class") */
  strategy: string;
  /** Number of elements matching this selector on the page */
  count: number;
  /** Element tag name */
  tag: string;
  /** Element text content (truncated) */
  text: string;
  /** Whether element is visible */
  visible: boolean;
  /** Element HTML (opening tag only) */
  html: string;
}

/**
 * Result of inspect_element operation
 */
export interface InspectElementResult {
  /** Number of candidates found */
  candidatesFound: number;
  /** Ranked selector candidates */
  candidates: SelectorCandidate[];
  /** Query description (if provided) */
  query?: string;
}

/**
 * Arguments for inspect_element tool
 */
export interface InspectElementArgs {
  /** Natural language description of element (e.g., "the login button") */
  description?: string;
  /** Text content to match (exact substring) */
  text_contains?: string;
  /** Spatial matching - find elements near another */
  near?: {
    /** Reference selector */
    selector: string;
    /** Direction filter (optional) */
    direction?: 'above' | 'below' | 'left' | 'right' | 'inside';
  };
  /** Attribute filters */
  attributes?: {
    /** Role attribute */
    role?: string;
    /** ARIA label */
    aria_label?: string;
    /** Data-testid attribute (supports wildcard *) */
    data_testid?: string;
    /** Placeholder text */
    placeholder?: string;
    /** Input type */
    type?: string;
  };
  /** Filter by tag name (button, input, a, etc.) */
  tag?: string;
  /** Only return high-stability selectors (ID, data-testid) */
  strict_stability?: boolean;
  /** Maximum candidates to return (default: 3) */
  limit?: number;
  /** Chrome connection to use */
  connection_id?: string;
}

// ============================================================================
// Page Extractor Types
// ============================================================================

/**
 * Configuration options for extractors
 */
export interface ExtractorConfig {
  /** Maximum items to return */
  limit?: number;
  /** Include hidden elements (display:none, visibility:hidden, zero size) */
  includeHidden?: boolean;
}

/**
 * Result wrapper for extractor functions
 */
export interface ExtractorResult<T> {
  /** Extracted items (after limits applied) */
  items: T[];
  /** Total found before limiting */
  total: number;
  /** Whether limit was applied */
  truncated: boolean;
}

/**
 * Focused element information
 */
export interface FocusedElement {
  /** Element tag name */
  tag: string;
  /** Element ID if present */
  id?: string;
  /** Element name attribute if present */
  name?: string;
  /** Input type if applicable */
  type?: string;
  /** CSS selector to target element */
  selector: string;
}

/**
 * Button information
 */
export interface ButtonInfo {
  /** Full opening tag HTML */
  html: string;
  /** Button text content */
  text: string;
  /** Whether button has onclick or event listeners */
  hasHandler: boolean;
  /** Whether button is disabled */
  disabled: boolean;
  /** CSS selector to target button */
  selector: string;
}

/**
 * Link information
 */
export interface LinkInfo {
  /** Link text content */
  text: string;
  /** Link href attribute */
  href: string;
  /** CSS selector to target link */
  selector: string;
}

/**
 * Input field information
 */
export interface InputInfo {
  /** Input type (text, email, password, etc.) */
  type: string;
  /** Input name attribute if present */
  name?: string;
  /** Input ID if present */
  id?: string;
  /** Current value */
  value?: string;
  /** Placeholder text if present */
  placeholder?: string;
  /** CSS selector to target input */
  selector: string;
}

/**
 * Form information
 */
export interface FormInfo {
  /** Form action attribute if present */
  action?: string;
  /** Form method attribute if present */
  method?: string;
  /** Number of inputs in form */
  inputCount: number;
  /** CSS selector to target form */
  selector: string;
  /** Child inputs (limited) */
  inputs: InputInfo[];
}

/**
 * Toggle/checkbox/switch information
 */
export interface ToggleInfo {
  /** Label text if present */
  label?: string;
  /** Whether toggle is checked */
  checked: boolean;
  /** CSS selector to target toggle */
  selector: string;
}

/**
 * Alert/status message information
 */
export interface AlertInfo {
  /** ARIA role (alert or status) */
  role: string;
  /** Alert text content */
  text: string;
  /** CSS selector to target alert */
  selector: string;
}

/**
 * Modal/dialog information
 */
export interface ModalInfo {
  /** Whether modal is currently open */
  open: boolean;
  /** Modal title/label if present */
  title?: string;
  /** CSS selector to target modal */
  selector: string;
}

/**
 * Form validation error information
 */
export interface ErrorInfo {
  /** Element with error state */
  element: string;
  /** Error message content if present */
  message?: string;
  /** CSS selector to target errored element */
  selector: string;
}

/**
 * Landmark/region information
 */
export interface LandmarkInfo {
  /** Landmark type (header, nav, main, etc.) */
  type: string;
  /** ARIA label if present */
  label?: string;
  /** CSS selector to target landmark */
  selector: string;
}

/**
 * Tab group information
 */
export interface TabGroupInfo {
  /** Tabs in group with labels and selection state */
  tabs: Array<{ label: string; selected: boolean }>;
  /** CSS selector to target tab group */
  selector: string;
}

/**
 * Heading information
 */
export interface HeadingInfo {
  /** Heading level (1-6) */
  level: number;
  /** Heading text content */
  text: string;
  /** CSS selector to target heading */
  selector: string;
}
