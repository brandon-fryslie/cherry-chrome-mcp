/**
 * Console Log Pattern Compression (Similarity-based)
 *
 * Same greedy single-pass pattern algorithm.
 * Only change: logsEqual -> logsSimilar via normalization + similarity score.
 *
 * Detects and compresses repeating patterns in console log sequences:
 * - Consecutive: A A A → A x3
 * - Alternating: A B A B → (A B) x2
 * - Complex: A B C D A B C D → (A B C D) x2
 * - Similar: "Error: timeout 123ms" + "Error: timeout 456ms" → grouped
 *
 * Uses greedy single-pass algorithm with O(n√n) complexity.
 * Bounded pattern length prevents O(n²) explosion on pathological inputs.
 */
import type { ConsoleMessage } from '../types.js';
export interface CompressedPattern {
    pattern: ConsoleMessage[];
    count: number;
    startIndex: number;
    variations?: string[][][];
}
export interface CompressionResult {
    compressed: Array<CompressedPattern | ConsoleMessage>;
    originalCount: number;
    compressedCount: number;
    compressionRatio: number;
}
/**
 * Compress console logs by detecting repeating patterns
 *
 * Uses greedy algorithm:
 * 1. Try pattern lengths from 1 to √(remaining logs), capped at 20
 * 2. Find best pattern at current position (prefer longer patterns)
 * 3. Commit to best match and advance
 * 4. Repeat until done
 *
 * Only emits patterns with 2+ repetitions (compression threshold).
 */
export declare function compressLogs(logs: ConsoleMessage[]): CompressionResult;
/**
 * Format compressed logs for display
 */
export declare function formatCompressedLogs(result: CompressionResult): string[];
//# sourceMappingURL=console-pattern.d.ts.map