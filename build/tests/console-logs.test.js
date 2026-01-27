/**
 * Tests for console-logs.ts pure functions
 *
 * These tests verify the pure functions work correctly in isolation,
 * without needing browser connections or side effects.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { filterLogsByLevel, limitLogs, determineChangeStatus, extractPageState, processLogs, formatTimeSince, formatPageStateHeader, formatLogWithStack, formatProcessedLogs, formatConsoleLogsOutput, updateQueryTracking, } from '../src/tools/console-logs.js';
// ============================================================================
// Test Fixtures
// ============================================================================
function createLog(overrides = {}) {
    return {
        level: 'log',
        text: 'test message',
        timestamp: Date.now(),
        navigationEpoch: 1,
        ...overrides,
    };
}
function createConnectionState(overrides = {}) {
    return {
        lastQueryEpoch: null,
        lastConsoleQuery: null,
        navigationEpoch: 1,
        lastNavigationTime: Date.now() - 5000,
        hmrUpdateCount: 0,
        lastHmrTime: null,
        ...overrides,
    };
}
// ============================================================================
// Tests: Data Transformation Functions
// ============================================================================
describe('filterLogsByLevel', () => {
    it('should return all logs when level is "all"', () => {
        const logs = [
            createLog({ level: 'log' }),
            createLog({ level: 'error' }),
            createLog({ level: 'warn' }),
        ];
        const result = filterLogsByLevel(logs, 'all');
        assert.strictEqual(result.length, 3);
        assert.strictEqual(result, logs); // Same reference for 'all'
    });
    it('should filter logs by specific level', () => {
        const logs = [
            createLog({ level: 'log', text: 'log1' }),
            createLog({ level: 'error', text: 'error1' }),
            createLog({ level: 'log', text: 'log2' }),
            createLog({ level: 'warn', text: 'warn1' }),
        ];
        const result = filterLogsByLevel(logs, 'log');
        assert.strictEqual(result.length, 2);
        assert.strictEqual(result[0].text, 'log1');
        assert.strictEqual(result[1].text, 'log2');
    });
    it('should return empty array when no logs match', () => {
        const logs = [
            createLog({ level: 'log' }),
            createLog({ level: 'warn' }),
        ];
        const result = filterLogsByLevel(logs, 'error');
        assert.strictEqual(result.length, 0);
    });
});
describe('limitLogs', () => {
    it('should return last N logs', () => {
        const logs = [
            createLog({ text: '1' }),
            createLog({ text: '2' }),
            createLog({ text: '3' }),
            createLog({ text: '4' }),
            createLog({ text: '5' }),
        ];
        const result = limitLogs(logs, 3);
        assert.strictEqual(result.length, 3);
        assert.strictEqual(result[0].text, '3');
        assert.strictEqual(result[1].text, '4');
        assert.strictEqual(result[2].text, '5');
    });
    it('should return all logs when limit exceeds length', () => {
        const logs = [
            createLog({ text: '1' }),
            createLog({ text: '2' }),
        ];
        const result = limitLogs(logs, 10);
        assert.strictEqual(result.length, 2);
    });
});
describe('determineChangeStatus', () => {
    it('should return "first_query" when never queried before', () => {
        const connection = createConnectionState({
            lastQueryEpoch: null,
            lastConsoleQuery: null,
        });
        const result = determineChangeStatus(connection);
        assert.strictEqual(result, 'first_query');
    });
    it('should return "reloaded" when navigation epoch changed', () => {
        const connection = createConnectionState({
            lastQueryEpoch: 1,
            lastConsoleQuery: Date.now() - 1000,
            navigationEpoch: 2, // Newer than lastQueryEpoch
        });
        const result = determineChangeStatus(connection);
        assert.strictEqual(result, 'reloaded');
    });
    it('should return "hmr_updated" when HMR occurred since last query', () => {
        const now = Date.now();
        const connection = createConnectionState({
            lastQueryEpoch: 1,
            lastConsoleQuery: now - 2000,
            navigationEpoch: 1,
            hmrUpdateCount: 1,
            lastHmrTime: now - 1000, // After lastConsoleQuery
        });
        const result = determineChangeStatus(connection);
        assert.strictEqual(result, 'hmr_updated');
    });
    it('should return "unchanged" when nothing changed', () => {
        const now = Date.now();
        const connection = createConnectionState({
            lastQueryEpoch: 1,
            lastConsoleQuery: now - 1000,
            navigationEpoch: 1,
            hmrUpdateCount: 0,
            lastHmrTime: null,
        });
        const result = determineChangeStatus(connection);
        assert.strictEqual(result, 'unchanged');
    });
});
describe('extractPageState', () => {
    it('should extract all page state fields', () => {
        const now = Date.now();
        const connection = createConnectionState({
            navigationEpoch: 5,
            lastNavigationTime: now - 10000,
            hmrUpdateCount: 3,
            lastHmrTime: now - 5000,
        });
        const result = extractPageState(connection);
        assert.strictEqual(result.navigationEpoch, 5);
        assert.strictEqual(result.lastNavigationTime, now - 10000);
        assert.strictEqual(result.hmrUpdateCount, 3);
        assert.strictEqual(result.lastHmrTime, now - 5000);
        assert.strictEqual(result.changeStatus, 'first_query');
    });
});
describe('processLogs', () => {
    it('should filter and limit logs when expandErrors is true', () => {
        const logs = [
            createLog({ level: 'log', text: '1' }),
            createLog({ level: 'error', text: 'err1' }),
            createLog({ level: 'log', text: '2' }),
            createLog({ level: 'log', text: '3' }),
            createLog({ level: 'log', text: '4' }),
        ];
        const result = processLogs(logs, {
            filterLevel: 'log',
            limit: 2,
            expandErrors: true,
        });
        assert.strictEqual(result.totalBeforeFilter, 5);
        assert.strictEqual(result.totalAfterFilter, 4); // 4 'log' level messages
        assert.strictEqual(result.shown, 2);
        assert.strictEqual(result.expandErrors, true);
        assert.strictEqual(result.compressionResult, undefined);
    });
    it('should compress logs when expandErrors is false', () => {
        const logs = [
            createLog({ level: 'log', text: 'same' }),
            createLog({ level: 'log', text: 'same' }),
            createLog({ level: 'log', text: 'same' }),
        ];
        const result = processLogs(logs, {
            filterLevel: 'all',
            limit: 10,
            expandErrors: false,
        });
        assert.ok(result.compressionResult);
        assert.strictEqual(result.expandErrors, false);
    });
});
// ============================================================================
// Tests: Formatting Functions
// ============================================================================
describe('formatTimeSince', () => {
    it('should format seconds', () => {
        const now = 1000000;
        const timestamp = now - 30 * 1000; // 30 seconds ago
        const result = formatTimeSince(timestamp, now);
        assert.strictEqual(result, '30s ago');
    });
    it('should format minutes', () => {
        const now = 1000000;
        const timestamp = now - 5 * 60 * 1000; // 5 minutes ago
        const result = formatTimeSince(timestamp, now);
        assert.strictEqual(result, '5m ago');
    });
    it('should format hours', () => {
        const now = 1000000000;
        const timestamp = now - 3 * 60 * 60 * 1000; // 3 hours ago
        const result = formatTimeSince(timestamp, now);
        assert.strictEqual(result, '3h ago');
    });
    it('should format days', () => {
        const now = 1000000000000;
        const timestamp = now - 2 * 24 * 60 * 60 * 1000; // 2 days ago
        const result = formatTimeSince(timestamp, now);
        assert.strictEqual(result, '2d ago');
    });
});
describe('formatPageStateHeader', () => {
    it('should format first query state', () => {
        const state = {
            changeStatus: 'first_query',
            navigationEpoch: 1,
            lastNavigationTime: Date.now() - 5000,
            hmrUpdateCount: 0,
            lastHmrTime: null,
        };
        const result = formatPageStateHeader(state);
        assert.ok(result.includes('--- PAGE STATE ---'));
        assert.ok(result.some((line) => line.includes('Navigation epoch: 1')));
        // Should NOT include change status for first query
        assert.ok(!result.some((line) => line.includes('[PAGE RELOADED')));
    });
    it('should format reloaded state', () => {
        const state = {
            changeStatus: 'reloaded',
            navigationEpoch: 2,
            lastNavigationTime: Date.now() - 1000,
            hmrUpdateCount: 0,
            lastHmrTime: null,
        };
        const result = formatPageStateHeader(state);
        assert.ok(result.some((line) => line.includes('[PAGE RELOADED')));
    });
    it('should include HMR info when present', () => {
        const now = Date.now();
        const state = {
            changeStatus: 'hmr_updated',
            navigationEpoch: 1,
            lastNavigationTime: now - 10000,
            hmrUpdateCount: 3,
            lastHmrTime: now - 1000,
        };
        const result = formatPageStateHeader(state, now);
        assert.ok(result.some((line) => line.includes('HMR updates since navigation: 3')));
        assert.ok(result.some((line) => line.includes('Last HMR update:')));
    });
});
describe('formatLogWithStack', () => {
    it('should format basic log without stack', () => {
        const log = createLog({
            level: 'log',
            text: 'test message',
            timestamp: new Date('2024-01-15T10:30:45.123Z').getTime(),
            url: 'http://example.com/script.js',
            lineNumber: 42,
        });
        const result = formatLogWithStack(log, false);
        assert.strictEqual(result.length, 1);
        assert.ok(result[0].includes('[LOG]'));
        assert.ok(result[0].includes('test message'));
        assert.ok(result[0].includes('script.js:42'));
    });
    it('should include stack trace for errors when expandErrors is true', () => {
        const log = createLog({
            level: 'error',
            text: 'Error occurred',
            timestamp: Date.now(),
            stackTrace: 'Error: Error occurred\n    at foo (script.js:10:5)\n    at bar (script.js:20:3)',
        });
        const result = formatLogWithStack(log, true);
        assert.ok(result.length > 1); // Has stack trace lines
        assert.ok(result.some((line) => line.includes('at foo')));
    });
    it('should not include stack trace when expandErrors is false', () => {
        const log = createLog({
            level: 'error',
            text: 'Error occurred',
            stackTrace: 'Error: Error occurred\n    at foo (script.js:10:5)',
        });
        const result = formatLogWithStack(log, false);
        assert.strictEqual(result.length, 1);
    });
});
describe('formatProcessedLogs', () => {
    it('should show empty message when no logs', () => {
        const processed = {
            logs: [],
            totalBeforeFilter: 0,
            totalAfterFilter: 0,
            shown: 0,
            filterLevel: 'all',
            expandErrors: false,
        };
        const result = formatProcessedLogs(processed);
        assert.ok(result.some((line) => line.includes('No console messages captured')));
    });
    it('should include filter info in empty message', () => {
        const processed = {
            logs: [],
            totalBeforeFilter: 5,
            totalAfterFilter: 0,
            shown: 0,
            filterLevel: 'error',
            expandErrors: false,
        };
        const result = formatProcessedLogs(processed);
        assert.ok(result.some((line) => line.includes('(filter: error)')));
    });
});
// ============================================================================
// Tests: Side Effect Functions
// ============================================================================
describe('updateQueryTracking', () => {
    it('should update connection query tracking fields', () => {
        const now = 1000000;
        const connection = createConnectionState({
            lastConsoleQuery: null,
            lastQueryEpoch: null,
            navigationEpoch: 5,
        });
        updateQueryTracking(connection, now);
        assert.strictEqual(connection.lastConsoleQuery, now);
        assert.strictEqual(connection.lastQueryEpoch, 5);
    });
});
// ============================================================================
// Tests: Integration (formatConsoleLogsOutput)
// ============================================================================
describe('formatConsoleLogsOutput', () => {
    it('should combine page state and logs into complete output', () => {
        const now = Date.now();
        const pageState = {
            changeStatus: 'first_query',
            navigationEpoch: 1,
            lastNavigationTime: now - 5000,
            hmrUpdateCount: 0,
            lastHmrTime: null,
        };
        const processed = {
            logs: [createLog({ text: 'test' })],
            totalBeforeFilter: 1,
            totalAfterFilter: 1,
            shown: 1,
            filterLevel: 'all',
            expandErrors: true,
        };
        const result = formatConsoleLogsOutput(pageState, processed, now);
        assert.ok(result.includes('--- PAGE STATE ---'));
        assert.ok(result.includes('--- CONSOLE MESSAGES ---'));
    });
});
//# sourceMappingURL=console-logs.test.js.map