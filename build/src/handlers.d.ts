/**
 * Tool Handler Registration
 *
 * Creates handler mappings for MCP tool routing.
 * Separate from server setup for maintainability.
 *
 * Architecture:
 * - Imports tool functions from ./tools/
 * - Creates Map<string, ToolHandler> with one entry per registered tool
 * - Single flat registration — no mode branching
 */
import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import type { ToolHandler } from './toolRegistry.js';
/**
 * Create tool handlers for the MCP server.
 *
 * Creates a Map<string, ToolHandler> with one entry per tool in `tools`.
 * Every tool listed in the tool array must have a handler registered here;
 * the registry validates this at initialization (fail-fast).
 *
 * Type Safety: Each handler casts args using Parameters<typeof toolFn>[0].
 */
export declare function createToolHandlers(tools: Tool[]): Map<string, ToolHandler>;
//# sourceMappingURL=handlers.d.ts.map