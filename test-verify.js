
const { PDFDocument } = require('pdf-lib');

async function verify() {
    try {
        const doc = await PDFDocument.create();
        console.log('PDF-LIB Version:', require('pdf-lib/package.json').version);
        console.log('Has encrypt?', typeof doc.encrypt);

        if (typeof doc.encrypt === 'function') {
            console.log('SUCCESS: Encrypt method is available.');
        } else {
            console.log('FAILURE: Encrypt method is MISSING.');
        }
    } catch (e) {
        console.error('Error during verification:', e);
    }
}

verify();
