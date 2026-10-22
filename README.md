# MyOnlinePDF

Free online PDF tools (merge, split, compress, convert, edit, sign, protect, redact, fill forms, scan and more) that run **entirely in the browser**. Files are never uploaded: every PDF tool reads the file locally, processes it with JavaScript/WebAssembly (heavy work runs in a Web Worker) and hands back a `blob:` download link.

The optional AI tools (Summarize, Chat with PDF, Translate) are the one exception: after the user confirms a privacy notice, the text of the chosen pages is sent to the Groq AI service (model `openai/gpt-oss-120b`) through `app/api/ai`. They need an account and use monthly credits.

## Tech stack

- [Next.js 16](https://nextjs.org) (App Router, Turbopack) + React 19 + TypeScript
- Tailwind CSS v4 + CSS Modules, with theme tokens in [app/globals.css](app/globals.css) (light/dark)
- [@cantoo/pdf-lib](https://github.com/cantoo-scribe/pdf-lib): maintained pdf-lib fork used to create and modify PDFs (adds AES encryption, decryption and PDF/A)
- [pdf.js](https://mozilla.github.io/pdf.js/) (`pdfjs-dist`) for rendering pages and extracting text
- `docx`, `docx-preview`, `pptxgenjs`, `xlsx`, `jszip`, `html2canvas` for the Office/HTML converters

## Getting started

```bash
npm install      # also copies the pdf.js worker into /public (postinstall)
npm run dev      # http://localhost:3000
npm run build && npm start
```

Other scripts: `npm run lint`, `npm run typecheck`, `npm test`.

## Tests

- `npm run test:billing`: unit tests for plans, billing, the free trial, AI request validation and rate limiting (Node's test runner).
- `npm run test:e2e`: builds the app twice and drives it in Chrome with Playwright: every tool on the free site (`tests/tools.e2e.mjs`, `tests/editor.e2e.mjs`), then accounts, billing, the trial and AI against a fake Supabase/Groq server (`tests/billing.e2e.mjs`, `tests/fake-supabase.mjs`). Uses the installed Google Chrome; set `CHROME_PATH` to use another Chromium. Add `-- --skip-build` to reuse the last builds.
- GitHub Actions runs lint, typecheck and both test suites on every push and pull request ([.github/workflows/ci.yml](.github/workflows/ci.yml)).

## Accounts and Premium subscriptions

Login (email + Google via Supabase), the pricing page, the account page and Premium subscriptions
(Razorpay) are built in and switch on once their environment variables are set. Until then the site
runs as a free tool site with no login and no limits. Setup steps: [docs/SETUP-SUBSCRIPTIONS.md](docs/SETUP-SUBSCRIPTIONS.md).
All variables: [.env.example](.env.example).

Optional environment variable:

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_RAZORPAY_KEY_ID`, ... | Accounts and Premium; see [.env.example](.env.example) |
| `GROQ_API_KEY` (+ optional `GROQ_MODEL`, `AI_MAX_TEXT_CHARS`) | AI tools. Needs the Supabase variables too. |
| `NEXT_PUBLIC_GA_ID` | Google Analytics measurement ID. When set, a cookie banner asks for consent and GA loads only after the visitor accepts. When unset, no analytics or cookie banner. |

## Project structure

```
app/
  <tool>/page.tsx          Server component: metadata, JSON-LD schema, SEO copy
  <tool>/<Tool>Client.tsx  Client component: the actual tool UI + processing
  layout.tsx               Navbar, footer, theme bootstrap, toasts, consent
  sitemap.ts, robots.ts, opengraph-image.tsx
components/
  FileUploader             Drag & drop / picker with validation (default + compact variants)
  DownloadResult           Result card with a direct blob: download link
  ToolUI                   Shared tool layout pieces (header, file card, options, notices)
  PdfPagePreview           Renders a page with an overlay (used by Sign, Edit, Crop)
  ReorderableList          Drag-and-drop + keyboard reordering (Merge, Organize, JPG to PDF)
lib/
  pdf.ts                   Load/decrypt/save helpers, Unicode fonts, page geometry, page ranges
  pdfjs.ts                 pdf.js loader (local worker), page rendering helpers
  compress.ts              Image re-compression that keeps text and vectors
  pdfOps.ts, pdf.worker.ts Merge/split/organize/protect/unlock, run in a Web Worker via pdfWorkerClient.ts
  redact.ts, pdfForms.ts, scan.ts  Redact PDF, Fill PDF forms, Scan to PDF
  ai/                      AI prompts, server helpers and browser text extraction
  handoff.ts               "Continue with this file" between tools
  rateLimit*.ts            Per-user/IP rate limits for billing, account and AI routes
  textLayout.ts            Positioned text extraction (PDF to Word/Excel, Compare)
  useToolRunner.ts         IDLE -> PROCESSING -> DONE state, object URL lifecycle, error toasts
  usePdfThumbnails.ts      Incremental page thumbnails
  tools.ts                 Tool catalogue used by navigation, home grid, command palette, sitemap
public/fonts/              Noto Sans (SIL OFL), embedded for non-Latin text
scripts/copy-pdf-worker.mjs
```

## Adding a tool

1. Add an entry to `ALL_TOOLS` in [lib/tools.ts](lib/tools.ts) (navigation, sitemap and search pick it up).
2. Create `app/<slug>/page.tsx` (metadata + SEO) and `app/<slug>/<Name>Client.tsx`.
3. In the client, use `useToolRunner()` and return `{ blob, filename }` from `tool.run(...)`; throw `PdfToolError` for messages that should be shown to the user.
4. Load PDFs with `loadPdf()` (it rejects encrypted files with a helpful message) and position drawn content with `getVisualFrame()` so rotated pages work.

## Notes and limitations

- Very large files are limited by the device's memory because everything runs in the browser tab (heavy pdf-lib work runs in a Web Worker so the page stays responsive).
- Rate limits are kept in memory per server instance, so on serverless hosting they are best-effort. Use a shared store (e.g. Upstash Redis) if abuse becomes a problem.
- Legacy binary `.doc`/`.ppt` files are not supported; users are asked to save them as `.docx`/`.pptx`.
- Text drawn by the tools uses Noto Sans (Latin, Greek, Cyrillic, common symbols). Scripts that need complex shaping (e.g. Devanagari, Arabic) are not shaped correctly by pdf-lib.
