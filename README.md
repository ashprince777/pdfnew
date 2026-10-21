# MyOnlinePDF

Free online PDF tools (merge, split, compress, convert, edit, sign, protect and more) that run **entirely in the browser**. Files are never uploaded: every tool reads the file locally, processes it with JavaScript/WebAssembly and hands back a `blob:` download link.

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

Other scripts: `npm run lint`, `npm run typecheck`.

Optional environment variable:

| Variable | Purpose |
| --- | --- |
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

- Very large files are limited by the device's memory because everything runs in the browser tab.
- Legacy binary `.doc`/`.ppt` files are not supported; users are asked to save them as `.docx`/`.pptx`.
- Text drawn by the tools uses Noto Sans (Latin, Greek, Cyrillic, common symbols). Scripts that need complex shaping (e.g. Devanagari, Arabic) are not shaped correctly by pdf-lib.
