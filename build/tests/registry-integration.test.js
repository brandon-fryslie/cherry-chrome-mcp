/**
 * Registry Integration Tests
 *
 * Tests the full MCP request flow: request -> registry -> handler -> response
 * Uses mocked tool implementations to avoid Chrome dependency.
 *
 * Focus: Contract testing (behavior, not implementation)
 * - Valid tool request returns successful ToolResult
 * - Unknown tool returns undefined from registry
 * - Handler errors propagate correctly
 * - Arguments pass through unchanged
 * - connection_id extraction works for error classification
 */
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { createToolRegistry } from '../src/toolRegistry.js';
describe('Registry Integration', () => {
    // Test fixtures
    const mockTools = [
        {
            name: 'mock_tool',
            description: 'A mock tool for testing',
            inputSchema: {
                type: 'object',
                properties: {
                    input: { type: 'string' },
                    connection_id: { type: 'string' },
                },
            },
        },
    ];
    const createMockHandler = (name, definition, behavior) => ({
        name,
        definition,
        invoke: behavior,
    });
    describe('successful tool execution', () => {
        it('should return successful response for valid tool request', async () => {
            const handlers = new Map([
                [
                    'mock_tool',
                    createMockHandler('mock_tool', mockTools[0], async (args) => {
                        const typedArgs = args;
                        return {
                            content: [{ type: 'text', text: `Received: ${typedArgs.input}` }],
                        };
                    }),
                ],
            ]);
            const registry = createToolRegistry(mockTools, handlers);
            const handler = registry.getHandler('mock_tool');
            assert.ok(handler, 'Handler should exist');
            const result = await handler.invoke({ input: 'test value' });
            assert.ok(result.content, 'Result should have content');
            assert.strictEqual(result.content[0].type, 'text');
            assert.ok(result.content[0].text.includes('test value'), 'Result should include input value');
        });
        it('should pass arguments to handler unchanged', async () => {
            let receivedArgs;
            const handlers = new Map([
                [
                    'mock_tool',
                    createMockHandler('mock_tool', mockTools[0], async (args) => {
                        receivedArgs = args;
                        return { content: [{ type: 'text', text: 'ok' }] };
                    }),
                ],
            ]);
            const registry = createToolRegistry(mockTools, handlers);
            const handler = registry.getHandler('mock_tool');
            assert.ok(handler);
            const testArgs = { connection_id: 'test-conn', foo: 'bar', input: 'test' };
            await handler.invoke(testArgs);
            assert.deepStrictEqual(receivedArgs, testArgs);
        });
    });
    describe('error handling', () => {
        it('should return undefined for unknown tool', () => {
            const handlers = new Map([
                [
                    'mock_tool',
                    createMockHandler('mock_tool', mockTools[0], async () => ({
                        content: [{ type: 'text', text: 'ok' }],
                    })),
                ],
            ]);
            const registry = createToolRegistry(mockTools, handlers);
            const handler = registry.getHandler('nonexistent_tool');
            assert.strictEqual(handler, undefined);
        });
        it('should propagate handler errors', async () => {
            const errorTool = {
                name: 'error_tool',
                description: 'Throws error',
                inputSchema: { type: 'object' },
            };
            const handlers = new Map([
                [
                    'error_tool',
                    createMockHandler('error_tool', errorTool, async () => {
                        throw new Error('Handler execution failed');
                    }),
                ],
            ]);
            const registry = createToolRegistry([errorTool], handlers);
            const handler = registry.getHandler('error_tool');
            assert.ok(handler);
            await assert.rejects(async () => handler.invoke({}), { message: 'Handler execution failed' });
        });
        it('should extract connection_id from args for error context', async () => {
            // This test verifies that connection_id is available in handler args
            // and can be extracted for error classification (done in index.ts)
            let capturedConnectionId;
            const handlers = new Map([
                [
                    'mock_tool',
                    createMockHandler('mock_tool', mockTools[0], async (args) => {
                        const typedArgs = args;
                        capturedConnectionId = typedArgs.connection_id;
                        return { content: [{ type: 'text', text: 'ok' }] };
                    }),
                ],
            ]);
            const registry = createToolRegistry(mockTools, handlers);
            const handler = registry.getHandler('mock_tool');
            assert.ok(handler);
            await handler.invoke({ connection_id: 'test-connection-123' });
            assert.strictEqual(capturedConnectionId, 'test-connection-123');
        });
    });
    describe('registry initialization', () => {
        it('should validate tool-handler consistency', () => {
            const tools = [
                {
                    name: 'tool_a',
                    description: 'Tool A',
                    inputSchema: { type: 'object' },
                },
                {
                    name: 'tool_b',
                    description: 'Tool B',
                    inputSchema: { type: 'object' },
                },
            ];
            const handlers = new Map([
                [
                    'tool_a',
                    createMockHandler('tool_a', tools[0], async () => ({
                        content: [{ type: 'text', text: 'a' }],
                    })),
                ],
                // Missing tool_b handler
            ]);
            assert.throws(() => createToolRegistry(tools, handlers), (error) => {
                return (error.message.includes('Missing handler for tool') &&
                    error.message.includes('tool_b'));
            });
        });
        it('should handle empty tool list', () => {
            const tools = [];
            const handlers = new Map();
            const registry = createToolRegistry(tools, handlers);
            assert.strictEqual(registry.size, 0);
            assert.deepStrictEqual(registry.getAllTools(), []);
        });
    });
    describe('MCP request flow simulation', () => {
        it('should simulate full request->registry->handler->response flow', async () => {
            // Simulate the flow in index.ts CallToolRequestSchema handler
            const mockRequest = {
                params: {
                    name: 'mock_tool',
                    arguments: { input: 'test data', connection_id: 'conn-1' },
                },
            };
            const handlers = new Map([
                [
                    'mock_tool',
                    createMockHandler('mock_tool', mockTools[0], async (args) => {
                        const typedArgs = args;
                        return {
                            content: [
                                {
                                    type: 'text',
                                    text: `Processed: ${typedArgs.input} on ${typedArgs.connection_id}`,
                                },
                            ],
                        };
                    }),
                ],
            ]);
            const registry = createToolRegistry(mockTools, handlers);
            // Simulate request handling (from index.ts)
            const { name, arguments: args } = mockRequest.params;
            const handler = registry.getHandler(name);
            assert.ok(handler, 'Registry should return handler for known tool');
            const result = await handler.invoke(args);
            assert.ok(result.content);
            assert.strictEqual(result.content[0].type, 'text');
            const text = result.content[0].text;
            assert.ok(text.includes('test data'));
            assert.ok(text.includes('conn-1'));
        });
        it('should simulate error flow with unknown tool', () => {
            const mockRequest = {
                params: {
                    name: 'unknown_tool',
                    arguments: {},
                },
            };
            const handlers = new Map();
            const registry = createToolRegistry([], handlers);
            // Simulate request handling
            const { name } = mockRequest.params;
            const handler = registry.getHandler(name);
            assert.strictEqual(handler, undefined, 'Unknown tool should return undefined');
            // In index.ts, this would throw Error('Unknown tool: unknown_tool')
        });
    });
});
//# sourceMappingURL=registry-integration.test.js.map