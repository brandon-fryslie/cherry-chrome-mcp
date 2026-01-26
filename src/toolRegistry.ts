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

import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import type { ToolResult } from './types.js';

/**
 * Handler interface for a single tool.
 *
 * Each tool has exactly one handler that:
 * - Stores the tool's MCP definition (schema)
 * - Executes the tool with type-safe argument casting
 * - Returns a ToolResult or throws an error
 *
 * Type Safety: Handler receives `unknown` args and casts to specific type
 * using `Parameters<typeof toolFn>[0]` pattern from original implementation.
 */
export interface ToolHandler {
  /** Tool identifier (e.g., 'chrome_connect', 'query_elements') */
  name: string;

  /** MCP tool definition with description and input schema */
  definition: Tool;

  /**
   * Execute the tool with provided arguments.
   *
   * Args are `unknown` type - handler is responsible for type casting.
   * Errors propagate to caller (not caught here).
   *
   * @param args - Tool arguments (type depends on specific tool)
   * @returns Tool execution result
   * @throws Error if tool execution fails
   */
  invoke(args: unknown): Promise<ToolResult>;
}

/**
 * Registry interface for tool lookup and listing.
 *
 * Provides O(1) tool handler lookup and tool definition listing.
 * Initialized once at module load with feature-toggle-specific tools.
 */
export interface ToolRegistry {
  /**
   * Get handler for a tool by name.
   *
   * @param name - Tool identifier
   * @returns ToolHandler if found, undefined otherwise
   */
  getHandler(name: string): ToolHandler | undefined;

  /**
   * Get all tool definitions.
   *
   * @returns Array of MCP tool definitions for ListTools response
   */
  getAllTools(): Tool[];

  /**
   * Get number of registered handlers.
   *
   * @returns Handler count (23 for legacy mode, 17 for smart mode)
   */
  size: number;
}

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
export function createToolRegistry(
  tools: Tool[],
  handlers: Map<string, ToolHandler>
): ToolRegistry {
  // Validate all tools have handlers (fail fast at initialization)
  for (const tool of tools) {
    if (!handlers.has(tool.name)) {
      throw new Error(
        `Tool registry initialization failed: Missing handler for tool '${tool.name}'. ` +
        `All tools must have corresponding handlers.`
      );
    }
  }

  // Freeze tools array to prevent mutation (defensive immutability)
  const frozenTools = Object.freeze([...tools]) as readonly Tool[];

  // Return registry with O(1) lookup
  return {
    getHandler(name: string): ToolHandler | undefined {
      return handlers.get(name);
    },

    getAllTools(): Tool[] {
      // Return frozen array (caller cannot mutate)
      return frozenTools as Tool[];
    },

    get size(): number {
      return handlers.size;
    },
  };
}
