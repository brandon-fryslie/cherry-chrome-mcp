/**
 * Tests for page-extractors.ts
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import puppeteer, { Browser, Page } from 'puppeteer';
import {
  extractFocused,
  extractButtons,
  extractLinks,
  extractInputs,
  extractForms,
  extractToggles,
  extractAlerts,
  extractModals,
  extractErrors,
  extractLandmarks,
  extractTabs,
  extractHeadings,
} from '../src/tools/page-extractors.js';

// Sample HTML for testing
const TEST_HTML = `
<!DOCTYPE html>
<html>
<head><title>Test Page</title></head>
<body>
  <header role="banner">
    <h1>Test Page</h1>
    <nav role="navigation">
      <a href="/home">Home</a>
      <a href="/about">About</a>
    </nav>
  </header>

  <main role="main">
    <h2>Form Test</h2>
    <form id="test-form" action="/submit" method="POST">
      <input type="text" id="name" name="name" placeholder="Your name" />
      <input type="email" id="email" name="email" placeholder="Your email" />
      <input type="checkbox" id="subscribe" name="subscribe" />
      <label for="subscribe">Subscribe to newsletter</label>
      <button type="submit">Submit</button>
    </form>

    <section>
      <h3>Buttons</h3>
      <button id="btn1">Click Me</button>
      <button id="btn2" disabled>Disabled</button>
      <div role="button">Role Button</div>
    </section>

    <div role="tablist">
      <div role="tab" aria-selected="true">Tab 1</div>
      <div role="tab" aria-selected="false">Tab 2</div>
    </div>

    <div role="alert">This is an alert</div>
    <div role="dialog" aria-modal="true" aria-label="Test Dialog"></div>
  </main>

  <footer role="contentinfo">
    <p>&copy; 2024 Test</p>
  </footer>
</body>
</html>
`;

describe('Page Extractors', () => {
  let browser: Browser;
  let page: Page;

  // Setup: launch browser and load test page
  before(async () => {
    browser = await puppeteer.launch({ headless: true });
    page = await browser.newPage();
    await page.setContent(TEST_HTML);
  });

  // Cleanup: close browser
  after(async () => {
    await browser.close();
  });

  describe('extractButtons', () => {
    it('should extract button information', async () => {
      const result = await extractButtons(page, { limit: 10 });

      assert.strictEqual(result.total >= 3, true, 'Should find at least 3 buttons');
      assert.strictEqual(result.items.length >= 3, true, 'Should return at least 3 items');

      const btn1 = result.items.find((b: { selector: string }) => b.selector.includes('btn1'));
      assert.ok(btn1, 'Should find button with id btn1');
      assert.strictEqual(btn1?.text, 'Click Me');
      assert.strictEqual(btn1?.disabled, false);
    });

    it('should respect limit parameter', async () => {
      const result = await extractButtons(page, { limit: 2 });

      assert.strictEqual(result.items.length <= 2, true, 'Should limit results to 2');
      if (result.total > 2) {
        assert.strictEqual(result.truncated, true, 'Should mark as truncated');
      }
    });
  });

  describe('extractLinks', () => {
    it('should extract link information', async () => {
      const result = await extractLinks(page, { limit: 10 });

      assert.strictEqual(result.total >= 2, true, 'Should find at least 2 links');

      const homeLink = result.items.find((l: { text: string }) => l.text === 'Home');
      assert.ok(homeLink, 'Should find Home link');
      assert.strictEqual(homeLink?.href.endsWith('/home'), true);
    });
  });

  describe('extractInputs', () => {
    it('should extract input information', async () => {
      const result = await extractInputs(page, { limit: 10 });

      assert.strictEqual(result.total >= 3, true, 'Should find at least 3 inputs');

      const nameInput = result.items.find((i: { id?: string }) => i.id === 'name');
      assert.ok(nameInput, 'Should find name input');
      assert.strictEqual(nameInput?.type, 'text');
      assert.strictEqual(nameInput?.placeholder, 'Your name');
    });
  });

  describe('extractForms', () => {
    it('should extract form information', async () => {
      const result = await extractForms(page, { limit: 10 });

      assert.strictEqual(result.total >= 1, true, 'Should find at least 1 form');

      const testForm = result.items[0];
      assert.ok(testForm, 'Should find form');
      assert.strictEqual(testForm.method?.toLowerCase(), 'post', 'Form method should be POST');
      assert.strictEqual(testForm.inputCount >= 3, true, 'Form should have at least 3 inputs');
      assert.strictEqual(testForm.inputs.length >= 3, true, 'Should include child inputs');
    });
  });

  describe('extractToggles', () => {
    it('should extract checkbox information', async () => {
      const result = await extractToggles(page, { limit: 10 });

      assert.strictEqual(result.total >= 1, true, 'Should find at least 1 checkbox');

      const subscribe = result.items[0];
      assert.ok(subscribe, 'Should find subscribe checkbox');
      assert.strictEqual(subscribe.checked, false, 'Checkbox should not be checked');
    });
  });

  describe('extractLandmarks', () => {
    it('should extract landmark information', async () => {
      const result = await extractLandmarks(page, { limit: 10 });

      assert.strictEqual(result.total >= 4, true, 'Should find at least 4 landmarks');

      const types = result.items.map((l: { type: string }) => l.type);
      assert.strictEqual(types.includes('banner') || types.includes('header'), true, 'Should find header/banner');
      assert.strictEqual(types.includes('navigation') || types.includes('nav'), true, 'Should find nav');
      assert.strictEqual(types.includes('main'), true, 'Should find main');
      assert.strictEqual(types.includes('contentinfo') || types.includes('footer'), true, 'Should find footer');
    });
  });

  describe('extractTabs', () => {
    it('should extract tab group information', async () => {
      const result = await extractTabs(page, { limit: 10 });

      assert.strictEqual(result.total >= 1, true, 'Should find at least 1 tab group');

      const tabGroup = result.items[0];
      assert.ok(tabGroup, 'Should find tab group');
      assert.strictEqual(tabGroup.tabs.length, 2, 'Should have 2 tabs');
      assert.strictEqual(tabGroup.tabs[0].selected, true, 'First tab should be selected');
      assert.strictEqual(tabGroup.tabs[1].selected, false, 'Second tab should not be selected');
    });
  });

  describe('extractHeadings', () => {
    it('should extract heading information', async () => {
      const result = await extractHeadings(page, { limit: 10 });

      assert.strictEqual(result.total >= 3, true, 'Should find at least 3 headings');

      const h1 = result.items.find((h: { level: number }) => h.level === 1);
      assert.ok(h1, 'Should find h1');
      assert.strictEqual(h1?.text, 'Test Page');
    });
  });

  describe('extractAlerts', () => {
    it('should extract alert information', async () => {
      const result = await extractAlerts(page, { limit: 10 });

      assert.strictEqual(result.total >= 1, true, 'Should find at least 1 alert');

      const alert = result.items[0];
      assert.ok(alert, 'Should find alert');
      assert.strictEqual(alert.role, 'alert');
      assert.strictEqual(alert.text, 'This is an alert');
    });
  });

  describe('extractModals', () => {
    it('should extract modal information', async () => {
      const result = await extractModals(page, { limit: 10, includeHidden: true });

      assert.strictEqual(result.total >= 1, true, 'Should find at least 1 modal');

      const modal = result.items[0];
      assert.ok(modal, 'Should find modal');
      assert.strictEqual(modal.title, 'Test Dialog');
    });
  });

  describe('extractFocused', () => {
    it('should return null when no element focused', async () => {
      const result = await extractFocused(page);
      assert.strictEqual(result, null);
    });

    it('should return focused element when one has focus', async () => {
      await page.focus('#name');
      const result = await extractFocused(page);

      assert.ok(result, 'Should find focused element');
      assert.strictEqual(result?.id, 'name');
      assert.strictEqual(result?.type, 'text');
    });
  });
});
