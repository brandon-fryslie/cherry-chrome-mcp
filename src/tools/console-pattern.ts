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
  pattern: ConsoleMessage[];  // The repeating pattern (first occurrence)
  count: number;              // How many times it repeats
  startIndex: number;         // Where it starts in original array
  variations?: string[][][];  // [repetition][logInPattern][variation]
}

export interface CompressionResult {
  compressed: Array<CompressedPattern | ConsoleMessage>;  // Mix of patterns and individual logs
  originalCount: number;
  compressedCount: number;
  compressionRatio: number;  // 0-1, higher is better
}

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
} as const;

// --------------------------------
// Normalization / token extraction
// --------------------------------

function normalizeText(text: string): string {
  let s = text;

  if (DEFAULTS.collapseWhitespace) s = s.replace(/\s+/g, ' ');
  s = s.trim().toLowerCase();

  if (DEFAULTS.normalizeUUID) {
    s = s.replace(
      /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/g,
      '<uuid>'
    );
  }

  if (DEFAULTS.normalizeHex) {
    s = s.replace(/\b0x[0-9a-f]+\b/g, '<hex>');
    // also catch long hex blobs without 0x
    s = s.replace(/\b[0-9a-f]{16,}\b/g, '<hexblob>');
  }

  if (DEFAULTS.normalizeTimestamps) {
    // ISO-ish timestamps
    s = s.replace(
      /\b\d{4}-\d{2}-\d{2}[t ]\d{2}:\d{2}:\d{2}(?:\.\d+)?z?\b/g,
      '<ts>'
    );
    // common ms-since-epoch
    s = s.replace(/\b1\d{12,13}\b/g, '<ts>');
  }

  if (DEFAULTS.normalizeNumbers) {
    // replace standalone integers/decimals
    // Don't require trailing word boundary - allows matching "123ms", "42px", etc.
    s = s.replace(/\b\d+(?:\.\d+)?/g, '<n>');
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
function textSimilarityDice(a: string, b: string): number {
  if (a === b) return 1;

  const A = bigrams(a);
  const B = bigrams(b);

  if (A.size === 0 && B.size === 0) return 1;
  if (A.size === 0 || B.size === 0) return 0;

  // intersection size
  let inter = 0;
  // iterate smaller set
  const [small, large] = A.size <= B.size ? [A, B] : [B, A];
  for (const x of small) if (large.has(x)) inter++;

  return (2 * inter) / (A.size + B.size);
}

function bigrams(s: string): Set<string> {
  // token-ish bigrams on characters after removing runs of spaces
  // keeps it very small and stable; you can switch to word bigrams if you prefer
  const t = s.replace(/\s+/g, ' ');
  const out = new Set<string>();
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
function logsSimilar(a: ConsoleMessage, b: ConsoleMessage): boolean {
  if (DEFAULTS.requireSameLevel && a.level !== b.level) return false;

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

function locationKey(l: ConsoleMessage): string | null {
  if (!l.url) return null;
  // lineNumber often missing; that's fine
  return l.lineNumber ? `${l.url}:${l.lineNumber}` : l.url;
}

/**
 * Extract what differs between the raw text and its normalized form.
 * Returns array of substituted values (numbers, UUIDs, etc.)
 */
function extractVariations(text: string): string[] {
  const variations: string[] = [];

  // Extract in the same order as normalization
  if (DEFAULTS.normalizeUUID) {
    const uuids = text.match(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi);
    if (uuids) variations.push(...uuids);
  }

  if (DEFAULTS.normalizeHex) {
    const hexWithPrefix = text.match(/\b0x[0-9a-f]+\b/gi);
    if (hexWithPrefix) variations.push(...hexWithPrefix);

    const hexBlobs = text.match(/\b[0-9a-f]{16,}\b/gi);
    if (hexBlobs) variations.push(...hexBlobs.filter(h => !h.startsWith('0x')));
  }

  if (DEFAULTS.normalizeTimestamps) {
    const isoTimestamps = text.match(/\b\d{4}-\d{2}-\d{2}[t ]\d{2}:\d{2}:\d{2}(?:\.\d+)?z?\b/gi);
    if (isoTimestamps) variations.push(...isoTimestamps);

    const epochMs = text.match(/\b1\d{12,13}\b/g);
    if (epochMs) variations.push(...epochMs);
  }

  if (DEFAULTS.normalizeNumbers) {
    // Get all numbers not already captured above
    const allNumbers = text.match(/\b\d+(?:\.\d+)?/g);
    if (allNumbers) {
      // Filter out timestamps we already captured
      const filtered = allNumbers.filter(n => !n.match(/^1\d{12,13}$/));
      variations.push(...filtered);
    }
  }

  return variations;
}

// ------------------------
// Pattern detection machinery
// ------------------------

function patternMatchesAt(
  logs: ConsoleMessage[],
  startIndex: number,
  pattern: ConsoleMessage[]
): boolean {
  if (startIndex + pattern.length > logs.length) return false;

  for (let i = 0; i < pattern.length; i++) {
    if (!logsSimilar(logs[startIndex + i], pattern[i])) return false;
  }
  return true;
}

function countRepeats(
  logs: ConsoleMessage[],
  startIndex: number,
  patternLength: number
): { count: number; variations: string[][][] } {
  const pattern = logs.slice(startIndex, startIndex + patternLength);
  let count = 1;
  let pos = startIndex + patternLength;
  const variations: string[][][] = [];

  // Collect variations from first occurrence
  const firstVariations = pattern.map(log => extractVariations(log.text));
  variations.push(firstVariations);

  while (pos + patternLength <= logs.length) {
    if (patternMatchesAt(logs, pos, pattern)) {
      // Collect variations from this repetition
      const repVariations = logs.slice(pos, pos + patternLength).map(log => extractVariations(log.text));
      variations.push(repVariations);

      count++;
      pos += patternLength;
    } else {
      break;
    }
  }

  return { count, variations };
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
export function compressLogs(logs: ConsoleMessage[]): CompressionResult {
  if (logs.length === 0) {
    return {
      compressed: [],
      originalCount: 0,
      compressedCount: 0,
      compressionRatio: 0
    };
  }

  const compressed: Array<CompressedPattern | ConsoleMessage> = [];
  let pos = 0;

  while (pos < logs.length) {
    const remaining = logs.length - pos;

    // Calculate max pattern length: √remaining, capped at 20
    const maxPatternLength = Math.min(
      Math.floor(Math.sqrt(remaining)),
      20,
      remaining
    );

    let bestPatternLength = 1;
    let bestRepeatCount = 1;
    let bestScore = 0;

    // Try each pattern length, prefer longer patterns
    let bestVariations: string[][][] = [];
    for (let patternLen = 1; patternLen <= maxPatternLength; patternLen++) {
      const result = countRepeats(logs, pos, patternLen);

      // Score: patternLength * repeatCount (favor longer patterns)
      // Only consider if it repeats at least twice
      const score = patternLen * result.count;

      if (result.count >= 2 && score > bestScore) {
        bestScore = score;
        bestPatternLength = patternLen;
        bestRepeatCount = result.count;
        bestVariations = result.variations;
      }
    }

    // Commit to best pattern found
    if (bestRepeatCount >= 2) {
      // Found a repeating pattern
      const pattern = logs.slice(pos, pos + bestPatternLength);
      compressed.push({
        pattern,
        count: bestRepeatCount,
        startIndex: pos,
        variations: bestVariations
      });
      pos += bestPatternLength * bestRepeatCount;
    } else {
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
    } else {
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
 * Format variations for display (capped at reasonable size)
 *
 * Example output:
 *   Variations: 123, 456, 789, abc123 +5 more
 */
function formatVariations(variations: string[][][], maxShow = 4): string[] {
  if (!variations || variations.length === 0) return [];

  // Flatten: [repetition][logInPattern][variation] → [variation]
  const allVars = variations.flat(2).filter(v => v.length > 0);
  if (allVars.length === 0) return [];

  // Deduplicate and limit
  const unique = [...new Set(allVars)];
  const shown = unique.slice(0, maxShow);
  const remaining = unique.length - shown.length;

  const formatted: string[] = [];
  formatted.push(`    Variations: ${shown.join(', ')}${remaining > 0 ? ` +${remaining} more` : ''}`);

  return formatted;
}

/**
 * Format compressed logs for display
 */
export function formatCompressedLogs(result: CompressionResult): string[] {
  const output: string[] = [];

  for (const item of result.compressed) {
    if ('pattern' in item) {
      // It's a pattern
      const pattern = item as CompressedPattern;

      if (pattern.pattern.length === 1) {
        // Simple consecutive repetition: A A A → A x3
        const log = pattern.pattern[0];
        const timestamp = new Date(log.timestamp).toISOString().split('T')[1].slice(0, 12);
        const location = log.url ? ` (${log.url}${log.lineNumber ? `:${log.lineNumber}` : ''})` : '';
        output.push(`[${timestamp}] [${log.level.toUpperCase()}] ${log.text}${location} x${pattern.count}`);

        // Show variations if any
        if (pattern.variations) {
          const varLines = formatVariations(pattern.variations);
          output.push(...varLines);
        }
      } else {
        // Complex pattern: (A B C) x2
        output.push(`┌─ Pattern repeats x${pattern.count} ─────`);
        for (const log of pattern.pattern) {
          const timestamp = new Date(log.timestamp).toISOString().split('T')[1].slice(0, 12);
          const location = log.url ? ` (${log.url}${log.lineNumber ? `:${log.lineNumber}` : ''})` : '';
          output.push(`│ [${timestamp}] [${log.level.toUpperCase()}] ${log.text}${location}`);
        }

        // Show variations if any
        if (pattern.variations) {
          const varLines = formatVariations(pattern.variations);
          if (varLines.length > 0) {
            output.push(`│ ${varLines[0].trim()}`);
          }
        }

        output.push(`└─────────────────────────────────`);
      }
    } else {
      // It's a single log
      const log = item as ConsoleMessage;
      const timestamp = new Date(log.timestamp).toISOString().split('T')[1].slice(0, 12);
      const location = log.url ? ` (${log.url}${log.lineNumber ? `:${log.lineNumber}` : ''})` : '';
      output.push(`[${timestamp}] [${log.level.toUpperCase()}] ${log.text}${location}`);
    }
  }

  return output;
}
