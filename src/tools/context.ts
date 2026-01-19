/**
 * Context Gathering for P2: Smart Auto-Bundled Responses
 *
 * These functions gather additional context to auto-include in tool responses,
 * eliminating the need for follow-up tool calls.
 */

import type { Page } from 'puppeteer';
import { browserManager } from '../browser.js';
import type { PageInventory, SelectorSuggestion } from '../types.js';
import { escapeForJs } from '../response.js';

/**
 * Truncate long values to prevent overwhelming context
 */
function truncateValue(val: string, max = 100): string {
  if (!val) return '';
  return val.length > max ? val.substring(0, max) + '...' : val;
}

/**
 * Limit arrays to first N items
 */
function limitArray<T>(arr: T[], max = 5): T[] {
  return arr.slice(0, max);
}

/**
 * Format a variable for display with optional change marker
 */
function formatVariable(name: string, value: string, changed = false): string {
  const changeMarker = changed ? ' [CHANGED]' : '';
  return `  ${name} = ${value}${changeMarker}`;
}

/**
 * Parse CDP RemoteObject to readable string
 */
function remoteObjectToString(obj: any): string {
  if (!obj) return 'undefined';

  if (obj.type === 'undefined') return 'undefined';
  if (obj.type === 'string') return `"${truncateValue(obj.value)}"`;
  if (obj.type === 'number' || obj.type === 'boolean') return String(obj.value);
  if (obj.type === 'object') {
    if (obj.subtype === 'null') return 'null';
    if (obj.subtype === 'array') return obj.description || '[Array]';
    return obj.description || '[Object]';
  }
  if (obj.type === 'function') return '[Function]';

  return obj.description || String(obj.value) || obj.type;
}

/**
 * Extract search terms from a CSS selector
 * Examples:
 *   ".login-btn" → ["login", "btn"]
 *   "#submitButton" → ["submit", "button"]
 *   "button[data-test='login']" → ["button", "login"]
 */
function extractSearchTerms(selector: string): string[] {
  const terms: string[] = [];

  // Extract class names (.className)
  const classMatches = selector.match(/\.([a-zA-Z0-9_-]+)/g);
  if (classMatches) {
    classMatches.forEach(cls => {
      // Remove the dot and split on common separators
      const className = cls.substring(1);
      // Split on hyphens, underscores, camelCase
      const parts = className.split(/[-_]|(?=[A-Z])/);
      terms.push(...parts.filter(p => p.length > 0));
    });
  }

  // Extract ID (#idName)
  const idMatches = selector.match(/#([a-zA-Z0-9_-]+)/g);
  if (idMatches) {
    idMatches.forEach(id => {
      const idName = id.substring(1);
      const parts = idName.split(/[-_]|(?=[A-Z])/);
      terms.push(...parts.filter(p => p.length > 0));
    });
  }

  // Extract tag names (at start or after space/> combinator)
  const tagMatches = selector.match(/(?:^|[\s>])([a-zA-Z][a-zA-Z0-9]*)/g);
  if (tagMatches) {
    tagMatches.forEach(tag => {
      const tagName = tag.trim().replace(/^>/, '');
      if (tagName.length > 0) {
        terms.push(tagName);
      }
    });
  }

  // Extract attribute values
  const attrMatches = selector.match(/\[([a-zA-Z-]+)=['"]?([^'"[\]]+)['"]?\]/g);
  if (attrMatches) {
    attrMatches.forEach(attr => {
      const match = attr.match(/\[([a-zA-Z-]+)=['"]?([^'"[\]]+)['"]?\]/);
      if (match && match[2]) {
        const parts = match[2].split(/[-_]|(?=[A-Z])/);
        terms.push(...parts.filter(p => p.length > 0));
      }
    });
  }

  // Lowercase and dedupe
  return [...new Set(terms.map(t => t.toLowerCase()))];
}

/**
 * Find similar selectors based on fuzzy matching
 */
function findSimilarSelectors(
  attemptedSelector: string,
  inventory: PageInventory
): SelectorSuggestion[] {
  const suggestions: SelectorSuggestion[] = [];
  const terms = extractSearchTerms(attemptedSelector);

  if (terms.length === 0) {
    // No terms extracted, can't make suggestions
    return [];
  }

  // Match against classes
  for (const [className, count] of Object.entries(inventory.classCounts)) {
    const classLower = className.toLowerCase();
    const matchedTerm = terms.find(term => classLower.includes(term));

    if (matchedTerm) {
      suggestions.push({
        selector: `.${className}`,
        count,
        reason: `class contains "${matchedTerm}"`
      });
    }
  }

  // Match against IDs
  for (const id of inventory.ids) {
    const idLower = id.toLowerCase();
    const matchedTerm = terms.find(term => idLower.includes(term));

    if (matchedTerm) {
      suggestions.push({
        selector: `#${id}`,
        count: 1,
        reason: `ID contains "${matchedTerm}"`
      });
    }
  }

  // Match against tags (if tag was in attempted selector)
  for (const [tag, count] of Object.entries(inventory.tagCounts)) {
    if (terms.includes(tag.toLowerCase())) {
      suggestions.push({
        selector: tag,
        count,
        reason: `tag matches "${tag}"`
      });
    }
  }

  // Match against data attributes
  for (const [attr, count] of Object.entries(inventory.dataAttrs)) {
    const attrLower = attr.toLowerCase();
    const matchedTerm = terms.find(term => attrLower.includes(term));

    if (matchedTerm) {
      suggestions.push({
        selector: `[${attr}]`,
        count,
        reason: `attribute contains "${matchedTerm}"`
      });
    }
  }

  // Sort by count (descending), then by selector length (ascending for readability)
  suggestions.sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    return a.selector.length - b.selector.length;
  });

  // Limit to top 5
  return suggestions.slice(0, 5);
}

