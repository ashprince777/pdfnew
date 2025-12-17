
import { PDFDocument } from 'pdf-lib';

async function test() {
    const doc = await PDFDocument.create();
    console.log('ESM Import: Has encrypt?', typeof doc.encrypt);

    // Check keys
    // console.log(Object.keys(doc));
}

test().catch(console.error);
