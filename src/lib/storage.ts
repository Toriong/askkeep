import {
  EXPORTED_FINGERPRINT_KEY,
  LOCAL_NOTEPAD_KEY,
  SESSION_NOTEPAD_KEY,
} from './constants';
import type { StoredNotepad } from './types';

function isNotepad(value: unknown): value is StoredNotepad {
  if (!value || typeof value !== 'object') return false;
  const note = value as Partial<StoredNotepad>;
  return (
    typeof note.markdown === 'string' &&
    typeof note.plainText === 'string' &&
    typeof note.meetingTitle === 'string' &&
    typeof note.capturedAt === 'string' &&
    typeof note.fingerprint === 'string'
  );
}

export async function readExportedFingerprint(): Promise<string | null> {
  try {
    const session = await chrome.storage.session.get(EXPORTED_FINGERPRINT_KEY);
    const sessionValue = session[EXPORTED_FINGERPRINT_KEY];
    if (typeof sessionValue === 'string' && sessionValue) return sessionValue;
  } catch {
    // session storage can be unavailable; the in-memory fingerprint still works
  }
  return null;
}

export async function writeExportedFingerprint(fingerprint: string): Promise<void> {
  try {
    await chrome.storage.session.set({ [EXPORTED_FINGERPRINT_KEY]: fingerprint });
  } catch {
    // fail soft
  }
}

export async function writeNotepad(notepad: StoredNotepad): Promise<void> {
  try {
    await chrome.storage.session.set({ [SESSION_NOTEPAD_KEY]: notepad });
  } catch {
    // The call can continue without a session mirror.
  }
  try {
    await chrome.storage.local.set({ [LOCAL_NOTEPAD_KEY]: notepad });
  } catch {
    // Copy and download still work from memory when storage is blocked.
  }
}

export async function readLocalNotepad(): Promise<StoredNotepad | null> {
  try {
    const local = await chrome.storage.local.get(LOCAL_NOTEPAD_KEY);
    const value = local[LOCAL_NOTEPAD_KEY];
    return isNotepad(value) ? value : null;
  } catch {
    return null;
  }
}

/** Drop the running copy after the user leaves without copying or downloading. */
export async function clearNotepad(): Promise<void> {
  try {
    await chrome.storage.session.remove([SESSION_NOTEPAD_KEY, EXPORTED_FINGERPRINT_KEY]);
  } catch {
    // fail soft
  }
  try {
    await chrome.storage.local.remove([LOCAL_NOTEPAD_KEY, EXPORTED_FINGERPRINT_KEY]);
  } catch {
    // fail soft
  }
}

export function downloadMarkdownFile(markdown: string, filename: string): void {
  const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fall through to the selection copy used when clipboard permission is denied.
  }

  try {
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', 'true');
    area.style.position = 'fixed';
    area.style.left = '-9999px';
    document.body.appendChild(area);
    area.select();
    const copied = document.execCommand('copy');
    area.remove();
    return copied;
  } catch {
    return false;
  }
}
