/**
 * Page Extractors - Composable semantic extraction functions
 *
 * Framework-agnostic extractors that use only HTML semantics and ARIA roles.
 * Each extractor runs a single page.evaluate() call for efficiency.
 *
 * Note: All extractors use string templates for page.evaluate() to avoid
 * TypeScript DOM type issues (following pattern from dom.ts).
 */

import type { Page } from 'puppeteer';
import type {
  ExtractorConfig,
  ExtractorResult,
  FocusedElement,
  ButtonInfo,
  LinkInfo,
  InputInfo,
  FormInfo,
  ToggleInfo,
  AlertInfo,
  ModalInfo,
  ErrorInfo,
  LandmarkInfo,
  TabGroupInfo,
  HeadingInfo,
} from '../types.js';

// ============================================================================
// Common Helper Scripts (injected into evaluate calls)
// ============================================================================

const GENERATE_SELECTOR_FN = `
  function generateSelector(element) {
    if (element.id) return '#' + element.id;

    const testId = element.getAttribute('data-testid');
    if (testId) return '[data-testid="' + testId + '"]';

    const classes = Array.from(element.classList);
    if (classes.length > 0) {
      return element.tagName.toLowerCase() + '.' + classes[0];
    }

    return element.tagName.toLowerCase();
  }
`;

const IS_VISIBLE_FN = `
  function isElementVisible(el) {
    if (!(el instanceof HTMLElement)) return false;

    const style = window.getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden') {
      return false;
    }

    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }
`;

// ============================================================================
// Extractor Functions
// ============================================================================

/**
 * Extracts focused element information
 */
export async function extractFocused(page: Page): Promise<FocusedElement | null> {
  const script = `
    (() => {
      ${GENERATE_SELECTOR_FN}

      const el = document.activeElement;
      if (!el || el === document.body) return null;

      return {
        tag: el.tagName.toLowerCase(),
        id: el.id || undefined,
        name: el.name || undefined,
        type: el.type || undefined,
        selector: generateSelector(el),
      };
    })()
  `;

  return await page.evaluate(script) as FocusedElement | null;
}

/**
 * Extracts button information
 */
export async function extractButtons(
  page: Page,
  config: ExtractorConfig = {}
): Promise<ExtractorResult<ButtonInfo>> {
  const { limit = 10, includeHidden = false } = config;

  const script = `
    (() => {
      ${GENERATE_SELECTOR_FN}
      ${IS_VISIBLE_FN}

      const limit = ${limit};
      const includeHidden = ${includeHidden};

      const buttons = Array.from(
        document.querySelectorAll('button, [role="button"]')
      );

      let filtered = includeHidden
        ? buttons
        : buttons.filter(isElementVisible);

      const total = filtered.length;
      const items = filtered.slice(0, limit).map((btn) => {
        const hasHandler =
          btn.hasAttribute('onclick') ||
          btn.onclick !== null;

        return {
          html: btn.outerHTML.split('>')[0] + '>',
          text: btn.textContent?.trim() || '',
          hasHandler,
          disabled: btn.disabled || false,
          selector: generateSelector(btn),
        };
      });

      return {
        items,
        total,
        truncated: total > limit,
      };
    })()
  `;

  return await page.evaluate(script) as ExtractorResult<ButtonInfo>;
}

/**
 * Extracts link information
 */
export async function extractLinks(
  page: Page,
  config: ExtractorConfig = {}
): Promise<ExtractorResult<LinkInfo>> {
  const { limit = 10, includeHidden = false } = config;

  const script = `
    (() => {
      ${GENERATE_SELECTOR_FN}
      ${IS_VISIBLE_FN}

      const limit = ${limit};
      const includeHidden = ${includeHidden};

      const links = Array.from(document.querySelectorAll('a[href]'));

      let filtered = includeHidden
        ? links
        : links.filter(isElementVisible);

      const total = filtered.length;
      const items = filtered.slice(0, limit).map((link) => ({
        text: link.textContent?.trim() || '',
        href: link.href,
        selector: generateSelector(link),
      }));

      return {
        items,
        total,
        truncated: total > limit,
      };
    })()
  `;

  return await page.evaluate(script) as ExtractorResult<LinkInfo>;
}

/**
 * Extracts input field information
 */
export async function extractInputs(
  page: Page,
  config: ExtractorConfig = {}
): Promise<ExtractorResult<InputInfo>> {
  const { limit = 10, includeHidden = false } = config;

  const script = `
    (() => {
      ${GENERATE_SELECTOR_FN}
      ${IS_VISIBLE_FN}

      const limit = ${limit};
      const includeHidden = ${includeHidden};

      const inputs = Array.from(
        document.querySelectorAll('input, textarea, select')
      );

      let filtered = includeHidden
        ? inputs
        : inputs.filter(isElementVisible);

      const total = filtered.length;
      const items = filtered.slice(0, limit).map((input) => ({
        type: input.type || input.tagName.toLowerCase(),
        name: input.name || undefined,
        id: input.id || undefined,
        value: input.value || undefined,
        placeholder: input.placeholder || undefined,
        selector: generateSelector(input),
      }));

      return {
        items,
        total,
        truncated: total > limit,
      };
    })()
  `;

  return await page.evaluate(script) as ExtractorResult<InputInfo>;
}

