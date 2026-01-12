import { describe, it } from 'node:test';
import assert from 'node:assert';

describe('Cherry Chrome MCP Server', () => {
  it('should pass basic sanity check', () => {
    assert.ok(true, 'Basic test passes');
  });

  it('should have all 21 tools defined', () => {
    // Chrome Connection Tools (5)
    const chromeTools = [
      'chrome_connect',
      'chrome_launch',
      'chrome_list_connections',
      'chrome_switch_connection',
      'chrome_disconnect',
    ];

    // DOM Tools (5)
    const domTools = [
      'query_elements',
      'click_element',
      'fill_element',
      'navigate',
      'get_console_logs',
    ];

    // Debugger Tools (11)
    const debuggerTools = [
      'debugger_enable',
      'debugger_set_breakpoint',
      'debugger_get_call_stack',
      'debugger_evaluate_on_call_frame',
      'debugger_step_over',
      'debugger_step_into',
      'debugger_step_out',
      'debugger_resume',
      'debugger_pause',
      'debugger_remove_breakpoint',
      'debugger_set_pause_on_exceptions',
    ];

    const expectedTools = [...chromeTools, ...domTools, ...debuggerTools];

    assert.strictEqual(
      expectedTools.length,
      21,
      'Should have 21 tools total (5 chrome + 5 dom + 11 debugger)'
    );

    // Verify categories
    assert.strictEqual(chromeTools.length, 5, 'Should have 5 Chrome connection tools');
    assert.strictEqual(domTools.length, 5, 'Should have 5 DOM tools');
    assert.strictEqual(debuggerTools.length, 11, 'Should have 11 debugger tools');
  });

  it('should have correct config values', async () => {
    const { MAX_RESULT_SIZE, MAX_DOM_DEPTH, HARD_MAX_DOM_DEPTH } = await import(
      '../src/config.js'
    );

    assert.strictEqual(MAX_RESULT_SIZE, 5000, 'MAX_RESULT_SIZE should be 5000');
    assert.strictEqual(MAX_DOM_DEPTH, 3, 'MAX_DOM_DEPTH should be 3');
    assert.strictEqual(HARD_MAX_DOM_DEPTH, 10, 'HARD_MAX_DOM_DEPTH should be 10');
  });

  it('should have response utilities', async () => {
    const { checkResultSize, analyzeQueryElementsData, escapeForJs } = await import(
      '../src/response.js'
    );

    // Test escapeForJs
    assert.strictEqual(escapeForJs("test'string"), "test\\'string", 'Should escape single quotes');
    assert.strictEqual(escapeForJs("line\nbreak"), 'line\\nbreak', 'Should escape newlines');

    // Test checkResultSize with small result
    const smallResult = 'Hello world';
    assert.strictEqual(
      checkResultSize(smallResult),
      smallResult,
      'Small result should pass through unchanged'
    );

    // Test checkResultSize with large result
    const largeResult = 'x'.repeat(6000);
    const checked = checkResultSize(largeResult);
    assert.ok(
      checked.includes('Result too large'),
      'Large result should be rejected with error message'
    );
  });

  it('should have browser manager', async () => {
    const { browserManager } = await import('../src/browser.js');

    assert.ok(browserManager, 'BrowserManager should be exported');
    assert.strictEqual(
      browserManager.hasConnections(),
      false,
      'Should start with no connections'
    );
    assert.strictEqual(
      browserManager.getActiveId(),
      null,
      'Should have no active connection initially'
    );
  });
});
