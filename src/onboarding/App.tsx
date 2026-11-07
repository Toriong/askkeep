import { createRoot } from 'react-dom/client';
import { useRef, useState, type ReactNode } from 'react';
import {
  APP_COLOR_GRADIENT,
  APP_NAME,
  DRIVE_IO_COPY_FOLDER_URL,
  DRIVE_IO_HOME_LINKS,
  DRIVE_IO_PROMO,
  DRIVE_IO_URL,
  PRODUCT_DISCLAIMER,
} from '../lib/constants';
import '../styles/global.css';

const STEPS: {
  title: string;
  detail: string;
  tips: string[];
  caption: string;
  frame: ReactNode;
}[] = [
  {
    title: 'Open Ask Gemini in Meet',
    detail:
      'While the Ask Gemini side panel is open, AskKeep keeps a running local copy of the Q&A, action items, and talking points.',
    tips: [
      'Join a call on meet.google.com',
      'Open the Ask Gemini side panel',
      'Look for the Saved locally chip on the panel',
    ],
    caption: 'The chip appears only while Ask Gemini is on screen.',
    frame: <FrameChip />,
  },
  {
    title: 'Copy or download the text',
    detail:
      'Use Copy or Download .md before the call ends. The file stays on your computer. AskKeep does not send it to Drive or Docs.',
    tips: ['Click Copy for the Markdown text', 'Or click Download .md', 'Open the AskKeep popup to grab the same copy'],
    caption: 'One click copies the panel, or saves a .md file.',
    frame: <FrameActions />,
  },
  {
    title: 'Leave only after you have it',
    detail:
      'If you click Leave or End call while the panel still has text you have not copied or downloaded, AskKeep asks you to confirm. That content will be lost if you leave.',
    tips: [
      'Stay in the call if you still need the text',
      'Copy or download, then leave',
      'If the chip is missing, Meet changed its page and AskKeep steps aside',
    ],
    caption: 'Unsaved Ask Gemini text triggers a confirm dialog.',
    frame: <FrameDialog />,
  },
];

function extensionAssetUrl(path: string) {
  if (typeof chrome !== 'undefined' && chrome.runtime?.getURL) {
    return chrome.runtime.getURL(path);
  }
  return `/${path}`;
}

function FooterLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      className="text-sm leading-relaxed text-gray-400 transition-colors hover:text-white focus:outline-none focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-white/50"
    >
      {children}
    </a>
  );
}

