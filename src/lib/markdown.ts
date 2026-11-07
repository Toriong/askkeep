import { DRIVE_IO_URL, PRODUCT_DISCLAIMER } from './constants';
import type { CapturedNote, NoteBlock } from './types';

function blockLine(block: NoteBlock): string {
  if (block.role === 'user') return `**You:** ${block.text}`;
  if (block.role === 'gemini') return `**Gemini:** ${block.text}`;
  if (block.role === 'item') return `- ${block.text}`;
  return block.text;
}

/** Turn a captured Ask Gemini panel into a Markdown file the user can download. */
export function noteToMarkdown(note: CapturedNote): string {
  const lines: string[] = [];
  const title = note.meetingTitle.trim() || 'Ask Gemini notes';
  lines.push(`# ${title}`);
  lines.push('');
  lines.push(`> ${PRODUCT_DISCLAIMER}`);
  lines.push('');
  lines.push(`_Captured: ${note.capturedAt}_`);
  lines.push('');

  for (const section of note.sections) {
    const rendered = section.blocks.map(blockLine).filter((line) => line.trim());
    if (rendered.length === 0) continue;
    lines.push(`## ${section.heading}`);
    lines.push('');
    for (const line of rendered) {
      lines.push(line);
      lines.push('');
    }
  }

  lines.push('---');
  lines.push('');
  lines.push(
    `Filing meeting notes in Drive and need them in another account? Copy the folder with [Drive I/O](${DRIVE_IO_URL}).`,
  );
  lines.push('');
  return lines.join('\n');
}

export function markdownFilename(capturedAt: string): string {
  const day = /^\d{4}-\d{2}-\d{2}/.test(capturedAt) ? capturedAt.slice(0, 10) : 'notes';
  return `askkeep-${day}.md`;
}
