/**
 * DOM Interaction Tools
 * Ported from Python query_elements, click_element, fill_element, navigate, get_console_logs
 */

import { browserManager } from '../browser.js';
import {
  checkResultSize,
  successResponse,
  errorResponse,
  escapeForJs,
} from '../response.js';
import type { QueryElementsResult, DomActionResult } from '../types.js';
import { gatherNavigateContext, gatherActionContext } from './context.js';

/**
 * Format time difference as human-readable string
 */
function formatTimeSince(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

/**
 * Find elements by CSS selector and return their details.
 *
 * Returns up to 'limit' elements (default 5, max 20).
 * Use specific selectors to narrow results when needed.
 */
export async function queryElements(args: {
  selector: string;
  limit?: number;
  text_contains?: string;
  include_hidden?: boolean;
  connection_id?: string;
}): Promise<{ content: Array<{ type: 'text'; text: string }>; isError?: boolean }> {
  const selector = args.selector;
  let limit = args.limit ?? 5;

  // Enforce hard limit at 20
  if (limit > 20) {
    limit = 20;
  }

  try {
    const page = browserManager.getPageOrThrow(args.connection_id);
    const escapedSelector = escapeForJs(selector);

    // Prepare text_contains value for injection
    const textContainsValue = args.text_contains ? escapeForJs(args.text_contains) : null;
    const includeHidden = args.include_hidden ?? false;

    // JavaScript to execute in page context
    const script = `
      (() => {
        // Count total descendants
        function countDescendants(el) {
          let count = 0;
          function countRecursive(node) {
            for (const child of node.children) {
              count++;
              countRecursive(child);
            }
          }
          countRecursive(el);
          return count;
        }

        // Check if element is visible
        function isVisible(el) {
          // Check offsetParent (null for hidden elements, except body/html)
          if (el.offsetParent === null && el.tagName !== 'BODY' && el.tagName !== 'HTML') {
            // Could still be visible if it's fixed/sticky positioned
            const style = getComputedStyle(el);
            if (style.position !== 'fixed' && style.position !== 'sticky') {
              return false;
            }
          }

          const style = getComputedStyle(el);
          if (style.display === 'none') return false;
          if (style.visibility === 'hidden') return false;

          // Check for zero dimensions
          const rect = el.getBoundingClientRect();
          if (rect.width === 0 && rect.height === 0) return false;

          return true;
        }

        // Get all matching elements
        let elements = Array.from(document.querySelectorAll('${escapedSelector}'));
        const totalMatched = elements.length;

        // Apply visibility filter (unless include_hidden is true)
        const includeHidden = ${includeHidden};
        let hiddenCount = 0;
        if (!includeHidden) {
          const beforeFilter = elements.length;
          elements = elements.filter(el => isVisible(el));
          hiddenCount = beforeFilter - elements.length;
        }

        // Apply text filter
        const textContains = ${textContainsValue ? `'${textContainsValue}'` : 'null'};
        let textFilteredCount = 0;
        if (textContains) {
          const beforeFilter = elements.length;
          const searchLower = textContains.toLowerCase();
          elements = elements.filter(el => {
            const text = el.textContent || '';
            return text.toLowerCase().includes(searchLower);
          });
          textFilteredCount = beforeFilter - elements.length;
        }

        // Apply limit
        const limit = ${limit};
        const limitedElements = elements.slice(0, limit);

        return {
          found: totalMatched,
          afterVisibilityFilter: includeHidden ? totalMatched : totalMatched - hiddenCount,
          afterTextFilter: elements.length,
          hiddenFiltered: hiddenCount,
          textFiltered: textFilteredCount,
          elements: limitedElements.map((el, idx) => {
            const rect = el.getBoundingClientRect();

            // Show childInfo for ALL elements with children (not just at max depth)
            let childInfo = null;
            if (el.children.length > 0) {
              childInfo = {
                directChildren: el.children.length,
                totalDescendants: countDescendants(el)
              };
            }

            return {
              index: idx,
              selector: '${escapedSelector}',
              tag: el.tagName.toLowerCase(),
              text: el.textContent ? el.textContent.trim().substring(0, 100) : '',
              id: el.id || null,
              classes: el.className ? el.className.split(' ').filter(c => c) : [],
              visible: el.offsetParent !== null,
              childInfo: childInfo,
              position: {
                x: Math.round(rect.x),
                y: Math.round(rect.y),
                width: Math.round(rect.width),
                height: Math.round(rect.height)
              },
              attributes: {
                type: el.type || null,
                name: el.name || null,
                placeholder: el.placeholder || null,
                value: el.value !== undefined ? String(el.value).substring(0, 100) : null
              }
            };
          })
        };
      })()
    `;

    const data = (await page.evaluate(script)) as QueryElementsResult;

    if (data.found === 0) {
      return successResponse(`No elements found matching selector: ${selector}`);
    }

    // Build output with filter info
    const output: string[] = [];
    const total = data.found;
    const afterVisibility = data.afterVisibilityFilter ?? total;
    const afterText = data.afterTextFilter ?? afterVisibility;
    const shown = data.elements.length;

    // Show filter summary if filters are active
    if ((data.hiddenFiltered && data.hiddenFiltered > 0) || (data.textFiltered && data.textFiltered > 0)) {
      output.push(`Found ${total} element(s) matching '${selector}'`);

      if (data.hiddenFiltered && data.hiddenFiltered > 0) {
        output.push(`  Visibility filter: ${data.hiddenFiltered} hidden element(s) excluded`);
      }

      if (data.textFiltered && data.textFiltered > 0) {
        output.push(`  Text filter "${args.text_contains}": ${data.textFiltered} element(s) excluded`);
      }

      output.push(`Showing first ${shown} of ${afterText} remaining:`);
    } else {
      output.push(`Found ${total} element(s) matching '${selector}' (showing first ${shown}):`);
    }

    output.push('');

    for (const el of data.elements) {
      output.push(`[${el.index}] <${el.tag}>`);

      if (el.id) {
        output.push(`    ID: #${el.id}`);
      }
      if (el.classes && el.classes.length > 0) {
        output.push(`    Classes: ${el.classes.join(', ')}`);
      }
      if (el.text) {
        output.push(`    Text: ${el.text}`);
      }

      const attrs = el.attributes;
      const relevantAttrs: Record<string, string> = {};
      if (attrs.type) relevantAttrs['type'] = attrs.type;
      if (attrs.name) relevantAttrs['name'] = attrs.name;
      if (attrs.placeholder) relevantAttrs['placeholder'] = attrs.placeholder;
      if (attrs.value) relevantAttrs['value'] = attrs.value;

      if (Object.keys(relevantAttrs).length > 0) {
        output.push(`    Attributes: ${JSON.stringify(relevantAttrs)}`);
      }

      output.push(`    Visible: ${el.visible}`);

      // Show child info for elements with children
      if (el.childInfo) {
        const direct = el.childInfo.directChildren;
        const totalDesc = el.childInfo.totalDescendants;
        output.push(`    Children: ${direct} direct, ${totalDesc} total`);
      }

      output.push('');
    }

    // Add hint if results were truncated
    if (afterText > shown) {
      output.push(`[${afterText - shown} more element(s) not shown. Use a more specific selector to narrow results.]`);
      output.push('');
    }

    const result = output.join('\n');
    return successResponse(
      checkResultSize(result, undefined, 'query_elements', data)
    );
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : String(error));
  }
}

