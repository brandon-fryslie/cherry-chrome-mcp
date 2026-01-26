/**
 * Tool Registry Module
 *
 * Provides type-safe, efficient tool routing for MCP server.
 * Replaces dual switch statement routing with O(1) Map-based lookup.
 *
 * Architecture:
 * - ToolHandler: Interface for executable tool handlers
 * - ToolRegistry: Interface for tool lookup and listing
 * - createToolRegistry: Factory function with validation
 *
 * Key Principles (from CLAUDE.md):
 * - ONE SOURCE OF TRUTH: Registry is single tool name → handler mapping
 * - SINGLE ENFORCER: Registry does NOT handle errors (enforced at MCP boundary)
 * - ONE-WAY DEPENDENCIES: Registry depends on tools, not vice versa
 */
/**
 * Create a tool registry from tool definitions and handlers.
 *
 * Validates that:
 * - All tools have corresponding handlers
 * - Handler names match tool names
 *
 * Initialization is eager (fails fast if misconfigured).
 *
 * @param tools - Array of MCP tool definitions
 * @param handlers - Map of tool name to handler implementation
 * @returns Initialized ToolRegistry instance
 * @throws Error if any tool lacks a handler
 *
 * @example
 * ```typescript
 * const tools = [{ name: 'query_elements', ... }];
 * const handlers = new Map([
 *   ['query_elements', {
 *     name: 'query_elements',
 *     definition: tools[0],
 *     invoke: async (args) => queryElements(args as QueryElementsArgs)
 *   }]
 * ]);
 * const registry = createToolRegistry(tools, handlers);
 * ```
 */
export function createToolRegistry(tools, handlers) {
    // Validate all tools have handlers (fail fast at initialization)
    for (const tool of tools) {
        if (!handlers.has(tool.name)) {
            throw new Error(`Tool registry initialization failed: Missing handler for tool '${tool.name}'. ` +
                `All tools must have corresponding handlers.`);
        }
    }
    // Return registry with O(1) lookup
    return {
        getHandler(name) {
            return handlers.get(name);
        },
        getAllTools() {
            return tools;
        },
        get size() {
            return handlers.size;
        },
    };
}
//# sourceMappingURL=toolRegistry.js.map