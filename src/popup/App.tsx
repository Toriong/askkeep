import { createRoot } from 'react-dom/client';
import { useEffect, useState } from 'react';
import { Copy, Download, ExternalLink } from 'lucide-react';
import {
  APP_COLOR_GRADIENT,
  APP_NAME,
  DRIVE_IO_PROMO,
  DRIVE_IO_URL,
  LOCAL_NOTEPAD_KEY,
  PRODUCT_DISCLAIMER,
} from '../lib/constants';
import { markdownFilename } from '../lib/markdown';
import { copyText, downloadMarkdownFile, readLocalNotepad } from '../lib/storage';
import type { StoredNotepad } from '../lib/types';
import '../styles/global.css';

const SAMPLE_NOTEPAD: StoredNotepad = {
  meetingTitle: 'Sample call — launch checklist',
  capturedAt: '2026-11-06T18:00:00.000Z',
  plainText: 'Q&A\nWhat did we decide about the launch?\nFriday. Alex owns the checklist.',
  markdown: [
    '# Sample call — launch checklist',
    '',
    `> ${PRODUCT_DISCLAIMER}`,
    '',
    '_Captured: 2026-11-06T18:00:00.000Z_',
    '',
    '## Q&A',
    '',
    '**You:** What did we decide about the launch?',
    '',
    '**Gemini:** Friday. Alex owns the checklist.',
    '',
    '---',
    '',
    `Filing meeting notes in Drive and need them in another account? Copy the folder with [Drive I/O](${DRIVE_IO_URL}).`,
    '',
  ].join('\n'),
  fingerprint: 'sample',
};

function Popup() {
  const preview = new URLSearchParams(window.location.search).get('preview') === 'store';
  const [notepad, setNotepad] = useState<StoredNotepad | null>(preview ? SAMPLE_NOTEPAD : null);
  const [status, setStatus] = useState('');

  useEffect(() => {
    if (preview) return;
    let active = true;
    void readLocalNotepad().then((stored) => {
      if (active) setNotepad(stored);
    });
    const onChanged = (
      changes: { [key: string]: chrome.storage.StorageChange },
      area: string,
    ) => {
      if (area !== 'local' || !changes[LOCAL_NOTEPAD_KEY]) return;
      const next = changes[LOCAL_NOTEPAD_KEY].newValue as StoredNotepad | undefined;
      setNotepad(next && next.markdown ? next : null);
    };
    if (typeof chrome !== 'undefined' && chrome.storage?.onChanged) {
      chrome.storage.onChanged.addListener(onChanged);
    }
    return () => {
      active = false;
      if (typeof chrome !== 'undefined' && chrome.storage?.onChanged) {
        chrome.storage.onChanged.removeListener(onChanged);
      }
    };
  }, [preview]);

  async function onCopy() {
    if (!notepad) return;
    const ok = await copyText(notepad.markdown);
    setStatus(ok ? 'Copied' : 'Could not copy. Try Download .md.');
  }

  function onDownload() {
    if (!notepad) return;
    downloadMarkdownFile(notepad.markdown, markdownFilename(notepad.capturedAt));
    setStatus('Downloaded');
  }

  return (
    <div className="w-[360px] bg-white text-gray-900">
      <header className={`px-4 py-3 text-gray-900 ${APP_COLOR_GRADIENT}`}>
        <h1 className="text-lg font-bold">{APP_NAME}</h1>
        <p className="text-xs font-medium text-gray-800">Ask Gemini, kept on this computer</p>
      </header>

      <div className="space-y-3 p-4">
        <p className="text-xs leading-relaxed text-gray-600">{PRODUCT_DISCLAIMER}</p>

        {notepad ? (
          <section aria-label="Saved Ask Gemini text">
            <h2 className="text-sm font-semibold">{notepad.meetingTitle}</h2>
            <p className="mt-1 text-[11px] text-gray-500">Captured {notepad.capturedAt}</p>
            <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap rounded-lg bg-slate-50 p-2 text-xs text-gray-800">
              {notepad.plainText}
            </pre>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => void onCopy()}
                className={`inline-flex flex-1 items-center justify-center gap-1 rounded-full px-3 py-2 text-xs font-semibold text-gray-900 ${APP_COLOR_GRADIENT}`}
              >
                <Copy className="h-3.5 w-3.5" aria-hidden />
                Copy
              </button>
              <button
                type="button"
                onClick={onDownload}
                className="inline-flex flex-1 items-center justify-center gap-1 rounded-full border border-gray-300 px-3 py-2 text-xs font-semibold"
              >
                <Download className="h-3.5 w-3.5" aria-hidden />
                Download .md
              </button>
            </div>
            {status ? <p className="mt-2 text-xs text-gray-600">{status}</p> : null}
          </section>
        ) : (
          <p className="rounded-lg bg-slate-50 p-3 text-sm leading-relaxed text-gray-700">
            Open a Google Meet call and Ask Gemini. AskKeep holds a local copy of that panel so you
            can copy or download it before you leave.
          </p>
        )}

        <footer className="border-t border-gray-200 pt-3">
          <a
            href={DRIVE_IO_URL}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-start gap-2 text-xs font-medium text-violet-700 hover:underline"
          >
            <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
            <span>{DRIVE_IO_PROMO}</span>
          </a>
        </footer>
      </div>
    </div>
  );
}

const root = document.getElementById('root');
if (root) {
  createRoot(root).render(<Popup />);
}