/**
 * Click an element matching the CSS selector.
 *
 * Use query_elements first to verify the element exists and get the correct index.
 * Auto-includes element state after action when include_context is true (default).
 */
export async function clickElement(args: {
  selector: string;
  index?: number;
  include_context?: boolean;
  connection_id?: string;
}): Promise<{ content: Array<{ type: 'text'; text: string }>; isError?: boolean }> {
  const selector = args.selector;
  const index = args.index ?? 0;
  const includeContext = args.include_context ?? true;

  try {
    const page = browserManager.getPageOrThrow(args.connection_id);
    const escapedSelector = escapeForJs(selector);

    // JavaScript click with fallback (ported from Python)
    const script = `
      (() => {
        const elements = document.querySelectorAll('${escapedSelector}');
        if (elements.length === 0) {
          return { success: false, error: 'No elements found matching selector' };
        }
        if (${index} >= elements.length) {
          return { success: false, error: 'Only ' + elements.length + ' element(s) found, index ${index} out of range' };
        }

        const element = elements[${index}];
        element.click();

        return {
          success: true,
          clicked: '<' + element.tagName.toLowerCase() + '> at index ${index}',
          text: element.textContent ? element.textContent.trim().substring(0, 50) : ''
        };
      })()
    `;

    const result = (await page.evaluate(script)) as DomActionResult;

    if (result.success) {
      let response = `Clicked ${result.clicked}: ${result.text || ''}`;

      // Add context if requested
      if (includeContext) {
        const context = await gatherActionContext(page, selector, 'click');
        if (context) {
          response += '\n' + context;
        }
      }

      return successResponse(response);
    } else {
      return errorResponse(`Failed: ${result.error}`);
    }
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : String(error));
  }
}

/**
 * Fill text into an input element matching the CSS selector.
 *
 * Use query_elements first to verify the input exists and get the correct index.
 * Auto-includes element state after action when include_context is true (default).
 */
