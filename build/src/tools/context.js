/**
 * Context Gathering for P2: Smart Auto-Bundled Responses
 *
 * These functions gather additional context to auto-include in tool responses,
 * eliminating the need for follow-up tool calls.
 */
import { browserManager } from '../browser.js';
/**
 * Truncate long values to prevent overwhelming context
 */
function truncateValue(val, max = 100) {
    if (!val)
        return '';
    return val.length > max ? val.substring(0, max) + '...' : val;
}
/**
 * Limit arrays to first N items
 */
function limitArray(arr, max = 5) {
    return arr.slice(0, max);
}
/**
 * Format a variable for display with optional change marker
 */
function formatVariable(name, value, changed = false) {
    const changeMarker = changed ? ' [CHANGED]' : '';
    return `  ${name} = ${value}${changeMarker}`;
}
/**
 * Parse CDP RemoteObject to readable string
 */
function remoteObjectToString(obj) {
    if (!obj)
        return 'undefined';
    if (obj.type === 'undefined')
        return 'undefined';
    if (obj.type === 'string')
        return `"${truncateValue(obj.value)}"`;
    if (obj.type === 'number' || obj.type === 'boolean')
        return String(obj.value);
    if (obj.type === 'object') {
        if (obj.subtype === 'null')
            return 'null';
        if (obj.subtype === 'array')
            return obj.description || '[Array]';
        return obj.description || '[Object]';
    }
    if (obj.type === 'function')
        return '[Function]';
    return obj.description || String(obj.value) || obj.type;
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
export async function gatherPauseContext(connectionId) {
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
    const lines = [''];
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
                objectId: localScope.object.objectId,
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
        }
        catch (err) {
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
export async function gatherStepContext(connectionId, previousVars) {
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
    const lines = [''];
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
                objectId: localScope.object.objectId,
                ownProperties: true,
            });
            if (props.result && props.result.length > 0) {
                lines.push('Local Variables:');
                const vars = limitArray(props.result, 10);
                const currentVars = {};
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
        }
        catch (err) {
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
export async function gatherNavigateContext(page) {
    const lines = [''];
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
    })()`);
        // Page summary
        lines.push('Page Summary:');
        lines.push(`  ${pageData.buttonCount} buttons`);
        lines.push(`  ${pageData.inputCount} inputs`);
        lines.push(`  ${pageData.linkCount} links`);
        lines.push(`  ${pageData.formCount} forms`);
    }
    catch (err) {
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
export async function gatherActionContext(page, selector, action) {
    const lines = [''];
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
    })('${selector.replace(/'/g, "\\'")}')`);
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
    }
    catch (err) {
        // If context gathering fails, just skip it
        return '';
    }
    return lines.join('\n');
}
//# sourceMappingURL=context.js.map