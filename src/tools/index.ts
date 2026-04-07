/**
 * Tool exports and registration
 */

// Chrome connection tools
export {
  chromeListConnections,
  chromeSwitchConnection,
  chromeDisconnect,
  listTargets,
  switchTarget,
  connect,
  target,
  enableDebugTools,
} from './chrome.js';

// DOM interaction tools
export {
  queryElements,
  clickElement,
  fillElement,
  navigate,
  getConsoleLogs,
  scroll,
  getPageText,
  rightClick,
  doubleClick,
  focus,
  blur,
  pressKey,
  selectOption,
} from './dom.js';

// Console logs pure functions (for testing and reuse)
export {
  filterLogsByLevel,
  limitLogs,
  determineChangeStatus,
  extractPageState,
  processLogs,
  formatTimeSince,
  formatPageStateHeader,
  formatLogWithStack,
  formatProcessedLogs,
  formatConsoleLogsOutput,
  updateQueryTracking,
} from './console-logs.js';
export type {
  PageState,
  ProcessedLogs,
  ConsoleLogsQuery,
} from './console-logs.js';

// Selector builder / element inspector
export {
  inspectElement,
} from './inspect.js';

// Debugger tools
export {
  step,
  execution,
  breakpoint,
  callStack,
  evaluate,
  pauseOnExceptions,
} from './debugger.js';
