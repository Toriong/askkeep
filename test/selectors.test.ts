import { describe, expect, it } from 'vitest';
import {
  END_CALL_SELECTORS,
  LEAVE_SELECTORS,
  PANEL_SELECTORS,
  findAskGeminiPanel,
  findEndCallButton,
  findLeaveButton,
  queryFirst,
} from '../src/lib/selectors';

describe('Meet selector helpers', () => {
  it('keeps every selector in one list', () => {
    expect(PANEL_SELECTORS.length).toBeGreaterThan(0);
    expect(LEAVE_SELECTORS.length).toBeGreaterThan(0);
    expect(END_CALL_SELECTORS.length).toBeGreaterThan(0);
    expect(PANEL_SELECTORS.join(' ')).not.toMatch(/gmail|drive/i);
  });

  it('finds the Ask Gemini panel by the mock hook and by aria-label', () => {
    document.body.innerHTML = `
      <aside data-askkeep-panel="ask-gemini"><h2>Ask Gemini</h2><p>Notes</p></aside>
    `;
    expect(findAskGeminiPanel(document)?.tagName).toBe('ASIDE');

    document.body.innerHTML = `
      <div role="complementary" aria-label="Ask Gemini panel"><p>Notes</p></div>
    `;
    expect(findAskGeminiPanel(document)?.getAttribute('aria-label')).toBe('Ask Gemini panel');
  });

  it('falls back to a visible heading when the aria label is missing', () => {
    document.body.innerHTML = `
      <aside>
        <h2>Ask Gemini</h2>
        <p>Friday launch</p>
      </aside>
    `;
    expect(findAskGeminiPanel(document)?.tagName).toBe('ASIDE');
  });

  it('returns null when the panel is missing or hidden', () => {
    document.body.innerHTML = '<main><button>People</button></main>';
    expect(findAskGeminiPanel(document)).toBeNull();

    document.body.innerHTML = `
      <aside data-askkeep-panel="ask-gemini" hidden><h2>Ask Gemini</h2></aside>
      <aside aria-label="Ask Gemini" style="display: none"><h2>Ask Gemini</h2></aside>
    `;
    expect(findAskGeminiPanel(document)).toBeNull();
  });

  it('skips a hidden panel and uses the visible one', () => {
    document.body.innerHTML = `
      <aside data-askkeep-panel="ask-gemini" hidden id="old"></aside>
      <aside data-askkeep-panel="ask-gemini" id="current"></aside>
    `;
    expect(findAskGeminiPanel(document)?.id).toBe('current');
  });

  it('finds Leave and End call without matching unrelated buttons', () => {
    document.body.innerHTML = `
      <button aria-label="Leave call">Leave</button>
      <button aria-label="Turn off microphone">Mic</button>
      <div role="button" aria-label="End call">End</div>
      <button aria-label="End call for everyone">End for everyone</button>
    `;
    expect(findLeaveButton(document)?.textContent).toBe('Leave');
    expect(findEndCallButton(document)?.getAttribute('aria-label')).toBe('End call');
    expect(queryFirst(document, ['button[aria-label="Missing"]'])).toBeNull();
  });

  it('returns null for Leave and End call when Meet has not rendered them', () => {
    document.body.innerHTML = '<button aria-label="Send a reaction">Reactions</button>';
    expect(findLeaveButton(document)).toBeNull();
    expect(findEndCallButton(document)).toBeNull();
  });

  it('does not throw on an empty document', () => {
    document.body.innerHTML = '';
    expect(findAskGeminiPanel(document)).toBeNull();
    expect(findLeaveButton(document)).toBeNull();
    expect(findEndCallButton(document)).toBeNull();
  });

  it('ignores a selector the document cannot parse', () => {
    document.body.innerHTML = '<button aria-label="Leave call">Leave</button>';
    expect(queryFirst(document, ['[[[', 'button[aria-label="Leave call"]'])?.textContent).toBe('Leave');
  });
});
