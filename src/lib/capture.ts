import type { CapturedNote, NoteBlock, NoteKind, NoteSection } from './types';

export function normalizeNoteText(text: string): string {
  return text.replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
}

export function cleanText(value: string | null | undefined): string {
  return (value || '')
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function isChromeLabel(text: string): boolean {
  return /^(ask gemini|gemini)$/i.test(normalizeNoteText(text));
}

const SECTION_KINDS: { kind: NoteKind; heading: string; pattern: RegExp }[] = [
  { kind: 'action-items', heading: 'Action items', pattern: /^action items?$/i },
  { kind: 'talking-points', heading: 'Talking points', pattern: /^talking points?$/i },
  { kind: 'qa', heading: 'Q&A', pattern: /^(q\s*&\s*a|q\s+and\s+a|questions?(?:\s+and\s+answers?)?)$/i },
];

function matchKind(label: string): { kind: NoteKind; heading: string } | null {
  const trimmed = normalizeNoteText(label);
  for (const entry of SECTION_KINDS) {
    if (entry.pattern.test(trimmed)) {
      return { kind: entry.kind, heading: entry.heading };
    }
  }
  return null;
}

function isSkippable(el: Element): boolean {
  if (!(el instanceof HTMLElement)) return false;
  if (el.hidden) return true;
  if (el.getAttribute('aria-hidden') === 'true') return true;
  if (el.closest('[data-askkeep-ignore="true"]')) return true;
  const styleAttr = el.getAttribute('style') || '';
  if (/display\s*:\s*none/i.test(styleAttr) || /visibility\s*:\s*hidden/i.test(styleAttr)) {
    return true;
  }
  try {
    const style = getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden') return true;
  } catch {
    // jsdom and detached nodes can refuse computed style. The attribute checks above still apply.
  }
  return false;
}

function sectionLabel(el: Element): string {
  const labelledBy = el.getAttribute('aria-labelledby');
  if (labelledBy) {
    const labelEl = el.ownerDocument?.getElementById(labelledBy);
    if (labelEl?.textContent) return labelEl.textContent;
  }
  const aria = el.getAttribute('aria-label');
  if (aria) return aria;
  const heading = el.querySelector('h1, h2, h3, h4');
  return heading?.textContent || '';
}

function roleFrom(el: Element): NoteBlock['role'] {
  const raw = (
    el.getAttribute('data-askkeep-turn') ||
    el.getAttribute('data-message-author') ||
    ''
  ).toLowerCase();
  if (raw === 'user' || raw === 'you' || raw === 'human') return 'user';
  if (raw === 'gemini' || raw === 'model' || raw === 'assistant') return 'gemini';
  return 'text';
}

function visibleText(el: Element): string {
  const clone = el.cloneNode(true) as HTMLElement;
  clone
    .querySelectorAll('script, style, [hidden], [aria-hidden="true"], [data-askkeep-ignore="true"]')
    .forEach((node) => node.remove());
  return cleanText(clone.textContent);
}

function blocksFromContainer(el: Element, kind: NoteKind): NoteBlock[] {
  const blocks: NoteBlock[] = [];
  const seen = new Set<string>();

  const push = (role: NoteBlock['role'], text: string) => {
    const cleaned = cleanText(text);
    if (!cleaned || isChromeLabel(cleaned)) return;
    const key = `${role}:${normalizeNoteText(cleaned)}`;
    if (seen.has(key)) return;
    seen.add(key);
    blocks.push({ role, text: cleaned });
  };

  el.querySelectorAll('[data-askkeep-turn], [data-message-author]').forEach((turn) => {
    if (isSkippable(turn)) return;
    push(roleFrom(turn), turn.textContent || '');
  });

  if (kind === 'action-items' || kind === 'talking-points') {
    el.querySelectorAll('li').forEach((item) => {
      if (isSkippable(item)) return;
      if (item.closest('[data-askkeep-turn], [data-message-author]')) return;
      push('item', item.textContent || '');
    });
  }

  if (blocks.length === 0) {
    const clone = el.cloneNode(true) as HTMLElement;
    clone.querySelectorAll('h1, h2, h3, h4, script, style, [hidden]').forEach((node) => node.remove());
    const text = cleanText(clone.textContent);
    if (text && !isChromeLabel(text)) {
      push(kind === 'qa' ? 'text' : 'item', text);
    }
  }

  return blocks;
}

function fallbackText(panel: Element): string {
  return visibleText(panel)
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !isChromeLabel(line))
    .join('\n')
    .trim();
}

export function plainTextFromSections(sections: NoteSection[]): string {
  return sections
    .map((section) => {
      const body = section.blocks
        .map((block) => block.text.trim())
        .filter((text) => text && !isChromeLabel(text))
        .join('\n');
      if (!body) return '';
      return `${section.heading}\n${body}`;
    })
    .filter(Boolean)
    .join('\n\n')
    .trim();
}

export function readMeetingTitle(doc: Document): string {
  const explicit = doc.querySelector('[data-askkeep-meeting-title]');
  const explicitText = cleanText(explicit?.textContent);
  if (explicitText) return explicitText;
  const title = cleanText(doc.title.replace(/^Meet\s*[-–—:]\s*/i, ''));
  if (title && !/^google meet$/i.test(title)) return title;
  return 'Ask Gemini notes';
}

/**
 * Read Q&A, action items, and talking points from an Ask Gemini panel.
 * Returns an empty plainText when the panel has no meaningful note text.
 */
export function extractNote(
  panel: Element,
  options?: { meetingTitle?: string; capturedAt?: string },
): CapturedNote {
  const sections: NoteSection[] = [];
  const consumed = new Set<Element>();

  panel.querySelectorAll('section, [role="region"]').forEach((el) => {
    if (isSkippable(el)) return;
    const kind = matchKind(sectionLabel(el));
    if (!kind) return;
    const blocks = blocksFromContainer(el, kind.kind);
    if (blocks.length === 0) return;
    sections.push({ kind: kind.kind, heading: kind.heading, blocks });
    consumed.add(el);
    el.querySelectorAll('*').forEach((child) => consumed.add(child));
  });

  const turns = Array.from(
    panel.querySelectorAll('[data-askkeep-turn], [data-message-author]'),
  ).filter((el) => !consumed.has(el) && !isSkippable(el));

  if (turns.length > 0) {
    const blocks: NoteBlock[] = [];
    for (const turn of turns) {
      const text = cleanText(turn.textContent);
      if (!text || isChromeLabel(text)) continue;
      blocks.push({ role: roleFrom(turn), text });
    }
    if (blocks.length > 0) {
      const existing = sections.find((section) => section.kind === 'qa');
      if (existing) existing.blocks.unshift(...blocks);
      else sections.unshift({ kind: 'qa', heading: 'Q&A', blocks });
    }
  }

  if (sections.length === 0) {
    const text = fallbackText(panel);
    if (text) {
      sections.push({
        kind: 'notes',
        heading: 'Notes',
        blocks: [{ role: 'text', text }],
      });
    }
  }

  return {
    meetingTitle: options?.meetingTitle || 'Ask Gemini notes',
    capturedAt: options?.capturedAt || new Date().toISOString(),
    sections,
    plainText: plainTextFromSections(sections),
  };
}