function Onboarding() {
  const footerRef = useRef<HTMLElement>(null);
  const [arrowHidden, setArrowHidden] = useState(false);
  const logoSrc = extensionAssetUrl('icons/icon128.png');

  function scrollTowardFooter() {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    footerRef.current?.scrollIntoView({
      behavior: prefersReducedMotion ? 'auto' : 'smooth',
      block: 'start',
    });
    setArrowHidden(true);
  }

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-white text-gray-900">
      <header className="border-b border-gray-200 bg-white/90 px-4 py-4 sm:px-8">
        <div className="mx-auto flex max-w-5xl items-center gap-3">
          <img
            src={logoSrc}
            alt=""
            width={56}
            height={56}
            className="h-12 w-12 shrink-0 rounded-lg object-contain sm:h-14 sm:w-14"
          />
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Install successful</p>
            <h1 className="text-balance text-xl font-bold tracking-tight sm:text-2xl">
              Welcome to <span className={`bg-clip-text text-transparent ${APP_COLOR_GRADIENT}`}>{APP_NAME}</span>
            </h1>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 pb-8 pt-8 sm:px-8">
        <p className="mx-auto max-w-2xl text-center text-sm leading-relaxed text-gray-500">
          {PRODUCT_DISCLAIMER} This is not AskToDoc, which sends Google Search AI Mode answers to Docs.
        </p>

        <section id="how-it-works" className="mt-12 scroll-mt-6" aria-labelledby="how-it-works-heading">
          <h2 id="how-it-works-heading" className="mb-10 text-center text-2xl font-bold tracking-tight sm:mb-14 sm:text-3xl">
            <span className="text-gray-500">How to use</span>{' '}
            <span className={`bg-clip-text text-transparent ${APP_COLOR_GRADIENT}`}>{APP_NAME}</span>
          </h2>

          <ol className="m-0 list-none space-y-14 p-0 lg:space-y-20">
            {STEPS.map((step, index) => {
              const mediaFirst = index % 2 === 1;
              return (
                <li
                  key={step.title}
                  className={`flex flex-col items-stretch gap-6 lg:items-center lg:gap-14 ${
                    mediaFirst ? 'lg:flex-row-reverse lg:rounded-3xl lg:bg-slate-50/80 lg:px-8 lg:py-10' : 'lg:flex-row'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <span
                      className={`mb-4 flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white ${APP_COLOR_GRADIENT}`}
                      aria-hidden
                    >
                      {index + 1}
                    </span>
                    <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Step {index + 1}</p>
                    <h3 className="mt-1 text-balance text-xl font-bold tracking-tight sm:text-2xl">{step.title}</h3>
                    <p className="mt-3 max-w-prose text-pretty text-sm leading-relaxed text-gray-500">{step.detail}</p>
                    <ul className="mt-5 space-y-2">
                      {step.tips.map((tip) => (
                        <li key={tip} className="flex items-start gap-2 text-sm text-gray-600">
                          <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${APP_COLOR_GRADIENT}`} aria-hidden />
                          {tip}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="min-w-0 flex-1">
                    <figure className="m-0 w-full">
                      <div className="overflow-hidden rounded-2xl bg-slate-900 shadow-md ring-1 ring-gray-900/5">
                        {step.frame}
                      </div>
                      <figcaption className="mt-2 text-center text-xs leading-relaxed text-gray-500">
                        {step.caption}
                      </figcaption>
                    </figure>
                  </div>
                </li>
              );
            })}
          </ol>
        </section>

        <div className="mt-12 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <a
            href="https://meet.google.com/"
            className={`inline-flex items-center justify-center rounded-lg px-4 py-3 text-sm font-medium text-gray-900 shadow-sm ${APP_COLOR_GRADIENT}`}
          >
            Open Google Meet
          </a>
        </div>

        <div className="mx-auto mt-14 max-w-2xl">
          <h2 className="mb-4 text-center text-xl font-bold tracking-tight sm:text-4xl">
            Filing meeting notes in another Drive account?
          </h2>
          <section
            className="rounded-xl border border-purple-200 bg-purple-50/80 p-5 shadow-sm ring-1 ring-purple-900/5 sm:p-6"
            aria-labelledby="folder-copy-heading"
          >
            <h3 id="folder-copy-heading" className="text-center text-xl font-bold tracking-tight sm:text-2xl">
              Copy the folder with Drive I/O
            </h3>
            <p className="mx-auto mt-3 max-w-prose text-center text-sm leading-relaxed text-gray-600">
              {DRIVE_IO_PROMO} AskKeep only rescues the ephemeral Ask Gemini panel. Moving a Drive folder
              between accounts is what Drive I/O is for.
            </p>
            <aside
              role="note"
              aria-label="Drive I/O regional availability"
              className="mx-auto mt-5 max-w-prose rounded-lg border border-amber-200/90 bg-amber-50/80 px-4 py-3 text-left"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-900/90">Regional availability</p>
              <p className="mt-2 text-sm leading-relaxed text-gray-800">
                Drive I/O is available in the United States and Canada. Germany, France, and Pakistan have
                limited availability.
              </p>
            </aside>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <a
                href={DRIVE_IO_URL}
                target="_blank"
                rel="noreferrer noopener"
                className={`inline-flex items-center justify-center rounded-lg px-4 py-3 text-sm font-medium text-gray-900 shadow-sm ${APP_COLOR_GRADIENT}`}
              >
                Get Drive I/O
              </a>
              <a
                href={DRIVE_IO_COPY_FOLDER_URL}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-800 shadow-sm"
              >
                Learn more
              </a>
            </div>
          </section>
        </div>
      </main>

      <footer ref={footerRef} id="onboarding-footer" className="mt-16 bg-gray-900 py-10 text-gray-400 sm:mt-20 sm:py-16">
        <div className="mx-auto max-w-5xl px-4 sm:px-8">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4 md:gap-10">
            <div>
              <h3 className="mb-3 text-sm font-semibold text-white">Product</h3>
              <ul className="m-0 list-none space-y-2 p-0">
                <li><FooterLink href={DRIVE_IO_HOME_LINKS.features}>Features</FooterLink></li>
                <li><FooterLink href={DRIVE_IO_HOME_LINKS.pricing}>Pricing</FooterLink></li>
              </ul>
            </div>
            <div>
              <h3 className="mb-3 text-sm font-semibold text-white">{APP_NAME}</h3>
              <ul className="m-0 list-none space-y-2 p-0">
                <li><FooterLink href={DRIVE_IO_URL}>Drive I/O</FooterLink></li>
              </ul>
            </div>
            <div>
              <h3 className="mb-3 text-sm font-semibold text-white">Resources</h3>
              <ul className="m-0 list-none space-y-2 p-0">
                <li><FooterLink href={DRIVE_IO_HOME_LINKS.contact}>Support</FooterLink></li>
              </ul>
            </div>
            <div>
              <h3 className="mb-3 text-sm font-semibold text-white">Legal</h3>
              <ul className="m-0 list-none space-y-2 p-0">
                <li><FooterLink href={DRIVE_IO_HOME_LINKS.privacy}>Privacy</FooterLink></li>
                <li><FooterLink href={DRIVE_IO_HOME_LINKS.terms}>Terms</FooterLink></li>
              </ul>
            </div>
          </div>
          <div className="mt-8 flex flex-col items-center justify-between gap-4 border-t border-gray-800 pt-6 text-center sm:mt-12 sm:pt-8 md:flex-row md:text-left">
            <p className="m-0 text-xs leading-relaxed sm:text-sm">{APP_NAME} — a free tool by Drive I/O.</p>
            <FooterLink href={DRIVE_IO_HOME_LINKS.linkedin}>LinkedIn</FooterLink>
          </div>
        </div>
      </footer>

      <button
        type="button"
        onClick={scrollTowardFooter}
        className={`fixed bottom-6 right-6 z-20 rounded-full bg-gray-900 px-4 py-2 text-sm text-white shadow-lg transition-opacity ${
          arrowHidden ? 'pointer-events-none opacity-0' : 'opacity-100'
        }`}
      >
        Scroll for Drive I/O
      </button>
    </div>
  );
}

