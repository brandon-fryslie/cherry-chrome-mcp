/**
 * Response formatting utilities for Cherry Chrome MCP
 * Ported from Python check_result_size and analyze_query_elements_data
 *
 * Key principle: REJECT oversized results with smart analysis
 * instead of truncating (which wastes tokens on incomplete data).
 */
import type { QueryElementsResult } from './types.js';
/**
 * Analyze query_elements data and provide specific narrowing suggestions.
 * This is deterministic - we control the JSON format.
 *
 * @param data - Parsed query_elements result
 * @returns Suggestions string
 */
export declare function analyzeQueryElementsData(data: QueryElementsResult): string;
/**
 * Check if result is too large and return helpful error if so.
 *
 * Instead of truncating (which wastes tokens on useless partial data),
 * reject oversized results with a smart error message that analyzes the data
 * and provides specific suggestions for narrowing the query.
 *
 * @param result - The result string to check
 * @param maxSize - Maximum allowed size in characters
 * @param context - Tool context for suggestions
 * @param analysisData - Optional structured data for deterministic analysis
 * @returns Original result if small enough, or error message with suggestions
 */
export declare function checkResultSize(result: string, maxSize?: number, context?: string, analysisData?: QueryElementsResult): string;
/**
 * Format a successful tool response.
 *
 * @param text - Response text
 * @returns Tool result object
 */
export declare function successResponse(text: string): {
    content: Array<{
        type: 'text';
        text: string;
    }>;
};
/**
 * Format an error tool response.
 *
 * @param text - Error text
 * @returns Tool result object with isError flag
 */
export declare function errorResponse(text: string): {
    content: Array<{
        type: 'text';
        text: string;
    }>;
    isError: true;
};
/**
 * Escape single quotes in a string for JavaScript strings.
 *
 * @param str - String to escape
 * @returns Escaped string
 */
export declare function escapeForJs(str: string): string;
//# sourceMappingURL=response.d.ts.map