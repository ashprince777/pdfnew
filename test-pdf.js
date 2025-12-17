

async function test() {
    try {
        console.log('Version:', require('pdf-lib/package.json').version);
    } catch (e) { console.log('Could not read version'); }

    try {
        console.log('--- DEFAULT ---');
        const LibDefault = require('pdf-lib');
        const docDefault = await LibDefault.PDFDocument.create();
        console.log('Has encrypt?', typeof docDefault.encrypt);
    } catch (e) { console.log('Default failed', e.message); }

    try {
        console.log('--- DIST JS ---');
        const LibDist = require('pdf-lib/dist/pdf-lib.js');
        const docDist = await LibDist.PDFDocument.create();
        console.log('Has encrypt?', typeof docDist.encrypt);
    } catch (e) { console.log('Dist JS failed', e.message); }

    try {
        console.log('--- CJS ---');
        // Sometimes it's in cjs/
        const LibCjs = require('pdf-lib/cjs'); // might fail if not exposed
        const docCjs = await LibCjs.PDFDocument.create();
        console.log('Has encrypt?', typeof docCjs.encrypt);
    } catch (e) { console.log('CJS failed', e.message); }
}

test();