function FrameChip() {
  return (
    <div className="aspect-video bg-[#202124] p-4 text-left">
      <div className="ml-auto w-56 rounded-xl border border-violet-300/80 bg-white p-3 text-gray-900 shadow-lg">
        <p className="text-xs font-bold">Saved locally</p>
        <p className="text-[10px] text-gray-500">Held in this browser for this call.</p>
        <p className="mt-2 text-[10px] leading-snug text-gray-600">{DRIVE_IO_PROMO}</p>
      </div>
    </div>
  );
}

function FrameActions() {
  return (
    <div className="aspect-video bg-[#202124] p-4">
      <div className="mx-auto mt-6 flex w-64 justify-center gap-2">
        <span className={`rounded-full px-3 py-1.5 text-xs font-semibold text-gray-900 ${APP_COLOR_GRADIENT}`}>Copy</span>
        <span className={`rounded-full px-3 py-1.5 text-xs font-semibold text-gray-900 ${APP_COLOR_GRADIENT}`}>
          Download .md
        </span>
      </div>
    </div>
  );
}

function FrameDialog() {
  return (
    <div className="aspect-video bg-[#202124] p-4">
      <div className="mx-auto mt-4 max-w-xs rounded-xl bg-white p-3 text-left text-gray-900 shadow-lg">
        <p className="text-sm font-bold">Leave this call?</p>
        <p className="mt-1 text-[11px] leading-snug text-gray-600">
          Ask Gemini still has text that has not been copied or downloaded. If you leave, that content will be lost.
        </p>
      </div>
    </div>
  );
}

const root = document.getElementById('root');
if (root) {
  createRoot(root).render(<Onboarding />);
}
