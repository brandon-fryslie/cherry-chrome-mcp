/**
 * Selector Builder / Element Inspector
 *
 * Discovers CSS selectors from natural language descriptions and attributes.
 * Generates ranked selector candidates with stability scores.
 */
import { browserManager } from '../browser.js';
import { successResponse, errorResponse, escapeForJs } from '../response.js';
/**
 * Stability scores for different selector strategies
 * Higher scores indicate more stable selectors (less likely to break)
 */
const STABILITY_SCORES = {
    ID: 95,
    DATA_TESTID: 90,
    ARIA_LABEL: 85,
    UNIQUE_CLASS: 75,
    TAG_CLASS: 60,
    ROLE_ARIA: 85,
    NTH_CHILD: 30,
};
/**
 * Inspect element and generate ranked selector candidates
 *
 * Discovers elements matching the provided criteria and generates
 * stable CSS selectors with stability scores.
 */
export async function inspectElement(args) {
    try {
        const page = browserManager.getPageOrThrow(args.connection_id);
        const limit = args.limit ?? 3;
        // Build query description for output
        const queryParts = [];
        if (args.description)
            queryParts.push(`"${args.description}"`);
        if (args.text_contains)
            queryParts.push(`text: "${args.text_contains}"`);
        if (args.tag)
            queryParts.push(`tag: ${args.tag}`);
        if (args.attributes) {
            const attrParts = Object.entries(args.attributes)
                .filter(([_, v]) => v !== undefined)
                .map(([k, v]) => `${k}="${v}"`);
            if (attrParts.length > 0)
                queryParts.push(attrParts.join(', '));
        }
        const queryDescription = queryParts.length > 0 ? queryParts.join(' | ') : 'all elements';
        // Execute discovery in browser context
        const script = buildDiscoveryScript(args);
        const rawResult = await page.evaluate(script);
        // Parse candidates
        const candidates = rawResult.candidates.map(c => ({
            selector: c.selector,
            stability: c.stability,
            strategy: c.strategy,
            count: c.count,
            tag: c.tag,
            text: c.text,
            visible: c.visible,
            html: c.html,
        }));
        // Apply strict stability filter if requested
        const filteredCandidates = args.strict_stability
            ? candidates.filter(c => c.stability >= STABILITY_SCORES.ARIA_LABEL)
            : candidates;
        // Limit results
        const limitedCandidates = filteredCandidates.slice(0, limit);
        const result = {
            candidatesFound: filteredCandidates.length,
            candidates: limitedCandidates,
            query: queryDescription,
        };
        // Format output
        const output = formatInspectResult(result);
        return successResponse(output);
    }
    catch (err) {
        return errorResponse(err instanceof Error ? err.message : String(err));
    }
}
/**
 * Build JavaScript to execute in browser for element discovery
 */