/**
 * Gather suggestions when query_elements returns zero results
 *
 * Analyzes the page to suggest alternative selectors based on fuzzy matching
 * against the attempted selector.
 */
export async function gatherZeroResultSuggestions(
  page: Page,
  attemptedSelector: string
): Promise<string> {
  const lines: string[] = [];

  try {
    const escapedSelector = escapeForJs(attemptedSelector);

    // Gather page inventory via JavaScript execution
    const script = `
      (() => {
        const allElements = document.querySelectorAll('*');

        // Extract classes with counts
        const classCounts = {};
        allElements.forEach(el => {
          if (el.className && typeof el.className === 'string') {
            el.className.split(' ').filter(c => c).forEach(cls => {
              classCounts[cls] = (classCounts[cls] || 0) + 1;
            });
          }
        });

        // Extract IDs
        const ids = Array.from(document.querySelectorAll('[id]'))
          .map(el => el.id)
          .filter(id => id);

        // Tag counts
        const tagCounts = {};
        allElements.forEach(el => {
          const tag = el.tagName.toLowerCase();
          tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        });

        // Data attributes
        const dataAttrs = {};
        allElements.forEach(el => {
          Array.from(el.attributes)
            .filter(a => a.name.startsWith('data-'))
            .forEach(a => {
              dataAttrs[a.name] = (dataAttrs[a.name] || 0) + 1;
            });
        });

        // Interactive elements summary
        const interactive = {
          buttons: document.querySelectorAll('button, [role="button"]').length,
          inputs: document.querySelectorAll('input, textarea, select').length,
          links: document.querySelectorAll('a[href]').length,
          forms: document.querySelectorAll('form').length,
        };

        return {
          classCounts,
          ids,
          tagCounts,
          dataAttrs,
          interactive,
          totalElements: allElements.length
        };
      })()
    `;

    const inventory = await page.evaluate(script) as PageInventory;

    // Find similar selectors
    const suggestions = findSimilarSelectors(attemptedSelector, inventory);

    if (suggestions.length > 0) {
      lines.push('');
      lines.push('Similar selectors that exist:');
      for (const suggestion of suggestions) {
        const countText = suggestion.count === 1 ? '1 element' : `${suggestion.count} elements`;
        lines.push(`  - ${suggestion.selector} (${countText}) - ${suggestion.reason}`);
      }
    }

    // Page structure summary
    lines.push('');
    lines.push('Page structure:');
    const parts: string[] = [];

    if (inventory.interactive.buttons > 0) {
      parts.push(`${inventory.interactive.buttons} button${inventory.interactive.buttons === 1 ? '' : 's'}`);
    }
    if (inventory.interactive.inputs > 0) {
      parts.push(`${inventory.interactive.inputs} input${inventory.interactive.inputs === 1 ? '' : 's'}`);
    }
    if (inventory.interactive.links > 0) {
      parts.push(`${inventory.interactive.links} link${inventory.interactive.links === 1 ? '' : 's'}`);
    }
    if (inventory.interactive.forms > 0) {
      parts.push(`${inventory.interactive.forms} form${inventory.interactive.forms === 1 ? '' : 's'}`);
    }

    if (parts.length > 0) {
      lines.push(`  - ${parts.join(', ')}`);
    }
    lines.push(`  - Total: ${inventory.totalElements} elements`);

  } catch (err) {
    // If suggestion gathering fails, return empty string (no suggestions)
    return '';
  }

  return lines.join('\n');
}

