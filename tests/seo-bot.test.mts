// Unit tests for the SEO bot's rules. Run: npm run test:seo-bot
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { checkPage, expectedCtr, keywordCovered, needsRewrite, validateDraft } from '../lib/seoBot/rules.ts';

const current = { title: 'Merge PDF Online Free - Combine PDFs | PDFAdore', description: 'Combine PDF files into one document for free.' };
const good = {
    title: 'Merge PDF Files Online Free in Seconds | PDFAdore',
    description: 'Combine PDF files into one document in seconds. Drag to set the order, works on your phone, and your files never leave your device. No sign-up.',
    reason: 'x',
};

test('expected click rate falls with position', () => {
    assert.equal(expectedCtr(1), 0.28);
    assert.equal(expectedCtr(3.4), 0.11);
    assert.equal(expectedCtr(15), 0.01);
    assert.ok(expectedCtr(1) > expectedCtr(5) && expectedCtr(5) > expectedCtr(12));
});

test('rewrite only pages with enough data, on page 1-2, and a low click rate', () => {
    assert.equal(needsRewrite({ impressions: 500, clicks: 2, ctr: 0.004, position: 6 }), true);
    assert.equal(needsRewrite({ impressions: 50, clicks: 0, ctr: 0, position: 6 }), false, 'too few impressions');
    assert.equal(needsRewrite({ impressions: 500, clicks: 0, ctr: 0, position: 35 }), false, 'beyond page 2');
    assert.equal(needsRewrite({ impressions: 500, clicks: 40, ctr: 0.08, position: 6 }), false, 'click rate is fine');
});

test('valid draft passes', () => {
    assert.equal(validateDraft(good, current), null);
});

test('drafts that are too long, spammy, unbranded or unchanged are rejected', () => {
    assert.match(validateDraft({ ...good, title: 'Merge PDF' }, current)!, /title is 9/);
    assert.match(validateDraft({ ...good, description: 'x'.repeat(200) }, current)!, /description is 200/);
    assert.match(validateDraft({ ...good, title: 'Merge PDF Files Online Free in Seconds Today' }, current)!, /brand/);
    assert.match(validateDraft({ ...good, title: 'Best PDF Merger Online Free in Seconds | PDFAdore' }, current)!, /claim/);
    assert.match(validateDraft({ ...good, title: '#1 PDF Merger Online Free in Seconds | PDFAdore' }, current)!, /claim/);
    assert.match(validateDraft({ ...good, title: 'MERGE PDF Files Online FREE Now | PDFAdore' }, current)!, /CAPS/);
    assert.match(validateDraft({ ...good, title: 'Merge PDF Files Online Free 🚀 Fast | PDFAdore' }, current)!, /emoji/);
    assert.match(validateDraft({ ...good, description: good.description.replace('Drag', '<b>Drag</b>') }, current)!, /markup/);
    const same = { title: good.title, description: good.description };
    assert.equal(validateDraft({ ...same, reason: '' }, same), 'no change');
});

test('blog titles without the brand may stay without it', () => {
    const blog = { title: 'Aadhaar, PAN & ITR PDF Password Format (2026 Guide)', description: 'x' };
    assert.equal(validateDraft({ ...good, title: 'Aadhaar PDF Password Format and How to Open It' }, blog), null);
});

test('page check finds missing tags, bad canonical, extra H1 and broken JSON-LD', () => {
    const url = 'https://www.pdfadore.com/merge-pdf';
    const okHtml = `<title>${current.title}</title><meta name="description" content="${'d'.repeat(120)}"/><link rel="canonical" href="${url}"/><h1>Merge</h1><script type="application/ld+json">{"a":1}</script>`;
    assert.deepEqual(checkPage(url, 200, okHtml), []);
    const bad = `<title>Short</title><link rel="canonical" href="https://www.pdfadore.com/other"/><h1>a</h1><h1 class="x">b</h1><meta name="robots" content="noindex"/><script type="application/ld+json">{bad</script>`;
    const messages = checkPage(url, 200, bad).map((i) => i.message).join(' | ');
    for (const expected of ['Title is only 5', 'Missing meta description', 'Canonical points elsewhere', '2 H1 headings', 'noindex', 'Invalid JSON-LD']) {
        assert.ok(messages.includes(expected), `missing "${expected}" in ${messages}`);
    }
    assert.equal(checkPage(url, 404, '')[0].message, 'Returns HTTP 404');
});

test('keyword coverage matches all meaningful words, ignoring filler and size spacing', () => {
    const titles = ['Compress PDF to 300 KB Online Free | PDFAdore', 'PDF to Word Converter Free | PDFAdore'];
    assert.equal(keywordCovered('compress pdf to 300kb', titles), true);
    assert.equal(keywordCovered('compress pdf online free', titles), true);
    assert.equal(keywordCovered('pdf to word converter', titles), true);
    assert.equal(keywordCovered('compress pdf to 100kb', titles), false);
    assert.equal(keywordCovered('pdf to excel', titles), false);
});
