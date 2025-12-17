
import { NextResponse } from 'next/server';
import { PDFDocument } from 'pdf-lib';

export async function GET() {
    try {
        const doc = await PDFDocument.create();
        const keys = Object.keys(doc);
        const protoKeys = Object.keys(Object.getPrototypeOf(doc));
        const hasEncrypt = typeof (doc as any).encrypt === 'function';

        return NextResponse.json({
            status: 'ok',
            keys,
            protoKeys,
            hasEncrypt,
            version: 'pdf-lib check'
        });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
