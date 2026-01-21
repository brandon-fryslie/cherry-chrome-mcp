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
// ------------------------
// Similarity configuration
// ------------------------
const DEFAULTS = {
    // Similarity in [0..1]. 1 = identical.
    minTextSimilarity: 0.92,
    // If URL/line are present and match, we allow a bit lower text similarity.
    minTextSimilaritySameLocation: 0.85,
    // When location is totally different, require very close text.
    minTextSimilarityDifferentLocation: 0.96,
    // Controls normalization aggressiveness.
    normalizeNumbers: true,
    normalizeHex: true,
    normalizeUUID: true,
    normalizeTimestamps: true,
    collapseWhitespace: true,
    // If these fields differ, treat as not similar.
    requireSameLevel: true,
};
// --------------------------------
// Normalization / token extraction
// --------------------------------
function normalizeText(text) {
    let s = text;
    if (DEFAULTS.collapseWhitespace)
        s = s.replace(/\s+/g, ' ');
    s = s.trim().toLowerCase();
    if (DEFAULTS.normalizeUUID) {
        s = s.replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/g, '<uuid>');
    }
    if (DEFAULTS.normalizeHex) {
        s = s.replace(/\b0x[0-9a-f]+\b/g, '<hex>');
        // also catch long hex blobs without 0x
        s = s.replace(/\b[0-9a-f]{16,}\b/g, '<hexblob>');
    }
    if (DEFAULTS.normalizeTimestamps) {
        // ISO-ish timestamps
        s = s.replace(/\b\d{4}-\d{2}-\d{2}[t ]\d{2}:\d{2}:\d{2}(?:\.\d+)?z?\b/g, '<ts>');
        // common ms-since-epoch
        s = s.replace(/\b1\d{12,13}\b/g, '<ts>');
    }
    if (DEFAULTS.normalizeNumbers) {
        // replace standalone integers/decimals (but keep small ones if you want—this is the simple version)
        s = s.replace(/\b\d+(?:\.\d+)?\b/g, '<n>');
    }
    return s;
}
/**
 * Extremely cheap similarity: normalized string equality fast-path,
 * otherwise compare token bigrams with Dice coefficient.
 *
 * Dice(A,B) = 2*|A∩B| / (|A|+|B|)
 * (Good enough for "same-shape" console spam.)
 */
function textSimilarityDice(a, b) {
    if (a === b)
        return 1;
    const A = bigrams(a);
    const B = bigrams(b);
    if (A.size === 0 && B.size === 0)
        return 1;
    if (A.size === 0 || B.size === 0)
        return 0;
    // intersection size
    let inter = 0;
    // iterate smaller set
    const [small, large] = A.size <= B.size ? [A, B] : [B, A];
    for (const x of small)
        if (large.has(x))
            inter++;
    return (2 * inter) / (A.size + B.size);
}
function bigrams(s) {
    // token-ish bigrams on characters after removing runs of spaces
    // keeps it very small and stable; you can switch to word bigrams if you prefer
    const t = s.replace(/\s+/g, ' ');
    const out = new Set();
    for (let i = 0; i < t.length - 1; i++) {
        out.add(t.slice(i, i + 2));
    }
    return out;
}
// -----------------------
// Similarity predicate
// -----------------------
/**
 * Decide whether two console logs are "similar enough" to be treated as equal
 * for purposes of repeating-pattern detection.
 */