export async function fillElement(args: {
  selector: string;
  text: string;
  index?: number;
  submit?: boolean;
  include_context?: boolean;
  connection_id?: string;
}): Promise<{ content: Array<{ type: 'text'; text: string }>; isError?: boolean }> {
  const selector = args.selector;
  const text = args.text;
  const index = args.index ?? 0;
  const submit = args.submit ?? false;
  const includeContext = args.include_context ?? true;

  try {
    const page = browserManager.getPageOrThrow(args.connection_id);
    const escapedSelector = escapeForJs(selector);
    const escapedText = escapeForJs(text);

    // JavaScript fill with events (ported from Python)
    const script = `
      (() => {
        const elements = document.querySelectorAll('${escapedSelector}');
        if (elements.length === 0) {
          return { success: false, error: 'No elements found matching selector' };
        }
        if (${index} >= elements.length) {
          return { success: false, error: 'Only ' + elements.length + ' element(s) found, index ${index} out of range' };
        }

        const element = elements[${index}];

        // Set value
        element.value = '${escapedText}';

        // Trigger input event
        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.dispatchEvent(new Event('change', { bubbles: true }));

        // Submit if requested
        if (${submit}) {
          element.dispatchEvent(new KeyboardEvent('keypress', { key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true }));
        }

        return {
          success: true,
          filled: '<' + element.tagName.toLowerCase() + '> at index ${index}',
          type: element.type || 'text'
        };
      })()
    `;

    const result = (await page.evaluate(script)) as DomActionResult;

    if (result.success) {
      const submitMsg = submit ? ' and submitted' : '';
      let response = `Filled ${result.filled} (${result.type})${submitMsg}`;

      // Add context if requested
      if (includeContext) {
        const context = await gatherActionContext(page, selector, 'fill');
        if (context) {
          response += '\n' + context;
        }
      }

      return successResponse(response);
    } else {
      return errorResponse(`Failed: ${result.error}`);
    }
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : String(error));
  }
}

/**
 * Navigate to a URL.
 * Auto-includes page title and element summary when include_context is true (default).
 */
export async function navigate(args: {
  url: string;
  include_context?: boolean;
  connection_id?: string;
}): Promise<{ content: Array<{ type: 'text'; text: string }>; isError?: boolean }> {
  const includeContext = args.include_context ?? true;

  try {
    const page = browserManager.getPageOrThrow(args.connection_id);
    await page.goto(args.url, { waitUntil: 'networkidle2' });

    let response = `Navigated to ${args.url}`;

    // Add context if requested
    if (includeContext) {
      const context = await gatherNavigateContext(page);
      if (context) {
        response += '\n' + context;
      }
    }

    return successResponse(response);
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : String(error));
  }
}

/**
 * Get console log messages from the browser.
 *
 * Console messages are captured automatically when connected.
 * Returns the most recent messages (default: 3).
 */
export async function getConsoleLogs(args: {
  filter_level?: string;
  limit?: number;
  connection_id?: string;
}): Promise<{ content: Array<{ type: 'text'; text: string }>; isError?: boolean }> {
  const filterLevel = args.filter_level ?? 'all';
  const limit = args.limit ?? 3;

  try {
    // Verify connection exists using throwing method
    const connection = browserManager.getConnectionOrThrow(args.connection_id);

    // Get logs from browser manager
    const logs = browserManager.getConsoleLogs(args.connection_id);

    // Filter logs by level if specified
    const filteredLogs = filterLevel === 'all' ? logs : logs.filter(log => log.level === filterLevel);

    // Build freshness header
    const output: string[] = [];
    output.push('--- PAGE STATE ---');

    // Freshness delta vs last query
    if (connection.lastQueryEpoch !== null && connection.lastConsoleQuery !== null) {
      if (connection.lastQueryEpoch < connection.navigationEpoch) {
        output.push('[PAGE RELOADED since your last query]');
      } else if (connection.hmrUpdateCount > 0 && connection.lastHmrTime !== null && connection.lastHmrTime > connection.lastConsoleQuery) {
        output.push('[HMR UPDATE occurred since your last query]');
      } else {
        output.push('[No changes since your last query]');
      }
    }

    // Current page state
    output.push(`Navigation epoch: ${connection.navigationEpoch}`);
    output.push(`Last navigation: ${formatTimeSince(connection.lastNavigationTime)}`);

    if (connection.hmrUpdateCount > 0 && connection.lastHmrTime !== null) {
      output.push(`HMR updates since navigation: ${connection.hmrUpdateCount}`);
      output.push(`Last HMR update: ${formatTimeSince(connection.lastHmrTime)}`);
    }

    output.push('');

    // Update query tracking for next call
    connection.lastConsoleQuery = Date.now();
    connection.lastQueryEpoch = connection.navigationEpoch;

    if (filteredLogs.length === 0) {
      output.push(`No console messages captured${filterLevel !== 'all' ? ` (filter: ${filterLevel})` : ''}.`);
      return successResponse(output.join('\n'));
    }

    // Get most recent logs up to limit
    const recentLogs = filteredLogs.slice(-limit);
    const totalCount = filteredLogs.length;

    output.push('--- CONSOLE MESSAGES ---');
    output.push(
      `Showing ${recentLogs.length} of ${totalCount}${filterLevel !== 'all' ? ` (filter: ${filterLevel})` : ''}:`
    );
    output.push('');

    for (const log of recentLogs) {
      const timestamp = new Date(log.timestamp).toISOString().split('T')[1].slice(0, 12);
      const location = log.url ? ` (${log.url}${log.lineNumber ? `:${log.lineNumber}` : ''})` : '';
      output.push(`[${timestamp}] [${log.level.toUpperCase()}] ${log.text}${location}`);
    }

    return successResponse(output.join('\n'));
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : String(error));
  }
}
