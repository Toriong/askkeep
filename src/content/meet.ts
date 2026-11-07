/**
 * AskKeep content script for Google Meet.
 *
 * Watches the Ask Gemini side panel and keeps a local copy. If the panel or
 * the Leave / End call controls cannot be found, the chip stays hidden and
 * Meet's own buttons are left alone.
 */

import { extractNote, readMeetingTitle } from '../lib/capture';
import { DRIVE_IO_PROMO, DRIVE_IO_URL, PRODUCT_DISCLAIMER } from '../lib/constants';
import { markdownFilename, noteToMarkdown } from '../lib/markdown';
import { findAskGeminiPanel, findEndCallButton, findLeaveButton } from '../lib/selectors';
import {
  clearNotepad,
  copyText,
  downloadMarkdownFile,
  readExportedFingerprint,
  writeExportedFingerprint,
  writeNotepad,
} from '../lib/storage';
import type { CapturedNote } from '../lib/types';
import { fingerprintText, hasUnsavedContent } from '../lib/unsaved';

const HOST_ID = 'askkeep-root';

declare global {
  interface Window {
    __askkeepMounted?: boolean;
  }
}

interface ChipState {
  note: CapturedNote;
  copied: boolean;
  preview: boolean;
  copyFailed: boolean;
}

function boot(): void {
  if (window.__askkeepMounted) return;
  window.__askkeepMounted = true;

  let exportedFingerprint: string | null = null;
  let currentPlain = '';
  let capturedAt = new Date().toISOString();
  let lastNote: CapturedNote | null = null;
  let bypass = false;
  let dialogOpen = false;
  let previewOpen = false;
  let copied = false;
  let copyFailed = false;
  let suppressPersist = false;
  let scanTimer = 0;

  const host = document.createElement('div');
  host.id = HOST_ID;
  host.setAttribute('data-askkeep-ignore', 'true');
  host.style.cssText = [
    'all: initial',
    'position: fixed',
    'inset: 0',
    'z-index: 2147483646',
    'pointer-events: none',
    'display: none',
  ].join(';');

  const shadow = host.attachShadow({ mode: 'open' });
  const style = document.createElement('style');
  style.textContent = CHIP_CSS;
  const chip = document.createElement('section');
  chip.setAttribute('aria-label', 'AskKeep local copy');
  const dialog = document.createElement('div');
  shadow.append(style, chip, dialog);

  const mountPoint = document.documentElement || document.body;
  mountPoint.appendChild(host);

  void readExportedFingerprint()
    .then((fingerprint) => {
      exportedFingerprint = fingerprint;
      scan();
    })
    .catch(() => {
      scan();
    });

  const observer = new MutationObserver(() => scheduleScan());
  try {
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      characterData: true,
    });
  } catch {
    hide();
    return;
  }

  window.addEventListener('resize', positionChip, true);
  window.addEventListener('scroll', positionChip, true);

  const boundButtons = new WeakSet<HTMLElement>();

  function scheduleScan(): void {
    window.clearTimeout(scanTimer);
    scanTimer = window.setTimeout(scan, 120);
  }

  function hide(): void {
    host.style.display = 'none';
    chip.replaceChildren();
  }

  function scan(): void {
    try {
      const panel = findAskGeminiPanel(document);
      if (!panel) {
        lastNote = null;
        currentPlain = '';
        hide();
        return;
      }

      const rect = panel.getBoundingClientRect();
      if (rect.width < 40 || rect.height < 40) {
        hide();
        return;
      }

      const note = extractNote(panel, {
        meetingTitle: readMeetingTitle(document),
        capturedAt,
      });

      if (note.plainText !== currentPlain) {
        currentPlain = note.plainText;
        capturedAt = new Date().toISOString();
        note.capturedAt = capturedAt;
        copied = false;
        copyFailed = false;
        if (note.plainText && !suppressPersist) {
          void writeNotepad({
            meetingTitle: note.meetingTitle,
            capturedAt: note.capturedAt,
            plainText: note.plainText,
            markdown: noteToMarkdown(note),
            fingerprint: fingerprintText(note.plainText),
          });
        }
      } else {
        note.capturedAt = capturedAt;
      }

      lastNote = note;

      renderChip({ note, copied, preview: previewOpen, copyFailed });
      positionChip();
      host.style.display = 'block';
      watchButton(findLeaveButton(document), 'leave');
      watchButton(findEndCallButton(document), 'end');
    } catch {
      hide();
    }
  }

  function positionChip(): void {
    try {
      const panel = findAskGeminiPanel(document);
      if (!panel) return;
      const rect = panel.getBoundingClientRect();
      const width = Math.min(300, Math.max(220, rect.width - 16));
      chip.style.width = `${width}px`;
      chip.style.top = `${Math.max(8, rect.top + 8)}px`;
      chip.style.left = `${Math.max(8, rect.right - width - 8)}px`;
    } catch {
      hide();
    }
  }

  function watchButton(button: HTMLElement | null, action: 'leave' | 'end'): void {
    if (!button || boundButtons.has(button)) return;
    boundButtons.add(button);
    const intercept = (event: Event) => {
      if (bypass) return;
      if (!hasUnsavedContent(currentPlain, exportedFingerprint)) return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      if (!dialogOpen) openDialog(action, button);
    };
    button.addEventListener('pointerdown', intercept, true);
    button.addEventListener('click', intercept, true);
  }

  function openDialog(action: 'leave' | 'end', button: HTMLElement): void {
    dialogOpen = true;
    const leaving = action === 'leave';
    dialog.replaceChildren();
    dialog.style.cssText = DIALOG_BACKDROP_STYLE;

    const card = document.createElement('div');
    card.setAttribute('role', 'alertdialog');
    card.setAttribute('aria-modal', 'true');
    card.setAttribute('aria-labelledby', 'askkeep-dialog-title');
    card.style.cssText = DIALOG_CARD_STYLE;

    const title = document.createElement('h2');
    title.id = 'askkeep-dialog-title';
    title.textContent = leaving ? 'Leave this call?' : 'End this call?';
    title.style.cssText = 'margin:0 0 8px;font-size:18px;line-height:1.3;color:#1f1f1f;';

    const body = document.createElement('p');
    body.textContent =
      'Ask Gemini still has text that has not been copied or downloaded. If you leave, that content will be lost.';
    body.style.cssText = 'margin:0 0 14px;font-size:14px;line-height:1.45;color:#3c4043;';

    const promo = document.createElement('p');
    promo.style.cssText = 'margin:0 0 16px;font-size:12px;line-height:1.45;color:#5f6368;';
    promo.append(document.createTextNode(`${DRIVE_IO_PROMO.replace('Drive I/O.', '')}`));
    const promoLink = document.createElement('a');
    promoLink.href = DRIVE_IO_URL;
    promoLink.target = '_blank';
    promoLink.rel = 'noreferrer noopener';
    promoLink.textContent = 'Drive I/O';
    promoLink.style.color = '#7a4ec0';
    promo.append(promoLink, document.createTextNode('.'));

    const actions = document.createElement('div');
    actions.style.cssText = 'display:flex;justify-content:flex-end;gap:8px;';

    const stay = document.createElement('button');
    stay.type = 'button';
    stay.textContent = 'Stay in the call';
    stay.style.cssText = PRIMARY_BUTTON_STYLE;

    const proceed = document.createElement('button');
    proceed.type = 'button';
    proceed.textContent = leaving ? 'Leave anyway' : 'End call anyway';
    proceed.style.cssText = QUIET_BUTTON_STYLE;

    const close = () => {
      dialogOpen = false;
      dialog.replaceChildren();
      dialog.style.display = 'none';
    };

    stay.addEventListener('click', close);
    proceed.addEventListener('click', () => {
      close();
      void confirmLeave(button);
    });
    card.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') close();
    });

    actions.append(proceed, stay);
    card.append(title, body, promo, actions);
    dialog.append(card);
    dialog.style.display = 'flex';
    stay.focus();
  }

  async function confirmLeave(button: HTMLElement): Promise<void> {
    suppressPersist = true;
    bypass = true;
    exportedFingerprint = null;
    currentPlain = '';
    lastNote = null;
    await clearNotepad();
    button.click();
    window.setTimeout(() => {
      bypass = false;
    }, 600);
  }

  async function onCopy(): Promise<void> {
    if (!lastNote?.plainText) return;
    const markdown = noteToMarkdown(lastNote);
    const ok = await copyText(markdown);
    copyFailed = !ok;
    copied = ok;
    if (ok) {
      exportedFingerprint = fingerprintText(lastNote.plainText);
      await writeExportedFingerprint(exportedFingerprint);
    }
    renderChip({
      note: lastNote,
      copied,
      preview: previewOpen,
      copyFailed,
    });
  }

  async function onDownload(): Promise<void> {
    if (!lastNote?.plainText) return;
    const markdown = noteToMarkdown(lastNote);
    downloadMarkdownFile(markdown, markdownFilename(lastNote.capturedAt));
    exportedFingerprint = fingerprintText(lastNote.plainText);
    copied = true;
    copyFailed = false;
    await writeExportedFingerprint(exportedFingerprint);
    renderChip({
      note: lastNote,
      copied,
      preview: previewOpen,
      copyFailed,
    });
  }

  function renderChip(state: ChipState): void {
    chip.style.cssText = CHIP_STYLE;
    chip.replaceChildren();

    const header = document.createElement('div');
    header.style.cssText = 'display:flex;align-items:center;gap:8px;';

    const dot = document.createElement('span');
    dot.style.cssText = `width:8px;height:8px;border-radius:99px;background:${
      state.note.plainText ? '#3d8f63' : '#f9ab00'
    };flex:none;`;

    const label = document.createElement('div');
    label.style.cssText = 'min-width:0;flex:1;';
    const title = document.createElement('div');
    title.textContent = 'Saved locally';
    title.style.cssText = 'font-size:13px;font-weight:700;color:#1f1f1f;';
    const subtitle = document.createElement('div');
    subtitle.textContent = state.note.plainText
      ? 'Held in this browser for this call.'
      : 'Waiting for Ask Gemini text.';
    subtitle.style.cssText = 'font-size:11px;color:#5f6368;line-height:1.3;';
    label.append(title, subtitle);
    header.append(dot, label);

    const buttons = document.createElement('div');
    buttons.style.cssText = 'display:flex;gap:6px;margin-top:10px;';

    const previewButton = button('Preview', () => {
      previewOpen = !previewOpen;
      if (lastNote) {
        renderChip({
          note: lastNote,
          copied,
          preview: previewOpen,
          copyFailed,
        });
      }
    });
    previewButton.setAttribute('aria-expanded', state.preview ? 'true' : 'false');

    const copyButton = button(state.copied && !state.copyFailed ? 'Copied' : 'Copy', () => {
      void onCopy();
    });
    const downloadButton = button('Download .md', () => {
      void onDownload();
    });
    const disabled = !state.note.plainText;
    copyButton.disabled = disabled;
    downloadButton.disabled = disabled;
    buttons.append(previewButton, copyButton, downloadButton);

    chip.append(header, buttons);

    if (state.copyFailed) {
      const error = document.createElement('p');
      error.textContent = 'Could not copy. Try Download .md.';
      error.style.cssText = 'margin:8px 0 0;font-size:11px;color:#b3261e;';
      chip.append(error);
    }

    if (state.preview && state.note.plainText) {
      const preview = document.createElement('div');
      preview.style.cssText = [
        'margin-top:10px',
        'max-height:220px',
        'overflow:auto',
        'padding:8px',
        'border-radius:8px',
        'background:#f7f4ff',
        'color:#1f1f1f',
        'font-size:12px',
        'line-height:1.4',
        'white-space:pre-wrap',
      ].join(';');
      preview.textContent = state.note.plainText;
      chip.append(preview);
    }

    const footer = document.createElement('p');
    footer.style.cssText = 'margin:10px 0 0;font-size:11px;line-height:1.4;color:#5f6368;';
    const sentence = DRIVE_IO_PROMO.endsWith('Drive I/O.')
      ? DRIVE_IO_PROMO.slice(0, -'Drive I/O.'.length)
      : `${DRIVE_IO_PROMO} `;
    footer.append(document.createTextNode(sentence));
    const link = document.createElement('a');
    link.href = DRIVE_IO_URL;
    link.target = '_blank';
    link.rel = 'noreferrer noopener';
    link.textContent = 'Drive I/O';
    link.style.cssText = 'color:#6d3bb5;font-weight:600;text-decoration:underline;';
    footer.append(link, document.createTextNode('.'));
    chip.append(footer);
    chip.title = PRODUCT_DISCLAIMER;
    positionChip();
  }
}

