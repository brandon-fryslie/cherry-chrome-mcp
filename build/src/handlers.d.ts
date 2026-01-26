/**
 * Tool Handler Registration
 *
 * Creates handler mappings for MCP tool routing.
 * Separate from server setup for maintainability.
 *
 * Architecture:
 * - Imports all tool functions from ./tools/
 * - Creates Map<string, ToolHandler> based on feature toggle
 * - Handles both legacy (24 tools) and smart (18 tools) modes
 */
import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import type { ToolHandler } from './toolRegistry.js';
/**
 * Create tool handlers based on feature toggle.
 *
 * Phase 2: Handler Mappings
 * - Creates Map of tool name → ToolHandler
 * - Preserves type casting pattern from original switch statements
 * - Shared tools (6 DOM + 3 connection = 9 total) present in both modes
 * - Legacy mode: 24 handlers (9 shared + 15 legacy-specific)
 * - Smart mode: 18 handlers (9 shared + 9 smart-specific)
 *
 * Type Safety: Each handler casts args using Parameters<typeof toolFn>[0]
 */
export declare function createToolHandlers(useLegacy: boolean, legacyTools: Tool[], smartTools: Tool[]): Map<string, ToolHandler>;
//# sourceMappingURL=handlers.d.ts.map