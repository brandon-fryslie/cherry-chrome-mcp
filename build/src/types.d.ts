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
 * Console message captured from Runtime.consoleAPICalled
 */
export interface ConsoleMessage {
    /** Log level: log, info, warn, error, debug */
    level: string;
    /** Message text */
    text: string;
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
//# sourceMappingURL=types.d.ts.map