function button(label: string, onClick: () => void): HTMLButtonElement {
  const el = document.createElement('button');
  el.type = 'button';
  el.textContent = label;
  el.style.cssText = SMALL_BUTTON_STYLE;
  el.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    onClick();
  });
  return el;
}

const CHIP_STYLE = [
  'position:fixed',
  'pointer-events:auto',
  'box-sizing:border-box',
  'padding:10px 12px',
  'border-radius:14px',
  'background:#ffffff',
  'color:#1f1f1f',
  'border:1px solid rgba(202,160,250,0.9)',
  'box-shadow:0 8px 24px rgba(32,33,36,0.18)',
  'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',
].join(';');

const SMALL_BUTTON_STYLE = [
  'appearance:none',
  'border:0',
  'border-radius:999px',
  'padding:6px 10px',
  'font:600 12px/1 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',
  'color:#1f1f1f',
  'background:linear-gradient(90deg,rgba(209,127,247,1),rgba(157,214,252,1))',
  'cursor:pointer',
].join(';');

const PRIMARY_BUTTON_STYLE = [
  'appearance:none',
  'border:0',
  'border-radius:999px',
  'padding:8px 14px',
  'font:700 13px/1 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',
  'color:#1f1f1f',
  'background:linear-gradient(90deg,rgba(209,127,247,1),rgba(157,214,252,1))',
  'cursor:pointer',
].join(';');

const QUIET_BUTTON_STYLE = [
  'appearance:none',
  'border:1px solid #dadce0',
  'border-radius:999px',
  'padding:8px 14px',
  'font:600 13px/1 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',
  'color:#3c4043',
  'background:#fff',
  'cursor:pointer',
].join(';');

const DIALOG_BACKDROP_STYLE = [
  'position:fixed',
  'inset:0',
  'display:flex',
  'align-items:center',
  'justify-content:center',
  'pointer-events:auto',
  'background:rgba(32,33,36,0.45)',
  'padding:24px',
  'box-sizing:border-box',
].join(';');

const DIALOG_CARD_STYLE = [
  'width:min(420px,100%)',
  'background:#fff',
  'color:#1f1f1f',
  'border-radius:16px',
  'padding:20px',
  'box-shadow:0 16px 40px rgba(32,33,36,0.28)',
  'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',
  'box-sizing:border-box',
].join(';');

const CHIP_CSS = `
  button:disabled { opacity: 0.45; cursor: default; }
  a:focus, button:focus { outline: 2px solid rgba(157,214,252,1); outline-offset: 2px; }
`;

try {
  boot();
} catch {
  document.getElementById(HOST_ID)?.remove();
}
