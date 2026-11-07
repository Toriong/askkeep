import { describe, expect, it } from 'vitest';
import { extractNote } from '../src/lib/capture';
import { DRIVE_IO_URL, PRODUCT_DISCLAIMER } from '../src/lib/constants';
import { markdownFilename, noteToMarkdown } from '../src/lib/markdown';
import type { CapturedNote } from '../src/lib/types';

const note: CapturedNote = {
  meetingTitle: 'Sample call — launch checklist',
  capturedAt: '2026-11-06T18:04:00.000Z',
  plainText: 'ignored by the formatter',
  sections: [
    {
      kind: 'qa',
      heading: 'Q&A',
      blocks: [
        { role: 'user', text: 'What did we decide about the launch?' },
        { role: 'gemini', text: 'Friday. Alex owns the checklist.' },
      ],
    },
    {
      kind: 'action-items',
      heading: 'Action items',
      blocks: [{ role: 'item', text: 'Alex sends the checklist today' }],
    },
    {
      kind: 'talking-points',
      heading: 'Talking points',
      blocks: [{ role: 'item', text: 'Launch date is Friday' }],
    },
    {
      kind: 'notes',
      heading: 'Notes',
      blocks: [],
    },
  ],
};

describe('noteToMarkdown', () => {
  it('exports Q&A, action items, and talking points', () => {
    const markdown = noteToMarkdown(note);
    expect(markdown).toContain('# Sample call — launch checklist');
    expect(markdown).toContain('## Q&A');
    expect(markdown).toContain('**You:** What did we decide about the launch?');
    expect(markdown).toContain('**Gemini:** Friday. Alex owns the checklist.');
    expect(markdown).toContain('## Action items');
    expect(markdown).toContain('- Alex sends the checklist today');
    expect(markdown).toContain('## Talking points');
    expect(markdown).toContain('- Launch date is Friday');
  });

  it('names the file from the capture date', () => {
    expect(markdownFilename(note.capturedAt)).toBe('askkeep-2026-11-06.md');
    expect(markdownFilename('not-a-date')).toBe('askkeep-notes.md');
  });

  it('includes the Drive I/O link and does not claim to be Meet notes or Docs', () => {
    const markdown = noteToMarkdown(note);
    expect(markdown).toContain(PRODUCT_DISCLAIMER);
    expect(markdown).toContain(`[Drive I/O](${DRIVE_IO_URL})`);
    expect(markdown).toContain('does not replace');
    expect(markdown).not.toContain('googleapis.com');
    expect(markdown).not.toContain('docs.google.com');
  });

  it('omits a section that has no blocks', () => {
    const markdown = noteToMarkdown(note);
    expect(markdown).not.toContain('## Notes');
  });

  it('builds markdown from a mocked Ask Gemini panel', () => {
    document.body.innerHTML = `
      <aside data-askkeep-panel="ask-gemini" aria-label="Ask Gemini">
        <h2>Ask Gemini</h2>
        <div data-askkeep-turn="user">Where did we land on pricing?</div>
        <div data-askkeep-turn="gemini">Keep the current price.</div>
        <section aria-label="Action items">
          <h3>Action items</h3>
          <ul><li>Priya updates the Drive folder</li></ul>
        </section>
      </aside>
    `;
    const panel = document.querySelector('aside');
    expect(panel).not.toBeNull();
    const captured = extractNote(panel as Element, {
      meetingTitle: 'Pricing',
      capturedAt: '2026-11-06T18:04:00.000Z',
    });
    const markdown = noteToMarkdown(captured);
    expect(markdown).toContain('**You:** Where did we land on pricing?');
    expect(markdown).toContain('**Gemini:** Keep the current price.');
    expect(markdown).toContain('- Priya updates the Drive folder');
    expect(markdown).toContain(DRIVE_IO_URL);
  });
});
