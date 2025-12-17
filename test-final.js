
const path = require('path');

async function test() {
    try {
        const distPath = path.resolve('node_modules/pdf-lib/dist/pdf-lib.js');
        const LibDist = require(distPath);
        const doc = await LibDist.PDFDocument.create();
        console.log('Dist JS: Has encrypt?', typeof doc.encrypt);
    } catch (e) {
        console.log('Dist JS Error:', e.message);
    }
}

test();
