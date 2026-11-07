export const APP_NAME = 'AskKeep';

export const APP_COLOR_BLUE = 'rgba(157,214,252,1)';
export const APP_COLOR_PURPLE = 'rgb(202, 160, 250)';
export const APP_COLOR_GRADIENT =
  'bg-gradient-to-r from-[rgba(209,127,247,1)] to-[rgba(157,214,252,1)]';

/** Exact promo URL used in the chip, popup, and onboarding page. */
export const DRIVE_IO_URL = 'https://driveio.io/?referrer=AskKeep';

export const DRIVE_IO_COPY_FOLDER_URL =
  'https://driveio.io/standalone-plans/copy-folder-in-google-drive-extension?referrer=AskKeep';

export const DRIVE_IO_PROMO =
  'Filing meeting notes in Drive and need them in another account? Copy the folder with Drive I/O.';

export const PRODUCT_DISCLAIMER =
  'AskKeep only keeps a local copy of the Ask Gemini side panel. It does not replace Google\'s "Take notes for me" or "Notes with Gemini," and it does not write to Drive or Docs.';

export const LOCAL_NOTEPAD_KEY = 'askkeep.notepad';
export const SESSION_NOTEPAD_KEY = 'askkeep.sessionNotepad';
export const EXPORTED_FINGERPRINT_KEY = 'askkeep.exportedFingerprint';

export const DRIVE_IO_HOME_LINKS = {
  product: DRIVE_IO_URL,
  features: 'https://driveio.io/?referrer=AskKeep#features',
  pricing: 'https://driveio.io/?referrer=AskKeep#pricing',
  contact: 'https://driveio.io/contact?referrer=AskKeep&type=support',
  privacy: 'https://driveio.io/privacy?referrer=AskKeep',
  terms: 'https://driveio.io/terms?referrer=AskKeep',
  linkedin: 'https://www.linkedin.com/company/drive-i-o',
} as const;
