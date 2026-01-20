/**
 * Selector Builder / Element Inspector
 *
 * Discovers CSS selectors from natural language descriptions and attributes.
 * Generates ranked selector candidates with stability scores.
 */
import type { InspectElementArgs, ToolResult } from '../types.js';
/**
 * Inspect element and generate ranked selector candidates
 *
 * Discovers elements matching the provided criteria and generates
 * stable CSS selectors with stability scores.
 */
export declare function inspectElement(args: InspectElementArgs): Promise<ToolResult>;
//# sourceMappingURL=inspect.d.ts.map