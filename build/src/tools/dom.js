/**
 * DOM Interaction Tools
 * Ported from Python query_elements, click_element, fill_element, navigate, get_console_logs
 */
import { browserManager } from '../browser.js';
import { checkResultSize, successResponse, errorResponse, escapeForJs, } from '../response.js';
import { gatherNavigateContext, gatherActionContext, gatherZeroResultSuggestions, captureDOMSnapshot } from './context.js';
import { extractPageState, processLogs, formatConsoleLogsOutput, updateQueryTracking, } from './console-logs.js';
/**
 * Find elements by CSS selector and return their details.
 *
 * Returns up to 'limit' elements (default 5, max 20).
 * Use specific selectors to narrow results when needed.
 */
export async function queryElements(args) {
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

        // Get opening tag only (no children)
        function getOpeningTag(el) {
          const tag = el.tagName.toLowerCase();
          let attrs = '';
          for (const attr of el.attributes) {
            attrs += ' ' + attr.name + '="' + attr.value + '"';
          }
          const html = '<' + tag + attrs + '>';
          return html.length > 200 ? html.substring(0, 197) + '...' : html;
        }

        // Get element signature for structure grouping
        function getSignature(el) {
          const tag = el.tagName.toLowerCase();
          const id = el.id ? '#' + el.id : '';
          const cls = el.className && typeof el.className === 'string'
            ? '.' + el.className.split(' ').filter(c => c).slice(0, 2).join('.')
            : '';
          return tag + id + cls;
        }

        // Generate CSS-like structure skeleton
        function getStructure(el, depth, maxDepth) {
          if (depth === undefined) depth = 0;
          if (maxDepth === undefined) maxDepth = 2;

          if (depth >= maxDepth || el.children.length === 0) {
            return null;
          }

          // Group children by signature (tag + classes)
          const groups = [];
          let currentGroup = null;

          for (const child of el.children) {
            const sig = getSignature(child);

            if (currentGroup && currentGroup.sig === sig) {
              currentGroup.count++;
            } else {
              if (currentGroup) groups.push(currentGroup);
              currentGroup = { sig: sig, count: 1, sample: child };
            }
          }
          if (currentGroup) groups.push(currentGroup);

          // Build structure string
          const parts = groups.map(function(g) {
            const base = g.sig;
            const multiplier = g.count > 1 ? '*' + g.count : '';
            const nested = getStructure(g.sample, depth + 1, maxDepth);

            if (nested) {
              return g.count > 1
                ? '(' + base + ' > ' + nested + ')' + multiplier
                : base + ' > ' + nested;
            }
            return base + multiplier;
          });

          const result = parts.join(' + ');
          // Cap at ~100 chars
          return result.length > 100 ? result.substring(0, 97) + '...' : result;
        }

        // Get shortest selector for an element
        function getSelector(el) {
          if (el.id) return '#' + el.id;

          const testId = el.getAttribute('data-testid');
          if (testId) return '[data-testid="' + testId + '"]';

          const tag = el.tagName.toLowerCase();
          const cls = el.className && typeof el.className === 'string'
            ? '.' + el.className.split(' ').filter(c => c)[0]
            : '';
          return tag + cls;
        }

        // Find interactive descendants
        function getInteractive(el, limit) {
          if (limit === undefined) limit = 6;

          const interactive = [];
          const interactiveTags = ['button', 'a', 'input', 'select', 'textarea'];
          const interactiveRoles = ['button', 'link', 'checkbox', 'radio', 'textbox', 'menuitem'];

          function walk(node) {
            if (interactive.length >= limit + 5) return; // Get a few extra to count

            const tag = node.tagName ? node.tagName.toLowerCase() : null;
            const role = node.getAttribute ? node.getAttribute('role') : null;
            const hasHandler = node.onclick || (node.hasAttribute && node.hasAttribute('onclick'));

            const isInteractive =
              (tag && interactiveTags.indexOf(tag) !== -1) ||
              (role && interactiveRoles.indexOf(role) !== -1) ||
              hasHandler;

            if (isInteractive && node !== el) {
              interactive.push(getSelector(node));
            }

            if (node.children) {
              for (const child of node.children) {
                walk(child);
              }
            }
          }

          walk(el);

          if (interactive.length > limit) {
            const shown = interactive.slice(0, limit);
            const more = interactive.length - limit;
            return { items: shown, more: more };
          }
          return { items: interactive, more: 0 };
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
              classes: el.className && typeof el.className === 'string' ? el.className.split(' ').filter(c => c) : [],
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
              },
              html: getOpeningTag(el),
              structure: el.children.length > 0 ? getStructure(el) : null,
              interactive: el.children.length > 0 ? getInteractive(el) : { items: [], more: 0 }
            };
          })
        };
      })()
    `;
        const data = (await page.evaluate(script));
        if (data.found === 0) {
            // Gather smart suggestions for zero results
            const suggestions = await gatherZeroResultSuggestions(page, selector);
            return successResponse(`No elements found matching selector: ${selector}${suggestions}`);
        }
        // Build output with filter info
        const output = [];
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
        }
        else {
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
            // HTML snippet (always shown)
            if (el.html) {
                output.push(`    HTML: ${el.html}`);
            }
            // Structure skeleton (if has children)
            if (el.structure) {
                output.push(`    Structure: ${el.structure}`);
            }
            // Interactive elements list (if has interactive children)
            if (el.interactive && el.interactive.items.length > 0) {
                let interactiveLine = `    Interactive: ${el.interactive.items.join(', ')}`;
                if (el.interactive.more > 0) {
                    interactiveLine += ` +${el.interactive.more} more`;
                }
                output.push(interactiveLine);
            }
            const attrs = el.attributes;
            const relevantAttrs = {};
            if (attrs.type)
                relevantAttrs['type'] = attrs.type;
            if (attrs.name)
                relevantAttrs['name'] = attrs.name;
            if (attrs.placeholder)
                relevantAttrs['placeholder'] = attrs.placeholder;
            if (attrs.value)
                relevantAttrs['value'] = attrs.value;
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
        return successResponse(checkResultSize(result, undefined, 'query_elements', data));
    }
    catch (error) {
        return errorResponse(error instanceof Error ? error.message : String(error));
    }
}
/**
 * Click an element matching the CSS selector.
 *
 * Use query_elements first to verify the element exists and get the correct index.
 * Auto-includes element state and DOM diff when include_context is true (default).
 */
export async function clickElement(args) {
    const selector = args.selector;
    const index = args.index ?? 0;
    const includeContext = args.include_context ?? true;
    try {
        const page = browserManager.getPageOrThrow(args.connection_id);
        const escapedSelector = escapeForJs(selector);
        // Capture snapshot before action (if context is requested)
        let beforeSnapshot = null;
        if (includeContext) {
            beforeSnapshot = await captureDOMSnapshot(page);
        }
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
        const result = (await page.evaluate(script));
        if (result.success) {
            let response = `Clicked ${result.clicked}: ${result.text || ''}`;
            // Add context if requested
            if (includeContext) {
                const context = await gatherActionContext(page, selector, 'click', beforeSnapshot, args.connection_id);
                if (context) {
                    response += '\n' + context;
                }
            }
            return successResponse(response);
        }
        else {
            return errorResponse(`Failed: ${result.error}`);
        }
    }
    catch (error) {
        return errorResponse(error instanceof Error ? error.message : String(error));
    }
}
/**
 * Fill text into an input element matching the CSS selector.
 *
 * Use query_elements first to verify the input exists and get the correct index.
 * Auto-includes element state and DOM diff when include_context is true (default).
 */
export async function fillElement(args) {
    const selector = args.selector;
    const text = args.text;
    const index = args.index ?? 0;
    const submit = args.submit ?? false;
    const includeContext = args.include_context ?? true;
    try {
        const page = browserManager.getPageOrThrow(args.connection_id);
        const escapedSelector = escapeForJs(selector);
        const escapedText = escapeForJs(text);
        // Capture snapshot before action (if context is requested)
        let beforeSnapshot = null;
        if (includeContext) {
            beforeSnapshot = await captureDOMSnapshot(page);
        }
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
        const result = (await page.evaluate(script));
        if (result.success) {
            const submitMsg = submit ? ' and submitted' : '';
            let response = `Filled ${result.filled} (${result.type})${submitMsg}`;
            // Add context if requested
            if (includeContext) {
                const context = await gatherActionContext(page, selector, 'fill', beforeSnapshot, args.connection_id);
                if (context) {
                    response += '\n' + context;
                }
            }
            return successResponse(response);
        }
        else {
            return errorResponse(`Failed: ${result.error}`);
        }
    }
    catch (error) {
        return errorResponse(error instanceof Error ? error.message : String(error));
    }
}
/**
 * Navigate to a URL.
 * Auto-includes page title and element summary when include_context is true (default).
 */
export async function navigate(args) {
    const includeContext = args.include_context ?? true;
    try {
        const page = browserManager.getPageOrThrow(args.connection_id);
        await page.goto(args.url, { waitUntil: 'networkidle2' });
        let response = `Navigated to ${args.url}`;
        // Add context if requested
        if (includeContext) {
            const context = await gatherNavigateContext(page, args.connection_id);
            if (context) {
                response += '\n' + context;
            }
        }
        return successResponse(response);
    }
    catch (error) {
        return errorResponse(error instanceof Error ? error.message : String(error));
    }
}
/**
 * Get console log messages from the browser.
 *
 * Console messages are captured automatically when connected.
 * Returns the most recent messages (default: 3).
 * Use expand_errors: true to include full stack traces for error messages.
 *
 * Architecture: This function is a thin shell that orchestrates pure functions.
 * All data transformation and formatting is delegated to console-logs.ts.
 * Side effects (reading connection state, updating query tracking) are isolated here.
 */
export async function getConsoleLogs(args) {
    try {
        // === Side Effect: Read connection state ===
        const connection = browserManager.getConnectionOrThrow(args.connection_id);
        const logs = browserManager.getConsoleLogs(args.connection_id);
        // === Pure: Extract page state (read-only) ===
        const pageState = extractPageState(connection);
        // === Pure: Process logs (filter, compress, limit) ===
        const query = {
            filterLevel: args.filter_level ?? 'all',
            limit: args.limit ?? 3,
            expandErrors: args.expand_errors ?? false,
        };
        const processed = processLogs(logs, query);
        // === Side Effect: Update query tracking for next call ===
        updateQueryTracking(connection);
        // === Pure: Format output ===
        const output = formatConsoleLogsOutput(pageState, processed);
        return successResponse(output);
    }
    catch (error) {
        return errorResponse(error instanceof Error ? error.message : String(error));
    }
}
/**
 * Scroll the page in a specified direction or to an element.
 *
 * Use this to navigate to different parts of the page before querying elements.
 * Particularly useful for reading content at the bottom of long pages.
 */
export async function scroll(args) {
    const direction = args.direction ?? 'down';
    const pixels = args.pixels ?? 500;
    try {
        const page = browserManager.getPageOrThrow(args.connection_id);
        let script;
        let description;
        if (args.selector) {
            // Scroll to element
            const escapedSelector = escapeForJs(args.selector);
            script = `
        (() => {
          const el = document.querySelector('${escapedSelector}');
          if (!el) {
            return { success: false, error: 'Element not found: ${escapedSelector}' };
          }
          el.scrollIntoView({ behavior: 'instant', block: 'center' });
          return {
            success: true,
            scrollY: window.scrollY,
            scrollHeight: document.documentElement.scrollHeight,
            viewportHeight: window.innerHeight
          };
        })()
      `;
            description = `Scrolled to element: ${args.selector}`;
        }
        else {
            // Scroll by direction
            let scrollCode;
            switch (direction) {
                case 'top':
                    scrollCode = 'window.scrollTo(0, 0)';
                    description = 'Scrolled to top of page';
                    break;
                case 'bottom':
                    scrollCode = 'window.scrollTo(0, document.documentElement.scrollHeight)';
                    description = 'Scrolled to bottom of page';
                    break;
                case 'up':
                    scrollCode = `window.scrollBy(0, -${pixels})`;
                    description = `Scrolled up ${pixels}px`;
                    break;
                case 'down':
                default:
                    scrollCode = `window.scrollBy(0, ${pixels})`;
                    description = `Scrolled down ${pixels}px`;
                    break;
            }
            script = `
        (() => {
          ${scrollCode};
          return {
            success: true,
            scrollY: window.scrollY,
            scrollHeight: document.documentElement.scrollHeight,
            viewportHeight: window.innerHeight
          };
        })()
      `;
        }
        const result = await page.evaluate(script);
        if (!result.success) {
            return errorResponse(result.error || 'Scroll failed');
        }
        const scrollMax = (result.scrollHeight ?? 0) - (result.viewportHeight ?? 0);
        const percent = scrollMax > 0 ? Math.round(((result.scrollY ?? 0) / scrollMax) * 100) : 0;
        const position = `Position: ${result.scrollY ?? 0}/${scrollMax} (${percent}%)`;
        return successResponse(`${description}\n${position}`);
    }
    catch (error) {
        return errorResponse(error instanceof Error ? error.message : String(error));
    }
}
/**
 * Get text content from elements matching a selector.
 *
 * Returns just the text content without HTML structure or metadata.
 * Useful for reading conversation messages, article content, etc.
 * Use from_end=true to get the last N matches (e.g., recent messages).
 */
export async function getPageText(args) {
    const selector = args.selector ?? 'body';
    const limit = Math.min(args.limit ?? 10, 50); // Cap at 50
    const fromEnd = args.from_end ?? false;
    const maxLength = args.max_length ?? 1000; // Per-element max
    try {
        const page = browserManager.getPageOrThrow(args.connection_id);
        const escapedSelector = escapeForJs(selector);
        const script = `
      (() => {
        let elements = Array.from(document.querySelectorAll('${escapedSelector}'));
        const total = elements.length;

        if (total === 0) {
          return { found: 0, texts: [] };
        }

        // Take from end if requested
        if (${fromEnd}) {
          elements = elements.slice(-${limit});
        } else {
          elements = elements.slice(0, ${limit});
        }

        const texts = elements.map((el, idx) => {
          const text = el.innerText || el.textContent || '';
          const trimmed = text.trim();
          const truncated = trimmed.length > ${maxLength}
            ? trimmed.substring(0, ${maxLength}) + '... [truncated]'
            : trimmed;

          // Get a simple identifier for context
          const id = el.id ? '#' + el.id : '';
          const dataRole = el.getAttribute('data-message-author-role') || '';
          const identifier = dataRole || id || el.tagName.toLowerCase();

          return {
            index: ${fromEnd} ? total - elements.length + idx : idx,
            identifier: identifier,
            text: truncated
          };
        });

        return { found: total, showing: elements.length, fromEnd: ${fromEnd}, texts: texts };
      })()
    `;
        const result = await page.evaluate(script);
        if (result.found === 0) {
            return successResponse(`No elements found matching: ${selector}`);
        }
        const output = [];
        const position = result.fromEnd ? 'last' : 'first';
        output.push(`Found ${result.found} element(s), showing ${position} ${result.showing}:`);
        output.push('');
        for (const item of result.texts) {
            output.push(`--- [${item.index}] ${item.identifier} ---`);
            output.push(item.text);
            output.push('');
        }
        return successResponse(output.join('\n'));
    }
    catch (error) {
        return errorResponse(error instanceof Error ? error.message : String(error));
    }
}
/**
 * Right-click on an element (dispatch contextmenu event).
 *
 * Useful for testing context menu handlers and right-click functionality.
 */
export async function rightClick(args) {
    const selector = args.selector;
    const index = args.index ?? 0;
    try {
        const page = browserManager.getPageOrThrow(args.connection_id);
        const escapedSelector = escapeForJs(selector);
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
        const event = new MouseEvent('contextmenu', { bubbles: true, cancelable: true, view: window });
        element.dispatchEvent(event);

        return {
          success: true,
          tag: element.tagName.toLowerCase(),
          text: (element.textContent || '').trim().substring(0, 50)
        };
      })()
    `;
        const result = await page.evaluate(script);
        if (!result.success) {
            return errorResponse(result.error || 'Right-click failed');
        }
        let response = `Right-clicked <${result.tag}> at index ${index}`;
        if (result.text) {
            response += `: ${result.text}`;
        }
        return successResponse(response);
    }
    catch (error) {
        return errorResponse(error instanceof Error ? error.message : String(error));
    }
}
/**
 * Double-click on an element.
 *
 * Useful for text selection, grid row selection, and double-click handlers.
 */
