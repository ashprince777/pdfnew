// Shared configuration for the end-to-end test suites.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
/** Generated test inputs (git-ignored). */
export const FIXTURES = path.join(ROOT, 'tests', '.fixtures');
/** Files produced by the tests, screenshots of failures (git-ignored). */
export const OUTPUT = path.join(ROOT, 'tests', '.output');
fs.mkdirSync(FIXTURES, { recursive: true });
fs.mkdirSync(OUTPUT, { recursive: true });

/** Base URL of the running app under test. */
export const BASE_URL = (process.env.BASE_URL || 'http://localhost:3210').replace(/\/$/, '');

/** Loads the app's own dependencies (pdf-lib, jszip, xlsx...) for verifying outputs. */
export const appRequire = createRequire(path.join(ROOT, 'package.json'));

/**
 * Uses the installed Google Chrome (CHROME_PATH overrides), so no browser download is needed.
 * A fake camera that is always allowed lets the Scan to PDF tool be tested.
 */
export function launchBrowser() {
    const executablePath = process.env.CHROME_PATH;
    const args = ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'];
    return chromium.launch(executablePath ? { executablePath, headless: true, args } : { channel: 'chrome', headless: true, args });
}

export const pdfjs = await import(new URL('node_modules/pdfjs-dist/legacy/build/pdf.mjs', `file:///${ROOT.replace(/\\/g, '/')}/`).href);
