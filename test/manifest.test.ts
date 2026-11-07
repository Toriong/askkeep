import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('extension manifest', () => {
  const manifest = JSON.parse(readFileSync(resolve(__dirname, '../manifest.json'), 'utf8')) as {
    permissions?: string[];
    host_permissions?: string[];
    oauth2?: unknown;
    content_scripts?: { matches?: string[] }[];
  };

  it('uses only Meet content-script access and extension storage', () => {
    expect(manifest.permissions).toEqual(['storage']);
    expect(manifest.host_permissions).toEqual(['https://meet.google.com/*']);
    expect(manifest.content_scripts?.[0]?.matches).toEqual(['https://meet.google.com/*']);
    expect(manifest.oauth2).toBeUndefined();
  });

  it('does not request Drive, Gmail, or Meet API scopes', () => {
    const text = JSON.stringify(manifest);
    expect(text).not.toMatch(
      /drive\.readonly|drive\.metadata|auth\/drive|"drive"|gmail\.|googleapis|identity|oauth2/i,
    );
    expect(manifest.host_permissions).not.toEqual(
      expect.arrayContaining([expect.stringMatching(/mail\.google|docs\.google|drive\.google/i)]),
    );
  });
});
