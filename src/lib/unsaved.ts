import { isChromeLabel, normalizeNoteText } from './capture';

/**
 * Stable fingerprint of the panel text. Whitespace-only differences do not
 * count as a new unsaved edit.
 */
export function fingerprintText(text: string): string {
  const normalized = normalizeNoteText(text);
  let hash = 5381;
  for (let i = 0; i < normalized.length; i += 1) {
    hash = Math.imul(hash, 33) ^ normalized.charCodeAt(i);
  }
  return `${normalized.length.toString(16)}:${(hash >>> 0).toString(16)}`;
}

/**
 * True when the Ask Gemini panel still has note text that has not been
 * copied or downloaded in this browser session.
 */
export function hasUnsavedContent(
  plainText: string,
  exportedFingerprint: string | null | undefined,
): boolean {
  const normalized = normalizeNoteText(plainText);
  if (!normalized || isChromeLabel(normalized)) return false;
  if (!exportedFingerprint) return true;
  return fingerprintText(normalized) !== exportedFingerprint;
}