function buildDiscoveryScript(args) {
    // Escape all user inputs for safe injection
    const description = args.description ? escapeForJs(args.description) : null;
    const textContains = args.text_contains ? escapeForJs(args.text_contains) : null;
    const tag = args.tag ? escapeForJs(args.tag.toLowerCase()) : null;
    const attrs = args.attributes || {};
    const role = attrs.role ? escapeForJs(attrs.role) : null;
    const ariaLabel = attrs.aria_label ? escapeForJs(attrs.aria_label) : null;
    const dataTestId = attrs.data_testid ? escapeForJs(attrs.data_testid) : null;
    const placeholder = attrs.placeholder ? escapeForJs(attrs.placeholder) : null;
    const inputType = attrs.type ? escapeForJs(attrs.type) : null;
    const nearSelector = args.near?.selector ? escapeForJs(args.near.selector) : null;
    const nearDirection = args.near?.direction || null;
    return `
    (() => {
      const STABILITY_SCORES = {
        ID: 95,
        DATA_TESTID: 90,
        ARIA_LABEL: 85,
        UNIQUE_CLASS: 75,
        TAG_CLASS: 60,
        ROLE_ARIA: 85,
        NTH_CHILD: 30,
      };

      // Extract keywords from description
      function extractKeywords(desc) {
        if (!desc) return [];
        return desc.toLowerCase()
          .split(/\\s+/)
          .filter(w => w.length > 2); // Skip short words
      }

      // Check if element is visible
      function isVisible(el) {
        if (el.offsetParent === null && el.tagName !== 'BODY' && el.tagName !== 'HTML') {
          const style = getComputedStyle(el);
          if (style.position !== 'fixed' && style.position !== 'sticky') {
            return false;
          }
        }
        const style = getComputedStyle(el);
        if (style.display === 'none') return false;
        if (style.visibility === 'hidden') return false;
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 && rect.height === 0) return false;
        return true;
      }

      // Get opening tag HTML
      function getOpeningTag(el) {
        const tag = el.tagName.toLowerCase();
        let attrs = '';
        for (const attr of el.attributes) {
          const value = attr.value.replace(/"/g, '&quot;');
          attrs += \` \${attr.name}="\${value}"\`;
        }
        return \`<\${tag}\${attrs}>\`;
      }

      // Generate best selector for an element
      function generateBestSelector(el) {
        // 1. ID (most stable)
        if (el.id) {
          const selector = '#' + CSS.escape(el.id);
          const count = document.querySelectorAll(selector).length;
          return { selector, stability: STABILITY_SCORES.ID, strategy: 'ID', count };
        }

        // 2. data-testid
        const testId = el.getAttribute('data-testid');
        if (testId) {
          const selector = \`[data-testid="\${CSS.escape(testId)}"]\`;
          const count = document.querySelectorAll(selector).length;
          return { selector, stability: STABILITY_SCORES.DATA_TESTID, strategy: 'data-testid', count };
        }

        // 3. aria-label
        const ariaLabel = el.getAttribute('aria-label');
        if (ariaLabel) {
          const selector = \`[aria-label="\${CSS.escape(ariaLabel)}"]\`;
          const count = document.querySelectorAll(selector).length;
          return { selector, stability: STABILITY_SCORES.ARIA_LABEL, strategy: 'aria-label', count };
        }

        // 4. role + aria-label combination
        const role = el.getAttribute('role');
        if (role && ariaLabel) {
          const selector = \`[role="\${CSS.escape(role)}"][aria-label="\${CSS.escape(ariaLabel)}"]\`;
          const count = document.querySelectorAll(selector).length;
          return { selector, stability: STABILITY_SCORES.ROLE_ARIA, strategy: 'role+aria', count };
        }

        // 5. Unique class combination
        if (el.className && typeof el.className === 'string') {
          const classes = el.className.trim().split(/\\s+/).filter(c => c);
          if (classes.length > 0) {
            // Try full class combination first
            const fullSelector = '.' + classes.map(c => CSS.escape(c)).join('.');
            const fullCount = document.querySelectorAll(fullSelector).length;
            if (fullCount === 1) {
              return { selector: fullSelector, stability: STABILITY_SCORES.UNIQUE_CLASS, strategy: 'unique class', count: 1 };
            }

            // Try tag + class
            const tagClass = el.tagName.toLowerCase() + '.' + CSS.escape(classes[0]);
            const tagClassCount = document.querySelectorAll(tagClass).length;
            return { selector: tagClass, stability: STABILITY_SCORES.TAG_CLASS, strategy: 'tag+class', count: tagClassCount };
          }
        }

        // 6. nth-child fallback
        let nth = 1;
        let sibling = el.previousElementSibling;
        while (sibling) {
          if (sibling.tagName === el.tagName) nth++;
          sibling = sibling.previousElementSibling;
        }

        const parent = el.parentElement;
        const parentSelector = parent && parent !== document.body
          ? (parent.id ? '#' + CSS.escape(parent.id) : parent.tagName.toLowerCase())
          : 'body';

        const selector = \`\${parentSelector} > \${el.tagName.toLowerCase()}:nth-child(\${nth})\`;
        const count = document.querySelectorAll(selector).length;
        return { selector, stability: STABILITY_SCORES.NTH_CHILD, strategy: 'nth-child', count };
      }

      // Match text content
      function matchesText(el, keywords, exactText) {
        const text = (el.textContent || '').toLowerCase();
        const ariaLabel = (el.getAttribute('aria-label') || '').toLowerCase();
        const placeholder = (el.getAttribute('placeholder') || '').toLowerCase();

        // Exact text match
        if (exactText) {
          const exact = exactText.toLowerCase();
          if (text.includes(exact) || ariaLabel.includes(exact) || placeholder.includes(exact)) {
            return true;
          }
        }

        // Keyword matching
        if (keywords && keywords.length > 0) {
          const combinedText = text + ' ' + ariaLabel + ' ' + placeholder;
          return keywords.some(kw => combinedText.includes(kw));
        }

        return !exactText && (!keywords || keywords.length === 0);
      }

      // Match attributes
      function matchesAttributes(el) {
        ${role ? `if (el.getAttribute('role') !== '${role}') return false;` : ''}
        ${ariaLabel ? `if (el.getAttribute('aria-label') !== '${ariaLabel}') return false;` : ''}
        ${placeholder ? `if (el.getAttribute('placeholder') !== '${placeholder}') return false;` : ''}
        ${inputType ? `if (el.getAttribute('type') !== '${inputType}') return false;` : ''}

        ${dataTestId ? `
          const testId = el.getAttribute('data-testid');
          if (!testId) return false;
          const pattern = '${dataTestId}'.replace(/\\*/g, '.*');
          const regex = new RegExp('^' + pattern + '$');
          if (!regex.test(testId)) return false;
        ` : ''}

        return true;
      }

      // Calculate spatial distance
      function calculateDistance(el1, el2) {
        const rect1 = el1.getBoundingClientRect();
        const rect2 = el2.getBoundingClientRect();

        const centerX1 = rect1.left + rect1.width / 2;
        const centerY1 = rect1.top + rect1.height / 2;
        const centerX2 = rect2.left + rect2.width / 2;
        const centerY2 = rect2.top + rect2.height / 2;

        const dx = centerX2 - centerX1;
        const dy = centerY2 - centerY1;

        return {
          distance: Math.sqrt(dx * dx + dy * dy),
          dx,
          dy,
        };
      }

      // Check direction match
      function matchesDirection(el, referenceEl, direction) {
        if (!direction) return true;

        const { dx, dy } = calculateDistance(referenceEl, el);

        switch (direction) {
          case 'above': return dy < -10; // Reference is below element
          case 'below': return dy > 10;  // Reference is above element
          case 'left': return dx < -10;
          case 'right': return dx > 10;
          case 'inside': return referenceEl.contains(el);
          default: return true;
        }
      }

      // Discover elements
      const keywords = ${description ? `extractKeywords('${description}')` : 'null'};
      const exactText = ${textContains ? `'${textContains}'` : 'null'};
      const tagFilter = ${tag ? `'${tag}'` : 'null'};

      let allElements = Array.from(document.querySelectorAll('*'));

      // Filter by tag
      if (tagFilter) {
        allElements = allElements.filter(el => el.tagName.toLowerCase() === tagFilter);
      }

      // Filter by attributes
      allElements = allElements.filter(matchesAttributes);

      // Filter by text
      allElements = allElements.filter(el => matchesText(el, keywords, exactText));

      // Spatial filtering
      ${nearSelector ? `
        const referenceEl = document.querySelector('${nearSelector}');
        if (referenceEl) {
          allElements = allElements.filter(el => {
            const dist = calculateDistance(referenceEl, el);
            const withinRange = dist.distance < 1000; // Within 1000px
            const dirMatch = matchesDirection(el, referenceEl, ${nearDirection ? `'${nearDirection}'` : 'null'});
            return withinRange && dirMatch;
          });
        }
      ` : ''}

      // Generate selectors for each element
      const candidatesMap = new Map();

      for (const el of allElements) {
        const selectorData = generateBestSelector(el);

        // Use selector as key to deduplicate
        if (!candidatesMap.has(selectorData.selector)) {
          candidatesMap.set(selectorData.selector, {
            selector: selectorData.selector,
            stability: selectorData.stability,
            strategy: selectorData.strategy,
            count: selectorData.count,
            tag: el.tagName.toLowerCase(),
            text: (el.textContent || '').trim().substring(0, 100),
            visible: isVisible(el),
            html: getOpeningTag(el).substring(0, 200),
          });
        }
      }

      // Convert to array and sort by stability (descending)
      const candidates = Array.from(candidatesMap.values())
        .sort((a, b) => {
          if (b.stability !== a.stability) return b.stability - a.stability;
          return a.count - b.count; // Prefer more specific (lower count)
        });

      return {
        candidates,
        totalFound: allElements.length,
      };
    })()
  `;
}
/**
 * Format inspect result as human-readable output
 */