/**
 * Extracts form information with child inputs
 */
export async function extractForms(
  page: Page,
  config: ExtractorConfig = {}
): Promise<ExtractorResult<FormInfo>> {
  const { limit = 5, includeHidden = false } = config;

  const script = `
    (() => {
      ${GENERATE_SELECTOR_FN}
      ${IS_VISIBLE_FN}

      const limit = ${limit};
      const includeHidden = ${includeHidden};

      const forms = Array.from(document.querySelectorAll('form'));

      let filtered = includeHidden
        ? forms
        : forms.filter(isElementVisible);

      const total = filtered.length;
      const items = filtered.slice(0, limit).map((form) => {
        const inputs = Array.from(
          form.querySelectorAll('input, textarea, select')
        );

        return {
          action: form.action || undefined,
          method: form.method || undefined,
          inputCount: inputs.length,
          selector: generateSelector(form),
          inputs: inputs.slice(0, 5).map((input) => ({
            type: input.type || input.tagName.toLowerCase(),
            name: input.name || undefined,
            id: input.id || undefined,
            value: input.value || undefined,
            placeholder: input.placeholder || undefined,
            selector: generateSelector(input),
          })),
        };
      });

      return {
        items,
        total,
        truncated: total > limit,
      };
    })()
  `;

  return await page.evaluate(script) as ExtractorResult<FormInfo>;
}

/**
 * Extracts toggle/checkbox/switch information
 */
export async function extractToggles(
  page: Page,
  config: ExtractorConfig = {}
): Promise<ExtractorResult<ToggleInfo>> {
  const { limit = 10, includeHidden = false } = config;

  const script = `
    (() => {
      ${GENERATE_SELECTOR_FN}
      ${IS_VISIBLE_FN}

      const limit = ${limit};
      const includeHidden = ${includeHidden};

      const toggles = Array.from(
        document.querySelectorAll('input[type="checkbox"], [role="switch"]')
      );

      let filtered = includeHidden
        ? toggles
        : toggles.filter(isElementVisible);

      const total = filtered.length;
      const items = filtered.slice(0, limit).map((toggle) => {
        // Find associated label
        let label = undefined;
        if (toggle.id) {
          const labelEl = document.querySelector('label[for="' + toggle.id + '"]');
          if (labelEl) label = labelEl.textContent?.trim();
        }
        if (!label && toggle.parentElement?.tagName === 'LABEL') {
          label = toggle.parentElement.textContent?.trim();
        }

        const checked =
          toggle.checked ||
          toggle.getAttribute('aria-checked') === 'true';

        return {
          label,
          checked,
          selector: generateSelector(toggle),
        };
      });

      return {
        items,
        total,
        truncated: total > limit,
      };
    })()
  `;

  return await page.evaluate(script) as ExtractorResult<ToggleInfo>;
}

/**
 * Extracts alert/status message information
 */
export async function extractAlerts(
  page: Page,
  config: ExtractorConfig = {}
): Promise<ExtractorResult<AlertInfo>> {
  const { limit = 5, includeHidden = false } = config;

  const script = `
    (() => {
      ${GENERATE_SELECTOR_FN}
      ${IS_VISIBLE_FN}

      const limit = ${limit};
      const includeHidden = ${includeHidden};

      const alerts = Array.from(
        document.querySelectorAll('[role="alert"], [role="status"]')
      );

      let filtered = includeHidden
        ? alerts
        : alerts.filter(isElementVisible);

      const total = filtered.length;
      const items = filtered.slice(0, limit).map((alert) => ({
        role: alert.getAttribute('role') || 'alert',
        text: alert.textContent?.trim() || '',
        selector: generateSelector(alert),
      }));

      return {
        items,
        total,
        truncated: total > limit,
      };
    })()
  `;

  return await page.evaluate(script) as ExtractorResult<AlertInfo>;
}

/**
 * Extracts modal/dialog information
 */
export async function extractModals(
  page: Page,
  config: ExtractorConfig = {}
): Promise<ExtractorResult<ModalInfo>> {
  const { limit = 3, includeHidden = false } = config;

  const script = `
    (() => {
      ${GENERATE_SELECTOR_FN}
      ${IS_VISIBLE_FN}

      const limit = ${limit};
      const includeHidden = ${includeHidden};

      const modals = Array.from(
        document.querySelectorAll('[role="dialog"], [aria-modal="true"]')
      );

      let filtered = includeHidden
        ? modals
        : modals.filter(isElementVisible);

      const total = filtered.length;
      const items = filtered.slice(0, limit).map((modal) => {
        const open = isElementVisible(modal);
        const labelledBy = modal.getAttribute('aria-labelledby');
        let title = undefined;
        if (labelledBy) {
          const titleEl = document.getElementById(labelledBy);
          if (titleEl) title = titleEl.textContent?.trim();
        }
        if (!title) {
          title = modal.getAttribute('aria-label') || undefined;
        }

        return {
          open,
          title,
          selector: generateSelector(modal),
        };
      });

      return {
        items,
        total,
        truncated: total > limit,
      };
    })()
  `;

  return await page.evaluate(script) as ExtractorResult<ModalInfo>;
}