function logsSimilar(a, b) {
    if (DEFAULTS.requireSameLevel && a.level !== b.level)
        return false;
    const aLoc = locationKey(a);
    const bLoc = locationKey(b);
    const aNorm = normalizeText(a.text);
    const bNorm = normalizeText(b.text);
    const sim = textSimilarityDice(aNorm, bNorm);
    // If location matches, allow lower similarity (same callsite often varies by ids)
    if (aLoc && bLoc && aLoc === bLoc) {
        return sim >= DEFAULTS.minTextSimilaritySameLocation;
    }
    // If both have locations but differ, require very high similarity
    if (aLoc && bLoc && aLoc !== bLoc) {
        return sim >= DEFAULTS.minTextSimilarityDifferentLocation;
    }
    // If location missing on one/both, use the default threshold
    return sim >= DEFAULTS.minTextSimilarity;
}
function locationKey(l) {
    if (!l.url)
        return null;
    // lineNumber often missing; that's fine
    return l.lineNumber ? `${l.url}:${l.lineNumber}` : l.url;
}
// ------------------------
// Pattern detection machinery
// ------------------------
function patternMatchesAt(logs, startIndex, pattern) {
    if (startIndex + pattern.length > logs.length)
        return false;
    for (let i = 0; i < pattern.length; i++) {
        if (!logsSimilar(logs[startIndex + i], pattern[i]))
            return false;
    }
    return true;
}
function countRepeats(logs, startIndex, patternLength) {
    const pattern = logs.slice(startIndex, startIndex + patternLength);
    let count = 1;
    let pos = startIndex + patternLength;
    while (pos + patternLength <= logs.length) {
        if (patternMatchesAt(logs, pos, pattern)) {
            count++;
            pos += patternLength;
        }
        else {
            break;
        }
    }
    return count;
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
export function compressLogs(logs) {
    if (logs.length === 0) {
        return {
            compressed: [],
            originalCount: 0,
            compressedCount: 0,
            compressionRatio: 0
        };
    }
    const compressed = [];
    let pos = 0;
    while (pos < logs.length) {
        const remaining = logs.length - pos;
        // Calculate max pattern length: √remaining, capped at 20
        const maxPatternLength = Math.min(Math.floor(Math.sqrt(remaining)), 20, remaining);
        let bestPatternLength = 1;
        let bestRepeatCount = 1;
        let bestScore = 0;
        // Try each pattern length, prefer longer patterns
        for (let patternLen = 1; patternLen <= maxPatternLength; patternLen++) {
            const repeatCount = countRepeats(logs, pos, patternLen);
            // Score: patternLength * repeatCount (favor longer patterns)
            // Only consider if it repeats at least twice
            const score = patternLen * repeatCount;
            if (repeatCount >= 2 && score > bestScore) {
                bestScore = score;
                bestPatternLength = patternLen;
                bestRepeatCount = repeatCount;
            }
        }
        // Commit to best pattern found
        if (bestRepeatCount >= 2) {
            // Found a repeating pattern
            const pattern = logs.slice(pos, pos + bestPatternLength);
            compressed.push({
                pattern,
                count: bestRepeatCount,
                startIndex: pos
            });
            pos += bestPatternLength * bestRepeatCount;
        }
        else {
            // No pattern, emit single log
            compressed.push(logs[pos]);
            pos++;
        }
    }
    // Calculate compression ratio
    const compressedCount = compressed.reduce((sum, item) => {
        if ('pattern' in item) {
            // Pattern compressed to 1 display line
            return sum + 1;
        }
        else {
            return sum + 1;
        }
    }, 0);
    return {
        compressed,
        originalCount: logs.length,
        compressedCount,
        compressionRatio: logs.length > 0 ? 1 - (compressedCount / logs.length) : 0
    };
}
/**
 * Format compressed logs for display
 */
export function formatCompressedLogs(result) {
    const output = [];
    for (const item of result.compressed) {
        if ('pattern' in item) {
            // It's a pattern
            const pattern = item;
            if (pattern.pattern.length === 1) {
                // Simple consecutive repetition: A A A → A x3
                const log = pattern.pattern[0];
                const timestamp = new Date(log.timestamp).toISOString().split('T')[1].slice(0, 12);
                const location = log.url ? ` (${log.url}${log.lineNumber ? `:${log.lineNumber}` : ''})` : '';
                output.push(`[${timestamp}] [${log.level.toUpperCase()}] ${log.text}${location} x${pattern.count}`);
            }
            else {
                // Complex pattern: (A B C) x2
                output.push(`┌─ Pattern repeats x${pattern.count} ─────`);
                for (const log of pattern.pattern) {
                    const timestamp = new Date(log.timestamp).toISOString().split('T')[1].slice(0, 12);
                    const location = log.url ? ` (${log.url}${log.lineNumber ? `:${log.lineNumber}` : ''})` : '';
                    output.push(`│ [${timestamp}] [${log.level.toUpperCase()}] ${log.text}${location}`);
                }
                output.push(`└─────────────────────────────────`);
            }
        }
        else {
            // It's a single log
            const log = item;
            const timestamp = new Date(log.timestamp).toISOString().split('T')[1].slice(0, 12);
            const location = log.url ? ` (${log.url}${log.lineNumber ? `:${log.lineNumber}` : ''})` : '';
            output.push(`[${timestamp}] [${log.level.toUpperCase()}] ${log.text}${location}`);
        }
    }
    return output;
}
//# sourceMappingURL=console-pattern.js.map