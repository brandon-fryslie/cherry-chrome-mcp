/**
 * Page Summary Composer - Orchestrates extractors into actionable output
 */
import { browserManager } from '../browser.js';
import { extractFocused, extractButtons, extractLinks, extractInputs, extractForms, extractToggles, extractAlerts, extractModals, extractErrors, extractLandmarks, extractTabs, extractHeadings, } from './page-extractors.js';
/**
 * Default configuration values
 */
const DEFAULT_CONFIG = {
    include: {
        focused: true,
        buttons: true,
        links: true,
        inputs: true,
        forms: true,
        toggles: true,
        alerts: true,
        modals: true,
        errors: true,
        landmarks: true,
        tabs: true,
        headings: false, // verbose, opt-in
    },
    limits: {
        buttons: 10,
        links: 10,
        inputs: 10,
        forms: 5,
        toggles: 10,
        alerts: 5,
        modals: 3,
        errors: 10,
        landmarks: 10,
        tabs: 5,
        headings: 10,
    },
};
/**
 * Gathers a semantic page summary with actionable element information
 */
export async function gatherPageSummary(page, config, connectionId) {
    // Merge config with defaults
    const cfg = {
        include: { ...DEFAULT_CONFIG.include, ...config?.include },
        limits: { ...DEFAULT_CONFIG.limits, ...config?.limits },
    };
    const sections = [];
    // Console logs (errors and warnings, top 5)
    const connection = browserManager.getConnection(connectionId);
    if (connection) {
        const errorWarningLogs = connection.consoleLogs
            .filter(log => log.level === 'error' || log.level === 'warn')
            .slice(-5);
        if (errorWarningLogs.length > 0) {
            const lines = [];
            errorWarningLogs.forEach((log) => {
                const text = log.text.length > 200 ? log.text.substring(0, 197) + '...' : log.text;
                lines.push(`[${log.level.toUpperCase()}] ${text}`);
            });
            sections.push(lines.join('\n'));
        }
    }
    // Focused element
    if (cfg.include.focused) {
        const focused = await extractFocused(page);
        if (focused) {
            sections.push(`── Focused ──\n${focused.selector}${focused.type ? ` (${focused.type})` : ''}`);
        }
    }
    // Buttons
    if (cfg.include.buttons) {
        const buttons = await extractButtons(page, { limit: cfg.limits.buttons });
        if (buttons.total > 0) {
            const lines = [`── Buttons (${buttons.total}) ──`];
            buttons.items.forEach((btn) => {
                lines.push(`${btn.html}`);
            });
            if (buttons.truncated) {
                lines.push(`+${buttons.total - buttons.items.length} more...`);
            }
            sections.push(lines.join('\n'));
        }
    }
    // Inputs
    if (cfg.include.inputs) {
        const inputs = await extractInputs(page, { limit: cfg.limits.inputs });
        if (inputs.total > 0) {
            const lines = [`── Inputs (${inputs.total}) ──`];
            inputs.items.forEach((input) => {
                const parts = [input.selector, `(${input.type})`];
                if (input.value !== undefined && input.value !== '') {
                    parts.push(`"${input.value}"`);
                }
                if (input.placeholder) {
                    parts.push(`[placeholder: "${input.placeholder}"]`);
                }
                lines.push(parts.join(' '));
            });
            if (inputs.truncated) {
                lines.push(`+${inputs.total - inputs.items.length} more...`);
            }
            sections.push(lines.join('\n'));
        }
    }
    // Links
    if (cfg.include.links) {
        const links = await extractLinks(page, { limit: cfg.limits.links });
        if (links.total > 0) {
            const lines = [`── Links (${links.total}) ──`];
            links.items.forEach((link) => {
                lines.push(`${link.text || '(no text)'} → ${link.href}`);
            });
            if (links.truncated) {
                lines.push(`+${links.total - links.items.length} more...`);
            }
            sections.push(lines.join('\n'));
        }
    }
    // Forms
    if (cfg.include.forms) {
        const forms = await extractForms(page, { limit: cfg.limits.forms });
        if (forms.total > 0) {
            const lines = [`── Forms (${forms.total}) ──`];
            forms.items.forEach((form) => {
                const action = form.action ? ` action="${form.action}"` : '';
                const method = form.method ? ` method="${form.method}"` : '';
                lines.push(`${form.selector}${action}${method} (${form.inputCount} inputs)`);
            });
            if (forms.truncated) {
                lines.push(`+${forms.total - forms.items.length} more...`);
            }
            sections.push(lines.join('\n'));
        }
    }
    // Toggles
    if (cfg.include.toggles) {
        const toggles = await extractToggles(page, { limit: cfg.limits.toggles });
        if (toggles.total > 0) {
            const lines = [`── Toggles (${toggles.total}) ──`];
            toggles.items.forEach((toggle) => {
                const checkmark = toggle.checked ? '[x]' : '[ ]';
                const label = toggle.label || toggle.selector;
                lines.push(`${checkmark} ${label}`);
            });
            if (toggles.truncated) {
                lines.push(`+${toggles.total - toggles.items.length} more...`);
            }
            sections.push(lines.join('\n'));
        }
    }
    // Landmarks
    if (cfg.include.landmarks) {
        const landmarks = await extractLandmarks(page, { limit: cfg.limits.landmarks });
        if (landmarks.total > 0) {
            const parts = landmarks.items.map((lm) => {
                return lm.label ? `${lm.type} (${lm.label})` : lm.type;
            });
            sections.push(`── Landmarks ──\n${parts.join(', ')}`);
        }
    }
    // Tabs
    if (cfg.include.tabs) {
        const tabs = await extractTabs(page, { limit: cfg.limits.tabs });
        if (tabs.total > 0) {
            const lines = [`── Tabs ──`];
            tabs.items.forEach((tabGroup) => {
                const tabLabels = tabGroup.tabs.map((tab) => {
                    return tab.selected ? `[*${tab.label}*]` : `[${tab.label}]`;
                });
                lines.push(tabLabels.join(' '));
            });
            sections.push(lines.join('\n'));
        }
    }
    // Alerts
    if (cfg.include.alerts) {
        const alerts = await extractAlerts(page, { limit: cfg.limits.alerts });
        if (alerts.total > 0) {
            const lines = [`── Alerts ──`];
            alerts.items.forEach((alert) => {
                lines.push(`[${alert.role.toUpperCase()}] ${alert.text}`);
            });
            sections.push(lines.join('\n'));
        }
        else {
            sections.push('── Alerts ──\nNone');
        }
    }
    // Modals
    if (cfg.include.modals) {
        const modals = await extractModals(page, { limit: cfg.limits.modals });
        if (modals.total > 0) {
            const lines = [`── Modals ──`];
            modals.items.forEach((modal) => {
                const status = modal.open ? 'OPEN' : 'CLOSED';
                const title = modal.title ? ` - ${modal.title}` : '';
                lines.push(`[${status}]${title} ${modal.selector}`);
            });
            sections.push(lines.join('\n'));
        }
        else {
            sections.push('── Modals ──\nNone');
        }
    }
    // Errors
    if (cfg.include.errors) {
        const errors = await extractErrors(page, { limit: cfg.limits.errors });
        if (errors.total > 0) {
            const lines = [`── Errors ──`];
            errors.items.forEach((error) => {
                const msg = error.message ? `: ${error.message}` : '';
                lines.push(`${error.selector}${msg}`);
            });
            sections.push(lines.join('\n'));
        }
        else {
            sections.push('── Errors ──\nNone');
        }
    }
    // Headings (opt-in)
    if (cfg.include.headings) {
        const headings = await extractHeadings(page, { limit: cfg.limits.headings });
        if (headings.total > 0) {
            const lines = [`── Headings (${headings.total}) ──`];
            headings.items.forEach((heading) => {
                const indent = '  '.repeat(heading.level - 1);
                lines.push(`${indent}H${heading.level}: ${heading.text}`);
            });
            if (headings.truncated) {
                lines.push(`+${headings.total - headings.items.length} more...`);
            }
            sections.push(lines.join('\n'));
        }
    }
    return sections.join('\n\n');
}
//# sourceMappingURL=page-summary.js.map