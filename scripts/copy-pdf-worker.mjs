// Copies pdf.js and Tesseract runtime assets into /public so they are served from our own origin
// (instead of a third-party CDN) and always match the installed pdfjs-dist version:
//  - the worker script
//  - CMaps (needed to render/extract text from CJK and other CID-keyed fonts)
//  - standard font data (needed for PDFs that use non-embedded base-14 fonts)
import { copyFileSync, cpSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pdfjsDir = path.dirname(require.resolve('pdfjs-dist/package.json'));
const publicDir = path.join(root, 'public');

mkdirSync(path.join(publicDir, 'pdfjs'), { recursive: true });
copyFileSync(path.join(pdfjsDir, 'build', 'pdf.worker.min.mjs'), path.join(publicDir, 'pdf.worker.min.mjs'));
cpSync(path.join(pdfjsDir, 'cmaps'), path.join(publicDir, 'pdfjs', 'cmaps'), { recursive: true });
cpSync(path.join(pdfjsDir, 'standard_fonts'), path.join(publicDir, 'pdfjs', 'standard_fonts'), { recursive: true });
// Tesseract OCR (Edit PDF on scanned pages): worker, LSTM-only WASM cores and the English model.
const tesseractDir = path.join(publicDir, 'tesseract');
mkdirSync(path.join(tesseractDir, 'lang'), { recursive: true });
const tesseractJs = path.dirname(require.resolve('tesseract.js/package.json'));
const tesseractCore = path.dirname(require.resolve('tesseract.js-core/package.json'));
const engData = path.dirname(require.resolve('@tesseract.js-data/eng/package.json'));
copyFileSync(path.join(tesseractJs, 'dist', 'worker.min.js'), path.join(tesseractDir, 'worker.min.js'));
for (const core of ['tesseract-core-lstm.wasm.js', 'tesseract-core-simd-lstm.wasm.js', 'tesseract-core-relaxedsimd-lstm.wasm.js']) {
    copyFileSync(path.join(tesseractCore, core), path.join(tesseractDir, core));
}
copyFileSync(path.join(engData, '4.0.0_best_int', 'eng.traineddata.gz'), path.join(tesseractDir, 'lang', 'eng.traineddata.gz'));

console.log('Copied pdf.js worker, cmaps, standard fonts and Tesseract OCR assets into public/');
