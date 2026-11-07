export type NoteRole = 'user' | 'gemini' | 'item' | 'text';

export type NoteKind = 'qa' | 'action-items' | 'talking-points' | 'notes';

export interface NoteBlock {
  role: NoteRole;
  text: string;
}

export interface NoteSection {
  kind: NoteKind;
  heading: string;
  blocks: NoteBlock[];
}

export interface CapturedNote {
  meetingTitle: string;
  capturedAt: string;
  sections: NoteSection[];
  plainText: string;
}

export interface StoredNotepad {
  meetingTitle: string;
  capturedAt: string;
  plainText: string;
  markdown: string;
  fingerprint: string;
}
