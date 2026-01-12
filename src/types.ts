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
  columnNumber: number;
  condition?: string;
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
  foundAfterDepthFilter: number;
  filteredByDepth: number;
  maxDepth: number;
  elements: ElementInfo[];
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
  depth: number;
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
}

/**
 * Child element info for depth-limited elements
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
}