export async function doubleClick(args) {
    const selector = args.selector;
    const index = args.index ?? 0;
    try {
        const page = browserManager.getPageOrThrow(args.connection_id);
        const escapedSelector = escapeForJs(selector);
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
        const event = new MouseEvent('dblclick', { bubbles: true, cancelable: true, view: window });
        element.dispatchEvent(event);

        return {
          success: true,
          tag: element.tagName.toLowerCase(),
          text: (element.textContent || '').trim().substring(0, 50)
        };
      })()
    `;
        const result = await page.evaluate(script);
        if (!result.success) {
            return errorResponse(result.error || 'Double-click failed');
        }
        let response = `Double-clicked <${result.tag}> at index ${index}`;
        if (result.text) {
            response += `: ${result.text}`;
        }
        return successResponse(response);
    }
    catch (error) {
        return errorResponse(error instanceof Error ? error.message : String(error));
    }
}
/**
 * Focus on an element (set keyboard focus).
 *
 * Useful for focus management and accessibility testing.
 */
export async function focus(args) {
    const selector = args.selector;
    const index = args.index ?? 0;
    try {
        const page = browserManager.getPageOrThrow(args.connection_id);
        const escapedSelector = escapeForJs(selector);
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
        element.focus();
        element.dispatchEvent(new Event('focus', { bubbles: false }));

        return {
          success: true,
          tag: element.tagName.toLowerCase(),
          text: (element.textContent || '').trim().substring(0, 50)
        };
      })()
    `;
        const result = await page.evaluate(script);
        if (!result.success) {
            return errorResponse(result.error || 'Focus failed');
        }
        let response = `Focused <${result.tag}> at index ${index}`;
        if (result.text) {
            response += `: ${result.text}`;
        }
        return successResponse(response);
    }
    catch (error) {
        return errorResponse(error instanceof Error ? error.message : String(error));
    }
}
/**
 * Blur an element (remove keyboard focus).
 *
 * Useful for testing blur handlers and focus management.
 */
