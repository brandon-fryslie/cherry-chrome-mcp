/**
 * Test console log pattern compression with variation tracking
 */
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { compressLogs, formatCompressedLogs } from '../src/tools/console-pattern.js';
import type { ConsoleMessage } from '../src/types.js';

describe('Console Log Variations', () => {
  it('should track variations in similar messages', () => {
    const logs: ConsoleMessage[] = [
      { level: 'log', text: 'Error: timeout 123ms', timestamp: Date.now(), navigationEpoch: 1 },
      { level: 'log', text: 'Error: timeout 456ms', timestamp: Date.now(), navigationEpoch: 1 },
      { level: 'log', text: 'Error: timeout 789ms', timestamp: Date.now(), navigationEpoch: 1 },
    ];

    const result = compressLogs(logs);

    // Should compress to single pattern
    assert.strictEqual(result.compressed.length, 1);
    assert.ok('pattern' in result.compressed[0]);

    const pattern = result.compressed[0] as any;
    assert.strictEqual(pattern.count, 3);
    assert.ok(pattern.variations);

    // Should capture the varying numbers
    const allVariations = pattern.variations.flat(2);
    assert.ok(allVariations.includes('123'));
    assert.ok(allVariations.includes('456'));
    assert.ok(allVariations.includes('789'));
  });

  it('should format variations in output', () => {
    const logs: ConsoleMessage[] = [
      { level: 'log', text: 'User 550e8400-e29b-41d4-a716-446655440000 logged in', timestamp: Date.now(), navigationEpoch: 1 },
      { level: 'log', text: 'User 660f9511-f39c-52e5-b827-557766551111 logged in', timestamp: Date.now(), navigationEpoch: 1 },
      { level: 'log', text: 'User 770fa622-f4ad-63f6-c938-668877662222 logged in', timestamp: Date.now(), navigationEpoch: 1 },
    ];

    const result = compressLogs(logs);
    const formatted = formatCompressedLogs(result);
    const output = formatted.join('\n');

    // Should show compressed count
    assert.ok(output.includes('x3'));

    // Should show variations with UUIDs
    assert.ok(output.includes('Variations:'));
    assert.ok(output.includes('550e8400') || output.includes('660f9511') || output.includes('770fa622'));
  });

  it('should limit variations display to 4 examples', () => {
    const logs: ConsoleMessage[] = [];
    for (let i = 0; i < 10; i++) {
      logs.push({
        level: 'log',
        text: `Request ${i} completed`,
        timestamp: Date.now(),
        navigationEpoch: 1
      });
    }

    const result = compressLogs(logs);
    const formatted = formatCompressedLogs(result);
    const output = formatted.join('\n');

    // Should show "more" indicator
    assert.ok(output.includes('more') || output.includes('x10'));

    // Should show at most 4 distinct variations
    const variationsLine = formatted.find(line => line.includes('Variations:'));
    if (variationsLine) {
      const commaCount = (variationsLine.match(/,/g) || []).length;
      assert.ok(commaCount <= 3, 'Should show at most 4 variations (3 commas)');
    }
  });

  it('should handle mixed normalizations (numbers, UUIDs, hex)', () => {
    const logs: ConsoleMessage[] = [
      { level: 'error', text: 'Error 0xdeadbeef at request 123 for user 550e8400-e29b-41d4-a716-446655440000', timestamp: Date.now(), navigationEpoch: 1 },
      { level: 'error', text: 'Error 0xcafebabe at request 456 for user 660f9511-f39c-52e5-b827-557766551111', timestamp: Date.now(), navigationEpoch: 1 },
    ];

    const result = compressLogs(logs);

    assert.strictEqual(result.compressed.length, 1);
    assert.ok('pattern' in result.compressed[0]);

    const pattern = result.compressed[0] as any;
    const allVariations = pattern.variations.flat(2);

    // Should capture hex values
    assert.ok(allVariations.some((v: string) => v.includes('dead') || v.includes('cafe')));
    // Should capture numbers
    assert.ok(allVariations.includes('123') || allVariations.includes('456'));
    // Should capture UUIDs
    assert.ok(allVariations.some((v: string) => v.includes('-')));
  });
});
