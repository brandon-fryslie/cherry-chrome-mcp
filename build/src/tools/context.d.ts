/**
 * Context Gathering for P2: Smart Auto-Bundled Responses
 *
 * These functions gather additional context to auto-include in tool responses,
 * eliminating the need for follow-up tool calls.
 */
import type { Page } from 'puppeteer';
import type { DOMSnapshot, DOMDiff } from '../types.js';
/**
 * Gather suggestions when query_elements returns zero results
 *
 * Analyzes the page to suggest alternative selectors based on fuzzy matching
 * against the attempted selector.
 */
export declare function gatherZeroResultSuggestions(page: Page, attemptedSelector: string): Promise<string>;
/**
 * Gather context when execution pauses (breakpoint, exception, manual pause)
 *
 * Returns formatted context including:
 * - Current location
 * - Call stack (top 5 frames)
 * - Local variables (top 10)
 * - Recent console logs (last 3)
 */
export declare function gatherPauseContext(connectionId?: string): Promise<string>;
/**
 * Gather context after a step operation
 *
 * Returns formatted context including:
 * - New location
 * - Local variables with [CHANGED] markers
 * - New console logs since last step
 */
export declare function gatherStepContext(connectionId?: string, previousVars?: Record<string, string>): Promise<string>;
/**
 * Gather context after navigation
 *
 * Returns formatted context including:
 * - Page title
 * - Console errors (if any)
 * - Element summary (buttons, inputs, links)
 */
export declare function gatherNavigateContext(page: Page): Promise<string>;
/**
 * Gather context after a DOM action (click, fill)
 *
 * Returns formatted context including:
 * - Element state after action
 * - DOM diff (if beforeSnapshot provided)
 */
export declare function gatherActionContext(page: Page, selector: string, action: 'click' | 'fill', beforeSnapshot?: DOMSnapshot | null, connectionId?: string): Promise<string>;
/**
 * Capture a snapshot of the current DOM state
 *
 * Captures element counts and key interactive elements for diffing.
 * Only captures interactive elements, not the full DOM tree.
 */
export declare function captureDOMSnapshot(page: Page): Promise<DOMSnapshot>;
/**
 * Compute the difference between two DOM snapshots
 *
 * Detects:
 * - Added elements (present in 'after', not in 'before')
 * - Removed elements (present in 'before', not in 'after')
 * - Changed elements (text, visibility, disabled, value)
 * - Count differences (buttons, inputs, etc.)
 */
export declare function computeDOMDiff(before: DOMSnapshot, after: DOMSnapshot): DOMDiff;
/**
 * Format a DOM diff as a human-readable string
 *
 * Outputs:
 * - "Added:" section (up to 5 items)
 * - "Removed:" section (up to 5 items)
 * - "Changed:" section (up to 5 items)
 * - Count summary line
 * - "No DOM changes detected" if no changes
 */
export declare function formatDOMDiff(diff: DOMDiff): string;
//# sourceMappingURL=context.d.ts.map