
const path = require('path');
const fs = require('fs');

async function testFile(filename) {
    try {
        const fullPath = path.resolve(filename);
        if (!fs.existsSync(fullPath)) return;

        console.log(`\nTesting ${filename}`);
        const Lib = require(fullPath);

        let PDFDocument = Lib.PDFDocument;
        if (!PDFDocument && Lib.default) PDFDocument = Lib.default.PDFDocument;

        if (!PDFDocument) {
            console.log('  No PDFDocument found');
            return;
        }

        const doc = await PDFDocument.create();
        console.log(`  Instance has encrypt?`, typeof doc.encrypt);
        console.log(`  Prototype has encrypt?`, typeof PDFDocument.prototype.encrypt);

        // Scan for anything looking like encrypt
        const keys = Object.keys(doc).concat(Object.keys(Object.getPrototypeOf(doc)));
        const encKeys = keys.filter(k => k.toLowerCase().includes('enc'));
        if (encKeys.length > 0) console.log('  Found potentially related keys:', encKeys);

    } catch (e) {
        console.log(`  Error: ${e.message}`);
    }
}

async function run() {
    const base = 'node_modules/pdf-lib/dist';
    await testFile(`${base}/pdf-lib.js`);
    await testFile(`${base}/pdf-lib.min.js`);
    // CJS requires for ESM might fail but worth a shot for some envs, or use dynamic import for ESM
}

run();
