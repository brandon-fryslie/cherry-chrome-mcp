/**
 * Context Gathering for P2: Smart Auto-Bundled Responses
 *
 * These functions gather additional context to auto-include in tool responses,
 * eliminating the need for follow-up tool calls.
 */
import type { Page } from 'puppeteer';
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
 * - Triggered console logs (last 3)
 * - Element state after action
 */
export declare function gatherActionContext(page: Page, selector: string, action: 'click' | 'fill'): Promise<string>;
//# sourceMappingURL=context.d.ts.map