export async function blur(args) {
    const selector = args.selector;
    const index = args.index ?? 0;
    try {
        const page = browserManager.getPageOrThrow(args.connection_id);
        const escapedSelector = escapeForJs(selector);
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
        element.blur();
        element.dispatchEvent(new Event('blur', { bubbles: false }));

        return {
          success: true,
          tag: element.tagName.toLowerCase(),
          text: (element.textContent || '').trim().substring(0, 50)
        };
      })()
    `;
        const result = await page.evaluate(script);
        if (!result.success) {
            return errorResponse(result.error || 'Blur failed');
        }
        let response = `Blurred <${result.tag}> at index ${index}`;
        if (result.text) {
            response += `: ${result.text}`;
        }
        return successResponse(response);
    }
    catch (error) {
        return errorResponse(error instanceof Error ? error.message : String(error));
    }
}
/**
 * Press a key on the keyboard.
 *
 * Supports single keys (Enter, Escape, Tab, ArrowUp, etc.) and combinations (Control+a, Shift+Enter).
 * If selector provided, focuses element first. Otherwise dispatches on document.activeElement.
 */
export async function pressKey(args) {
    const key = args.key;
    const selector = args.selector;
    const index = args.index ?? 0;
    try {
        const page = browserManager.getPageOrThrow(args.connection_id);
        // Optional focus step. Done in-page with evaluate so we can pick the
        // Nth match of a CSS selector (puppeteer's page.focus only takes the
        // first). Also captures the focused element's tag for the response.
        let focusedTag;
        if (selector) {
            const escapedSelector = escapeForJs(selector);
            const focusResult = await page.evaluate(`(() => {
          const els = document.querySelectorAll('${escapedSelector}');
          if (els.length === 0) return { ok: false, error: 'No elements found matching selector' };
          if (${index} >= els.length) return { ok: false, error: 'Only ' + els.length + ' element(s) found, index ${index} out of range' };
          const el = els[${index}];
          el.focus();
          return { ok: true, tag: el.tagName.toLowerCase() };
        })()`);
            if (!focusResult.ok) {
                return errorResponse(focusResult.error || 'Focus failed');
            }
            focusedTag = focusResult.tag ?? 'unknown';
        }
        else {
            const activeResult = await page.evaluate(`(() => {
          const el = document.activeElement;
          if (!el || el === document.body) return { ok: false, error: 'No element focused on page' };
          return { ok: true, tag: el.tagName.toLowerCase() };
        })()`);
            if (!activeResult.ok) {
                return errorResponse(activeResult.error || 'No element focused');
            }
            focusedTag = activeResult.tag ?? 'unknown';
        }
        // Parse "Shift+5" / "Control+b" / "Enter" into modifiers + main key.
        const parts = key.split('+').map((p) => p.trim());
        const modifiers = [];
        let mainKey = '';
        for (const part of parts) {
            if (part === 'Control' || part === 'Ctrl')
                modifiers.push('Control');
            else if (part === 'Shift')
                modifiers.push('Shift');
            else if (part === 'Alt')
                modifiers.push('Alt');
            else if (part === 'Meta' || part === 'Cmd')
                modifiers.push('Meta');
            else
                mainKey = part;
        }
        if (mainKey === '') {
            return errorResponse(`No main key in '${key}' — only modifiers were parsed`);
        }
        // Delegate to puppeteer's keyboard, which uses CDP Input.dispatchKey-
        // Event under the hood. This produces TRUSTED events (isTrusted=true)
        // and resolves shifted characters via the US keyboard layout map —
        // e.g. Shift+5 → key="%", Shift+a → key="A". Synthesized
        // `new KeyboardEvent(...)` cannot do either: synthetic events are
        // never trusted, and they don't pass through Chromium's input layer
        // that owns the layout-aware shift mapping.
        //
        // Map "Space" → " " for puppeteer; everything else is passed through
        // (single chars like "5", "a", "%" and named keys like "Enter",
        // "Tab" are all valid KeyInput values).
        const keyToPress = mainKey === 'Space' ? ' ' : mainKey;
        for (const m of modifiers) {
            await page.keyboard.down(m);
        }
        try {
            await page.keyboard.press(keyToPress);
        }
        finally {
            // Always release modifiers, even if press throws (unrecognized key,
            // detached frame, etc.) — otherwise the next interaction inherits
            // a stuck Shift/Control.
            for (const m of [...modifiers].reverse()) {
                await page.keyboard.up(m);
            }
        }
        return successResponse(`Pressed key '${key}' on <${focusedTag}>`);
    }
    catch (error) {
        return errorResponse(error instanceof Error ? error.message : String(error));
    }
}
/**
 * Select an option from a <select> dropdown element.
 *
 * Supports selection by text (case-insensitive), index, or value attribute.
 */
export async function selectOption(args) {
    const selector = args.selector;
    const index = args.index ?? 0;
    const optionText = args.option_text ? escapeForJs(args.option_text) : null;
    const optionIndex = args.option_index;
    const optionValue = args.option_value ? escapeForJs(args.option_value) : null;
    try {
        const page = browserManager.getPageOrThrow(args.connection_id);
        const escapedSelector = escapeForJs(selector);
        const script = `
      (() => {
        const selects = document.querySelectorAll('${escapedSelector}');
        if (selects.length === 0) {
          return { success: false, error: 'No elements found matching selector' };
        }
        if (${index} >= selects.length) {
          return { success: false, error: 'Only ' + selects.length + ' element(s) found, index ${index} out of range' };
        }

        const select = selects[${index}];
        if (select.tagName !== 'SELECT') {
          return { success: false, error: 'Element is not a <select> (tag: ' + select.tagName.toLowerCase() + ')' };
        }

        const options = Array.from(select.options);
        let selectedOption = null;

        // Find option by specified method
        ${optionText ? `
        // Find by text (case-insensitive substring match)
        const searchText = '${optionText}';
        const matches = options.filter(opt => opt.textContent.toLowerCase().includes(searchText.toLowerCase()));
        if (matches.length === 0) {
          const available = options.map(o => o.textContent).join(', ');
          return { success: false, error: 'Option not found. Available: ' + available };
        }
        if (matches.length > 1) {
          const matchTexts = matches.map(o => o.textContent).join(', ');
          return { success: false, error: 'Multiple options match text. Matches: ' + matchTexts };
        }
        selectedOption = matches[0];
        ` : optionIndex !== undefined ? `
        // Find by index
        if (${optionIndex} >= options.length) {
          return { success: false, error: 'Option index ${optionIndex} out of range (only ' + options.length + ' options)' };
        }
        selectedOption = options[${optionIndex}];
        ` : optionValue ? `
        // Find by value
        selectedOption = options.find(opt => opt.value === '${optionValue}');
        if (!selectedOption) {
          const available = options.map(o => o.value).join(', ');
          return { success: false, error: 'Option with value not found. Available: ' + available };
        }
        ` : `
        return { success: false, error: 'Must provide one of: option_text, option_index, or option_value' };
        `}

        // Set value and dispatch change event
        select.value = selectedOption.value;
        select.dispatchEvent(new Event('change', { bubbles: true }));

        return {
          success: true,
          selected: selectedOption.text || selectedOption.value
        };
      })()
    `;
        const result = await page.evaluate(script);
        if (!result.success) {
            return errorResponse(result.error || 'Select option failed');
        }
        const response = `Selected option: ${result.selected}`;
        return successResponse(response);
    }
    catch (error) {
        return errorResponse(error instanceof Error ? error.message : String(error));
    }
}
//# sourceMappingURL=dom.js.map