/**
 * Extracts form validation error information
 */
export async function extractErrors(
  page: Page,
  config: ExtractorConfig = {}
): Promise<ExtractorResult<ErrorInfo>> {
  const { limit = 10, includeHidden = false } = config;

  const script = `
    (() => {
      ${GENERATE_SELECTOR_FN}
      ${IS_VISIBLE_FN}

      const limit = ${limit};
      const includeHidden = ${includeHidden};

      const errors = Array.from(
        document.querySelectorAll('[aria-invalid="true"], [aria-errormessage]')
      );

      let filtered = includeHidden
        ? errors
        : errors.filter(isElementVisible);

      const total = filtered.length;
      const items = filtered.slice(0, limit).map((error) => {
        const errorMsgId = error.getAttribute('aria-errormessage');
        let message = undefined;
        if (errorMsgId) {
          const msgEl = document.getElementById(errorMsgId);
          if (msgEl) message = msgEl.textContent?.trim();
        }

        return {
          element: error.tagName.toLowerCase(),
          message,
          selector: generateSelector(error),
        };
      });

      return {
        items,
        total,
        truncated: total > limit,
      };
    })()
  `;

  return await page.evaluate(script) as ExtractorResult<ErrorInfo>;
}

/**
 * Extracts landmark/region information
 */
export async function extractLandmarks(
  page: Page,
  config: ExtractorConfig = {}
): Promise<ExtractorResult<LandmarkInfo>> {
  const { limit = 10, includeHidden = false } = config;

  const script = `
    (() => {
      ${GENERATE_SELECTOR_FN}
      ${IS_VISIBLE_FN}

      const limit = ${limit};
      const includeHidden = ${includeHidden};

      const landmarkSelectors = [
        'header, [role="banner"]',
        'nav, [role="navigation"]',
        'main, [role="main"]',
        'aside, [role="complementary"]',
        'footer, [role="contentinfo"]',
        '[role="region"]',
        '[role="search"]',
        'section',
      ];

      const landmarks = Array.from(
        document.querySelectorAll(landmarkSelectors.join(', '))
      );

      let filtered = includeHidden
        ? landmarks
        : landmarks.filter(isElementVisible);

      const total = filtered.length;
      const items = filtered.slice(0, limit).map((landmark) => {
        const role = landmark.getAttribute('role');
        const type = role || landmark.tagName.toLowerCase();
        const label = landmark.getAttribute('aria-label') || undefined;

        return {
          type,
          label,
          selector: generateSelector(landmark),
        };
      });

      return {
        items,
        total,
        truncated: total > limit,
      };
    })()
  `;

  return await page.evaluate(script) as ExtractorResult<LandmarkInfo>;
}

/**
 * Extracts tab group information
 */
export async function extractTabs(
  page: Page,
  config: ExtractorConfig = {}
): Promise<ExtractorResult<TabGroupInfo>> {
  const { limit = 5, includeHidden = false } = config;

  const script = `
    (() => {
      ${GENERATE_SELECTOR_FN}
      ${IS_VISIBLE_FN}

      const limit = ${limit};
      const includeHidden = ${includeHidden};

      const tabLists = Array.from(document.querySelectorAll('[role="tablist"]'));

      let filtered = includeHidden
        ? tabLists
        : tabLists.filter(isElementVisible);

      const total = filtered.length;
      const items = filtered.slice(0, limit).map((tabList) => {
        const tabs = Array.from(tabList.querySelectorAll('[role="tab"]'));

        return {
          tabs: tabs.map((tab) => ({
            label: tab.textContent?.trim() || '',
            selected: tab.getAttribute('aria-selected') === 'true',
          })),
          selector: generateSelector(tabList),
        };
      });

      return {
        items,
        total,
        truncated: total > limit,
      };
    })()
  `;

  return await page.evaluate(script) as ExtractorResult<TabGroupInfo>;
}

/**
 * Extracts heading information
 */
export async function extractHeadings(
  page: Page,
  config: ExtractorConfig = {}
): Promise<ExtractorResult<HeadingInfo>> {
  const { limit = 10, includeHidden = false } = config;

  const script = `
    (() => {
      ${GENERATE_SELECTOR_FN}
      ${IS_VISIBLE_FN}

      const limit = ${limit};
      const includeHidden = ${includeHidden};

      const headings = Array.from(
        document.querySelectorAll('h1, h2, h3, h4, h5, h6')
      );

      let filtered = includeHidden
        ? headings
        : headings.filter(isElementVisible);

      const total = filtered.length;
      const items = filtered.slice(0, limit).map((heading) => ({
        level: parseInt(heading.tagName[1], 10),
        text: heading.textContent?.trim() || '',
        selector: generateSelector(heading),
      }));

      return {
        items,
        total,
        truncated: total > limit,
      };
    })()
  `;

  return await page.evaluate(script) as ExtractorResult<HeadingInfo>;
}
