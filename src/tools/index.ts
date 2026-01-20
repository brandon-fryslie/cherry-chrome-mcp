/**
 * Tool exports and registration
 */

// Chrome connection tools (original exports for backward compatibility)
export {
  chromeConnect,
  chromeLaunch,
  chromeListConnections,
  chromeSwitchConnection,
  chromeDisconnect,
  listTargets,
  switchTarget,
} from './chrome.js';

// New consolidated chrome tools
export {
  chrome,
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
} from './dom.js';

// Selector builder / element inspector
export {
  inspectElement,
} from './inspect.js';

// Debugger tools (original exports for backward compatibility)
export {
  debuggerEnable,
  debuggerSetBreakpoint,
  debuggerGetCallStack,
  debuggerEvaluateOnCallFrame,
  debuggerStepOver,
  debuggerStepInto,
  debuggerStepOut,
  debuggerResume,
  debuggerPause,
  debuggerRemoveBreakpoint,
  debuggerSetPauseOnExceptions,
} from './debugger.js';

// New consolidated debugger tools
export {
  step,
  execution,
  breakpoint,
  callStack,
  evaluate,
  pauseOnExceptions,
} from './debugger.js';
