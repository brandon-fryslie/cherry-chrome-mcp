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
export {};
//# sourceMappingURL=registry-integration.test.d.ts.map