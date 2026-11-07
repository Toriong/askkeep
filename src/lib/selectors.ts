/**
 * Meet redraws this DOM often. Every selector the content script uses lives
 * here. If a selector stops matching, the helpers return null and the content
 * script hides its chip instead of touching the call controls.
 *
 * The data-askkeep-* hooks exist so tests and the local mock Meet page can
 * exercise the same code path. Real Meet is matched by aria labels.
 */

export const PANEL_SELECTORS = [
  '[data-askkeep-panel="ask-gemini"]',
  '[aria-label="Ask Gemini"]',
  '[aria-label="Ask Gemini panel"]',
  'aside[aria-label*="Ask Gemini"]',
  '[role="complementary"][aria-label*="Ask Gemini"]',
  '[data-panel-id="ask-gemini"]',
] as const;

export const LEAVE_SELECTORS = [
  '[data-askkeep-action="leave"]',
  'button[aria-label="Leave call"]',
  'button[aria-label="Leave the call"]',
  '[role="button"][aria-label="Leave call"]',
  'button[data-tooltip="Leave call"]',
] as const;

export const END_CALL_SELECTORS = [
  '[data-askkeep-action="end"]',
  'button[aria-label="End call"]',
  'button[aria-label="End the call"]',
  '[role="button"][aria-label="End call"]',
  'button[aria-label="End meeting"]',
  'button[aria-label="End call for everyone"]',
  'button[aria-label*="End the call for everyone"]',
] as const;

function isVisible(el: HTMLElement): boolean {
  if (el.hidden) return false;
  if (el.getAttribute('aria-hidden') === 'true') return false;
  const styleAttr = el.getAttribute('style') || '';
  if (/display\s*:\s*none/i.test(styleAttr) || /visibility\s*:\s*hidden/i.test(styleAttr)) {
    return false;
  }
  try {
    const style = getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden') return false;
  } catch {
    // Treat an unreadable style as visible. A missing element is the fail-soft path.
  }
  return true;
}

export function queryFirst(root: ParentNode, selectors: readonly string[]): HTMLElement | null {
  for (const selector of selectors) {
    try {
      const matches = root.querySelectorAll(selector);
      for (const match of matches) {
        if (match instanceof HTMLElement && isVisible(match)) return match;
      }
    } catch {
      // An unsupported selector in an older browser is skipped.
    }
  }
  return null;
}

function headingLooksLikeAskGemini(candidate: Element): boolean {
  const heading = candidate.querySelector('h1, h2, h3, [role="heading"]');
  const label = (heading?.textContent || '').replace(/\s+/g, ' ').trim();
  return /^ask gemini\b/i.test(label);
}

/** Find the Ask Gemini side panel, or null when Meet's DOM does not match. */
export function findAskGeminiPanel(root: ParentNode = document): HTMLElement | null {
  const direct = queryFirst(root, PANEL_SELECTORS);
  if (direct) return direct;

  try {
    const candidates = root.querySelectorAll('aside, [role="complementary"]');
    for (const candidate of candidates) {
      if (!(candidate instanceof HTMLElement)) continue;
      if (!isVisible(candidate)) continue;
      if (headingLooksLikeAskGemini(candidate)) return candidate;
    }
  } catch {
    return null;
  }
  return null;
}

export function findLeaveButton(root: ParentNode = document): HTMLElement | null {
  return queryFirst(root, LEAVE_SELECTORS);
}

export function findEndCallButton(root: ParentNode = document): HTMLElement | null {
  return queryFirst(root, END_CALL_SELECTORS);
}
