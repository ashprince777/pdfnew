import { NextRequest, NextResponse } from 'next/server';
import { PDFDocument } from 'pdf-lib';

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get('file') as File;
        const password = formData.get('password') as string;

        if (!file || !password) {
            return NextResponse.json({ error: 'Missing file or password' }, { status: 400 });
        }

        const arrayBuffer = await file.arrayBuffer();
        const srcDoc = await PDFDocument.load(arrayBuffer);

        // Create a new document to ensure clean state
        const neoDoc = await PDFDocument.create();
        const indices = srcDoc.getPageIndices();
        const copiedPages = await neoDoc.copyPages(srcDoc, indices);
        copiedPages.forEach((page: any) => neoDoc.addPage(page));

        // Save the clean PDF first
        const cleanPdfBytes = await neoDoc.save();

        // Encrypt using @pdfsmaller/pdf-encrypt-lite
        // Using require to avoid missing type definition errors
        const { encryptPDF } = require('@pdfsmaller/pdf-encrypt-lite');

        const encryptedPdfBytes = await encryptPDF(cleanPdfBytes, {
            ownerPassword: password,
            userPassword: password,
        });

        return new NextResponse(encryptedPdfBytes, {
            status: 200,
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="protected_${file.name}"`,
            },
        });

    } catch (error) {
        console.error('API Error protecting PDF:', error);
        return NextResponse.json(
            { error: 'Failed to protect PDF: ' + (error instanceof Error ? error.message : String(error)) },
            { status: 500 }
        );
    }
}
