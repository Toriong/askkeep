# AskKeep

Free Chrome extension that keeps a local copy of the **Ask Gemini** side panel in Google Meet, so you can copy it or download a Markdown file before you leave the call.

AskKeep is a marketing app for [Drive I/O](https://driveio.io/?referrer=AskKeep). It does not sign in to Google, does not call the Meet, Drive, or Docs APIs, and does not write anything into Drive.

AskKeep is not Google’s “Take notes for me” or “Notes with Gemini.” Those products belong to Google. AskKeep only rescues the ephemeral Ask Gemini panel. It is also not [AskToDoc](https://github.com/Toriong/asktodoc), which sends Google Search AI Mode answers to Docs.

## What it does

1. On `https://meet.google.com/*`, a content script watches the Ask Gemini panel and keeps a running copy of the Q&A, action items, and talking points in `chrome.storage`.
2. A **Saved locally** chip sits on the panel, with a link to Drive I/O.
3. **Copy** and **Download .md** export that text. Nothing is uploaded.
4. If you click **Leave** or **End call** while the panel still has text you have not copied or downloaded, AskKeep asks you to confirm. That content will be lost if you leave.
5. If Meet’s DOM no longer matches the selectors in `src/lib/selectors.ts`, the chip stays hidden and Meet’s buttons are left alone.

The same Drive I/O link is in the chip, the toolbar popup, and the onboarding page that opens on install:

https://driveio.io/?referrer=AskKeep

## Permissions

| Permission | Why |
| --- | --- |
| Host access to `https://meet.google.com/*` | Content script that reads the Ask Gemini panel already on the page |
| `storage` | `chrome.storage.session` for this call, and `chrome.storage.local` for the notepad you copied or downloaded |

AskKeep does not request `identity`, OAuth, `drive`, `drive.readonly`, `drive.metadata`, Gmail, or any Meet API scope.

## Install from source

Requirements: Node.js 18+, Chrome.

```bash
npm install
npm test
npm run build
```

Load the unpacked extension:

1. Open `chrome://extensions`
2. Turn on Developer mode
3. Click **Load unpacked**
4. Choose the `dist` folder

Pin AskKeep if you want the popup handy. Join a Meet call, open Ask Gemini, and use the chip before you leave.

## Development

```bash
npm run dev          # rebuild dist on change
npm test             # unit tests
npm run type-check
npm run icons        # regenerate the brand icons
npm run store-assets # screenshots and demo videos (needs a display)
```

Stack: Manifest V3, TypeScript, React, Tailwind, Vite, Vitest. The Meet content script is bundled on its own as `dist/content-meet.js` so it does not depend on shared chunks. Popup and onboarding styles are not injected into Meet.

```
askkeep/
├── manifest.json
├── src/
│   ├── background/       # Opens onboarding on install
│   ├── content/meet.ts   # Chip, copy, download, leave confirm
│   ├── lib/              # Selectors, capture, markdown, unsaved check
│   ├── popup/
│   └── onboarding/
├── demo/fixtures/        # Mock Meet page used for store media
├── test/
├── public/icons/
└── store-assets/         # Icons, screenshots, demo videos
```

## Store media uses mock data

Screenshots in `store-assets/screenshots/` and videos in `store-assets/videos/` were recorded with Playwright against `demo/fixtures/mock-meet.html`. That page is a fake Meet call with a fake Ask Gemini panel and sample names (Alex, Priya, a launch checklist). It is not a recording of a real meeting or of anyone’s Google account.

The three videos are:

1. `1-capture-ask-gemini` — Ask Gemini text is captured into the local notepad during a call
2. `2-copy-download-md` — Copy and Download .md
3. `3-leave-unsaved-confirm` — Leave is intercepted when unsaved text remains

## When Meet changes

Google changes Meet’s markup often. Panel, Leave, and End call selectors live only in `src/lib/selectors.ts`. If a call has no chip, update those selectors and add a jsdom case in `test/selectors.test.ts`. A missing selector must keep failing soft: hide the chip, and do not block Leave or End call.

## Tests

```bash
npm test
```

Covers Markdown export, unsaved-content detection, selector helpers against a mocked Meet DOM, and a manifest check that Drive, Gmail, and Meet API scopes are absent.

## Publishing

See [DEPLOYMENT.md](DEPLOYMENT.md) for the Chrome Web Store steps.

## License

MIT. See [LICENSE](LICENSE).
