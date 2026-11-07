import { describe, expect, it } from 'vitest';
import { fingerprintText, hasUnsavedContent } from '../src/lib/unsaved';

describe('hasUnsavedContent', () => {
  it('treats empty and chrome-only labels as saved', () => {
    expect(hasUnsavedContent('', null)).toBe(false);
    expect(hasUnsavedContent('   \n\t', null)).toBe(false);
    expect(hasUnsavedContent('Ask Gemini', null)).toBe(false);
  });

  it('treats real panel text as unsaved until it is copied or downloaded', () => {
    expect(hasUnsavedContent('Ship Friday', null)).toBe(true);
    expect(hasUnsavedContent('Ship Friday', undefined)).toBe(true);
    expect(hasUnsavedContent('Ship Friday', '')).toBe(true);
  });

  it('treats matching fingerprints as already copied or downloaded', () => {
    const fingerprint = fingerprintText('Ship Friday');
    expect(hasUnsavedContent('Ship Friday', fingerprint)).toBe(false);
    expect(hasUnsavedContent('  Ship   Friday \n', fingerprint)).toBe(false);
  });

  it('treats edited text as unsaved again', () => {
    const fingerprint = fingerprintText('Ship Friday');
    expect(hasUnsavedContent('Ship Monday', fingerprint)).toBe(true);
  });

  it('keeps the fingerprint stable for the same text', () => {
    expect(fingerprintText('Action items\nAlex sends the checklist')).toBe(
      fingerprintText('Action items Alex sends the checklist'),
    );
    expect(fingerprintText('one')).not.toBe(fingerprintText('two'));
  });
});
