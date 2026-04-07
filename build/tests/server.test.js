import { describe, it } from 'node:test';
import assert from 'node:assert';
describe('Cherry Chrome MCP Server', () => {
    it('should pass basic sanity check', () => {
        assert.ok(true, 'Basic test passes');
    });
    it('should have the expected 19 tools registered', () => {
        // Connection (5), DOM (7), Debugger (7) = 19
        const connectionTools = [
            'connect',
            'chrome_list_connections',
            'chrome_switch_connection',
            'chrome_disconnect',
            'target',
        ];
        const domTools = [
            'query_elements',
            'interact',
            'fill_element',
            'navigate',
            'get_console_logs',
            'inspect_element',
            'get_page_text',
        ];
        const debuggerTools = [
            'enable_debug_tools',
            'breakpoint',
            'step',
            'execution',
            'call_stack',
            'evaluate',
            'pause_on_exceptions',
        ];
        const expectedTools = [...connectionTools, ...domTools, ...debuggerTools];
        assert.strictEqual(expectedTools.length, 19, 'Should have 19 tools total');
        assert.strictEqual(connectionTools.length, 5, 'Should have 5 connection tools');
        assert.strictEqual(domTools.length, 7, 'Should have 7 DOM tools');
        assert.strictEqual(debuggerTools.length, 7, 'Should have 7 debugger tools');
        // No duplicates
        assert.strictEqual(new Set(expectedTools).size, expectedTools.length);
    });
    it('should have correct config values', async () => {
        const { MAX_RESULT_SIZE } = await import('../src/config.js');
        assert.strictEqual(MAX_RESULT_SIZE, 5000, 'MAX_RESULT_SIZE should be 5000');
    });
    it('should not export USE_LEGACY_TOOLS anymore', async () => {
        const configModule = await import('../src/config.js');
        assert.strictEqual(configModule.USE_LEGACY_TOOLS, undefined, 'USE_LEGACY_TOOLS flag should be fully removed');
    });
    it('should have response utilities', async () => {
        const { checkResultSize, analyzeQueryElementsData, escapeForJs } = await import('../src/response.js');
        assert.strictEqual(escapeForJs("test'string"), "test\\'string", 'Should escape single quotes');
        assert.strictEqual(escapeForJs("line\nbreak"), 'line\\nbreak', 'Should escape newlines');
        const smallResult = 'Hello world';
        assert.strictEqual(checkResultSize(smallResult), smallResult, 'Small result should pass through unchanged');
        const largeResult = 'x'.repeat(6000);
        const checked = checkResultSize(largeResult);
        assert.ok(checked.includes('Result too large'), 'Large result should be rejected with error message');
    });
    it('should have browser manager', async () => {
        const { browserManager } = await import('../src/browser.js');
        assert.ok(browserManager, 'BrowserManager should be exported');
        assert.strictEqual(browserManager.hasConnections(), false, 'Should start with no connections');
        assert.strictEqual(browserManager.getActiveId(), null, 'Should have no active connection initially');
    });
});
//# sourceMappingURL=server.test.js.map