/**
 * Gather context when execution pauses (breakpoint, exception, manual pause)
 *
 * Returns formatted context including:
 * - Current location
 * - Call stack (top 5 frames)
 * - Local variables (top 10)
 * - Recent console logs (last 3)
 */
export async function gatherPauseContext(connectionId?: string): Promise<string> {
  const connection = browserManager.getConnection(connectionId);
  if (!connection) {
    throw new Error('No connection found');
  }

  const pausedData = connection.pausedData;
  if (!pausedData) {
    throw new Error('Not paused');
  }

  const cdp = connection.cdpSession;
  if (!cdp) {
    throw new Error('No CDP session');
  }

  const lines: string[] = [''];

  // Current location
  const frame = pausedData.callFrames[0];
  const functionName = frame.functionName || '(anonymous)';
  const url = frame.url.split('/').pop() || frame.url;
  const line = frame.location.lineNumber + 1; // CDP is 0-indexed

  lines.push(`Paused at: ${url}:${line} (${functionName})`);
  lines.push(`Reason: ${pausedData.reason}`);
  lines.push('');

  // Call stack (top 5 frames)
  lines.push('Call Stack:');
  const frames = limitArray(pausedData.callFrames, 5);
  for (let i = 0; i < frames.length; i++) {
    const f = frames[i];
    const fname = f.functionName || '(anonymous)';
    const furl = f.url.split('/').pop() || f.url;
    const fline = f.location.lineNumber + 1;
    const current = i === 0 ? ' <- current' : '';
    lines.push(`  [${i}] ${fname} (${furl}:${fline})${current}`);
  }
  lines.push('');

  // Local variables (top 10 from first frame)
  const localScope = frame.scopeChain.find(s => s.type === 'local');
  if (localScope && localScope.object) {
    try {
      const props = await cdp.send('Runtime.getProperties', {
        objectId: (localScope.object as any).objectId,
        ownProperties: true,
      });

      if (props.result && props.result.length > 0) {
        lines.push('Local Variables:');
        const vars = limitArray(props.result, 10);
        for (const prop of vars) {
          if (prop.name && prop.value) {
            const valueStr = truncateValue(remoteObjectToString(prop.value));
            lines.push(`  ${prop.name} = ${valueStr}`);
          }
        }
        lines.push('');
      }
    } catch (err) {
      // Skip if we can't get properties
    }
  }

  // Recent console logs (last 3)
  const consoleLogs = connection.consoleLogs || [];
  if (consoleLogs.length > 0) {
    lines.push('Recent Console (last 3):');
    const recent = consoleLogs.slice(-3);
    for (const log of recent) {
      lines.push(`  [${log.level.toUpperCase()}] ${truncateValue(log.text)}`);
    }
  }

  return lines.join('\n');
}

/**
 * Gather context after a step operation
 *
 * Returns formatted context including:
 * - New location
 * - Local variables with [CHANGED] markers
 * - New console logs since last step
 */
