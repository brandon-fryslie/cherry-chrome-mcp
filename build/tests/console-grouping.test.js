/**
 * Test console log grouping for consecutive identical messages
 */
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { browserManager } from '../src/browser.js';
import { getConsoleLogs } from '../src/tools/dom.js';
describe('Console Log Grouping', () => {
    const connectionId = 'test-console-grouping';
    before(async () => {
        // Launch browser via browser manager
        await browserManager.launch(9222, connectionId, true);
        // Get the page
        const page = browserManager.getPageOrThrow(connectionId);
        // Navigate to a page that will generate repeated console messages
        await page.goto('data:text/html,<html><body><h1>Test</h1></body></html>');
        // Generate some console messages with repetition
        await page.evaluate(() => {
            console.log('Message A');
            console.log('Message A');
            console.log('Message A');
            console.log('Message B');
            console.error('Error X');
            console.error('Error X');
            console.log('Message C');
            console.log('Message C');
            console.log('Message C');
            console.log('Message C');
            console.log('Message C');
        });
        // Wait a bit for logs to be captured
        await new Promise(resolve => setTimeout(resolve, 100));
    });
    after(async () => {
        browserManager.disconnect(connectionId);
    });
    it('should group consecutive identical messages with x count', async () => {
        const result = await getConsoleLogs({
            limit: 50,
            connection_id: connectionId
        });
        assert.strictEqual(result.isError, undefined);
        assert.strictEqual(result.content[0].type, 'text');
        const text = result.content[0].text;
        // Should contain x3 for Message A (3 consecutive)
        // Format is: "Message A (location) x3" or "Message A x3" depending on whether location info is available
        assert.ok(/Message A.*x3/.test(text), 'Should group 3 consecutive Message A with x3');
        // Should NOT have a count for Message B (only 1 occurrence)
        assert.ok(text.includes('Message B') && !/Message B.*x\d/.test(text), 'Message B should not have count');
        // Should contain x2 for Error X (2 consecutive)
        assert.ok(/Error X.*x2/.test(text), 'Should group 2 consecutive Error X with x2');
        // Should contain x5 for Message C (5 consecutive)
        assert.ok(/Message C.*x5/.test(text), 'Should group 5 consecutive Message C with x5');
        // Should have fewer lines than total messages (grouping is working)
        const messageLines = text.split('\n').filter(line => line.includes('] ['));
        assert.ok(messageLines.length < 11, `Should have fewer than 11 lines (got ${messageLines.length}), grouping should reduce line count`);
    });
    it('should show timestamp of first message in group', async () => {
        const result = await getConsoleLogs({
            limit: 50,
            connection_id: connectionId
        });
        const text = result.content[0].text;
        // Each grouped message should still have a timestamp
        // Format is: "[HH:MM:SS.mmm] [LOG] Message A (location) x3" or without location
        const groupedMessages = text.match(/\[\d{2}:\d{2}:\d{2}\.\d{3}\] \[LOG\] Message A.*x3/);
        assert.ok(groupedMessages, 'Grouped message should have timestamp');
    });
    it('should not group messages with different levels', async () => {
        const result = await getConsoleLogs({
            limit: 50,
            connection_id: connectionId
        });
        const text = result.content[0].text;
        // Error X should be separate from any LOG level messages
        const errorCount = (text.match(/\[ERROR\] Error X/g) || []).length;
        assert.strictEqual(errorCount, 1, 'Should have exactly 1 ERROR line for Error X (grouped)');
    });
});
//# sourceMappingURL=console-grouping.test.js.map