function formatInspectResult(result) {
    const lines = [];
    if (result.query) {
        lines.push(`Selector Candidates for: ${result.query}`);
    }
    else {
        lines.push('Selector Candidates:');
    }
    lines.push('');
    if (result.candidates.length === 0) {
        lines.push('No matching elements found.');
        lines.push('');
        lines.push('Try:');
        lines.push('  - Broadening your search criteria');
        lines.push('  - Using query_elements to explore the page');
        lines.push('  - Checking if the element is visible');
        return lines.join('\n');
    }
    for (let i = 0; i < result.candidates.length; i++) {
        const candidate = result.candidates[i];
        const rank = i + 1;
        let label = 'OPTION';
        if (rank === 1 && candidate.stability >= STABILITY_SCORES.ARIA_LABEL) {
            label = 'RECOMMENDED';
        }
        else if (rank === 2 && candidate.stability >= STABILITY_SCORES.TAG_CLASS) {
            label = 'ALTERNATIVE';
        }
        else if (candidate.stability < STABILITY_SCORES.TAG_CLASS) {
            label = 'FALLBACK';
        }
        lines.push(`[${rank}] ${label} (Stability: ${candidate.stability}/100)`);
        lines.push(`    Selector: ${candidate.selector}`);
        lines.push(`    Strategy: ${candidate.strategy}`);
        lines.push(`    Element: ${candidate.html}`);
        if (candidate.text) {
            lines.push(`    Text: ${candidate.text}`);
        }
        lines.push(`    Visible: ${candidate.visible}`);
        if (candidate.count > 1) {
            lines.push(`    Matches: ${candidate.count} elements`);
        }
        if (candidate.stability < STABILITY_SCORES.TAG_CLASS && rank === result.candidates.length) {
            lines.push(`    Warning: Less stable selector`);
        }
        lines.push('');
    }
    if (result.candidates.length > 0 && result.candidates[0].stability >= STABILITY_SCORES.ARIA_LABEL) {
        lines.push('Use the RECOMMENDED selector for best reliability.');
    }
    else if (result.candidates.length > 0) {
        lines.push('Note: No high-stability selectors found. Consider adding IDs or data-testid attributes.');
    }
    if (result.candidatesFound > result.candidates.length) {
        lines.push(`\nShowing top ${result.candidates.length} of ${result.candidatesFound} candidates.`);
    }
    return lines.join('\n');
}
//# sourceMappingURL=inspect.js.map