export async function gatherStepContext(
  connectionId?: string,
  previousVars?: Record<string, string>
): Promise<string> {
  const connection = browserManager.getConnection(connectionId);
  if (!connection) {
    throw new Error('No connection found');
  }

  const pausedData = connection.pausedData;
  if (!pausedData) {
    throw new Error('Not paused');
  }

  const cdp = connection.cdpSession;
  if (!cdp) {
    throw new Error('No CDP session');
  }

  const lines: string[] = [''];

  // New location
  const frame = pausedData.callFrames[0];
  const functionName = frame.functionName || '(anonymous)';
  const url = frame.url.split('/').pop() || frame.url;
  const line = frame.location.lineNumber + 1;

  lines.push(`Stepped to: ${url}:${line} (${functionName})`);
  lines.push('');

  // Local variables with change detection
  const localScope = frame.scopeChain.find(s => s.type === 'local');
  if (localScope && localScope.object) {
    try {
      const props = await cdp.send('Runtime.getProperties', {
        objectId: (localScope.object as any).objectId,
        ownProperties: true,
      });

      if (props.result && props.result.length > 0) {
        lines.push('Local Variables:');
        const vars = limitArray(props.result, 10);
        const currentVars: Record<string, string> = {};

        for (const prop of vars) {
          if (prop.name && prop.value) {
            const valueStr = truncateValue(remoteObjectToString(prop.value));
            currentVars[prop.name] = valueStr;

            // Check if value changed
            const changed = previousVars &&
                           previousVars[prop.name] !== undefined &&
                           previousVars[prop.name] !== valueStr;

            lines.push(formatVariable(prop.name, valueStr, changed));
          }
        }
        lines.push('');

        // Store current vars for next step
        browserManager.setPreviousStepVars(connectionId, currentVars);
      }
    } catch (err) {
      // Skip if we can't get properties
    }
  }

  // New console logs (since last step - just show last 3)
  const consoleLogs = connection.consoleLogs || [];
  if (consoleLogs.length > 0) {
    const recent = consoleLogs.slice(-3);
    if (recent.length > 0) {
      lines.push('New Console (since last step):');
      for (const log of recent) {
        lines.push(`  [${log.level.toUpperCase()}] ${truncateValue(log.text)}`);
      }
    }
  }

  return lines.join('\n');
}

/**
 * Gather context after navigation
 *
 * Returns formatted context including:
 * - Page title
 * - Console errors (if any)
 * - Element summary (buttons, inputs, links)
 */
export async function gatherNavigateContext(page: Page): Promise<string> {
  const lines: string[] = [''];

  try {
    // Page title
    const title = await page.title();
    lines.push(`Title: ${title}`);
    lines.push('');

    // Extract element counts using page.evaluate (runs in browser)
    // Use string-based evaluation to avoid TypeScript DOM type issues
    const pageData = await page.evaluate(`(() => {
      return {
        buttonCount: document.querySelectorAll('button').length,
        inputCount: document.querySelectorAll('input, textarea').length,
        linkCount: document.querySelectorAll('a').length,
        formCount: document.querySelectorAll('form').length,
      };
    })()`) as {
      buttonCount: number;
      inputCount: number;
      linkCount: number;
      formCount: number;
    };

    // Page summary
    lines.push('Page Summary:');
    lines.push(`  ${pageData.buttonCount} buttons`);
    lines.push(`  ${pageData.inputCount} inputs`);
    lines.push(`  ${pageData.linkCount} links`);
    lines.push(`  ${pageData.formCount} forms`);

  } catch (err) {
    // If context gathering fails, just skip it
    return '';
  }

  return lines.join('\n');
}

/**
 * Gather context after a DOM action (click, fill)
 *
 * Returns formatted context including:
 * - Triggered console logs (last 3)
 * - Element state after action
 */
export async function gatherActionContext(
  page: Page,
  selector: string,
  action: 'click' | 'fill'
): Promise<string> {
  const lines: string[] = [''];

  try {
    // Get element state using page.evaluate
    // Use string-based evaluation to avoid TypeScript DOM type issues
    const elementState = await page.evaluate(`((sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;

      const htmlEl = el;
      const isInput = el instanceof HTMLInputElement;

      return {
        tag: el.tagName.toLowerCase(),
        visible: htmlEl.offsetParent !== null,
        disabled: isInput ? el.disabled : false,
        value: isInput ? el.value : null,
      };
    })('${selector.replace(/'/g, "\\'")}')`) as {
      tag: string;
      visible: boolean;
      disabled: boolean;
      value: string | null;
    } | null;

    if (elementState) {
      lines.push('Element State:');
      lines.push(`  Tag: ${elementState.tag}`);
      lines.push(`  Visible: ${elementState.visible}`);
      if (elementState.disabled !== undefined) {
        lines.push(`  Disabled: ${elementState.disabled}`);
      }
      if (elementState.value !== null) {
        lines.push(`  Value: ${truncateValue(elementState.value)}`);
      }
    }

  } catch (err) {
    // If context gathering fails, just skip it
    return '';
  }

  return lines.join('\n');
}
