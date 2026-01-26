/**
 * Unit tests for Tool Registry Module
 *
 * Tests registry creation, lookup, validation, and interface compliance.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { createToolRegistry } from '../src/toolRegistry.js';
import type { ToolHandler, ToolRegistry } from '../src/toolRegistry.js';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';

describe('ToolRegistry', () => {
  // Test fixtures
  const testTool1: Tool = {
    name: 'test_tool_1',
    description: 'Test tool 1',
    inputSchema: {
      type: 'object',
      properties: {
        arg1: { type: 'string' },
      },
    },
  };

  const testTool2: Tool = {
    name: 'test_tool_2',
    description: 'Test tool 2',
    inputSchema: {
      type: 'object',
      properties: {
        arg2: { type: 'number' },
      },
    },
  };

  const createTestHandler = (name: string, definition: Tool): ToolHandler => ({
    name,
    definition,
    invoke: async (args: unknown) => ({
      content: [{ type: 'text', text: `Executed ${name}` }],
    }),
  });

  describe('createToolRegistry', () => {
    it('should create registry with correct size', () => {
      const tools = [testTool1, testTool2];
      const handlers = new Map<string, ToolHandler>([
        ['test_tool_1', createTestHandler('test_tool_1', testTool1)],
        ['test_tool_2', createTestHandler('test_tool_2', testTool2)],
      ]);

      const registry = createToolRegistry(tools, handlers);

      assert.strictEqual(registry.size, 2);
    });

    it('should throw error if tool missing handler', () => {
      const tools = [testTool1, testTool2];
      const handlers = new Map<string, ToolHandler>([
        ['test_tool_1', createTestHandler('test_tool_1', testTool1)],
        // Missing test_tool_2 handler
      ]);

      assert.throws(
        () => createToolRegistry(tools, handlers),
        (error: Error) => {
          return (
            error.message.includes('Missing handler for tool') &&
            error.message.includes('test_tool_2')
          );
        }
      );
    });

    it('should accept registry with no tools', () => {
      const tools: Tool[] = [];
      const handlers = new Map<string, ToolHandler>();

      const registry = createToolRegistry(tools, handlers);

      assert.strictEqual(registry.size, 0);
      assert.deepStrictEqual(registry.getAllTools(), []);
    });
  });

  describe('getHandler', () => {
    it('should return correct handler by name', () => {
      const tools = [testTool1];
      const handler = createTestHandler('test_tool_1', testTool1);
      const handlers = new Map([['test_tool_1', handler]]);

      const registry = createToolRegistry(tools, handlers);
      const retrieved = registry.getHandler('test_tool_1');

      assert.strictEqual(retrieved, handler);
      assert.strictEqual(retrieved?.name, 'test_tool_1');
    });

    it('should return undefined for unknown tool', () => {
      const tools = [testTool1];
      const handlers = new Map([
        ['test_tool_1', createTestHandler('test_tool_1', testTool1)],
      ]);

      const registry = createToolRegistry(tools, handlers);
      const retrieved = registry.getHandler('nonexistent_tool');

      assert.strictEqual(retrieved, undefined);
    });

    it('should handle case-sensitive tool names', () => {
      const tools = [testTool1];
      const handlers = new Map([
        ['test_tool_1', createTestHandler('test_tool_1', testTool1)],
      ]);

      const registry = createToolRegistry(tools, handlers);

      assert.notStrictEqual(registry.getHandler('test_tool_1'), undefined);
      assert.strictEqual(registry.getHandler('TEST_TOOL_1'), undefined);
      assert.strictEqual(registry.getHandler('Test_Tool_1'), undefined);
    });
  });

  describe('getAllTools', () => {
    it('should return all tool definitions', () => {
      const tools = [testTool1, testTool2];
      const handlers = new Map<string, ToolHandler>([
        ['test_tool_1', createTestHandler('test_tool_1', testTool1)],
        ['test_tool_2', createTestHandler('test_tool_2', testTool2)],
      ]);

      const registry = createToolRegistry(tools, handlers);
      const allTools = registry.getAllTools();

      assert.strictEqual(allTools.length, 2);
      assert.deepStrictEqual(allTools, tools);
    });

    it('should return empty array for empty registry', () => {
      const tools: Tool[] = [];
      const handlers = new Map<string, ToolHandler>();

      const registry = createToolRegistry(tools, handlers);

      assert.deepStrictEqual(registry.getAllTools(), []);
    });

    it('should return same array reference', () => {
      const tools = [testTool1];
      const handlers = new Map([
        ['test_tool_1', createTestHandler('test_tool_1', testTool1)],
      ]);

      const registry = createToolRegistry(tools, handlers);
      const tools1 = registry.getAllTools();
      const tools2 = registry.getAllTools();

      assert.strictEqual(tools1, tools2);
    });

    it('should return frozen tools array', () => {
      const tools = [testTool1, testTool2];
      const handlers = new Map<string, ToolHandler>([
        ['test_tool_1', createTestHandler('test_tool_1', testTool1)],
        ['test_tool_2', createTestHandler('test_tool_2', testTool2)],
      ]);

      const registry = createToolRegistry(tools, handlers);
      const allTools = registry.getAllTools();

      assert.ok(Object.isFrozen(allTools), 'Tools array should be frozen');
    });
  });

  describe('size', () => {
    it('should return correct handler count', () => {
      const tools = [testTool1, testTool2];
      const handlers = new Map<string, ToolHandler>([
        ['test_tool_1', createTestHandler('test_tool_1', testTool1)],
        ['test_tool_2', createTestHandler('test_tool_2', testTool2)],
      ]);

      const registry = createToolRegistry(tools, handlers);

      assert.strictEqual(registry.size, 2);
    });

    it('should return 0 for empty registry', () => {
      const tools: Tool[] = [];
      const handlers = new Map<string, ToolHandler>();

      const registry = createToolRegistry(tools, handlers);

      assert.strictEqual(registry.size, 0);
    });
  });

  describe('handler execution', () => {
    it('should execute handler invoke method', async () => {
      const tools = [testTool1];
      const handlers = new Map([
        ['test_tool_1', createTestHandler('test_tool_1', testTool1)],
      ]);

      const registry = createToolRegistry(tools, handlers);
      const handler = registry.getHandler('test_tool_1');

      assert.notStrictEqual(handler, undefined);

      const result = await handler!.invoke({ arg1: 'test' });

      assert.strictEqual(result.content[0].type, 'text');
      assert.strictEqual(result.content[0].text, 'Executed test_tool_1');
    });
  });
});
