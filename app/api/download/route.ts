import { NextRequest, NextResponse } from 'next/server';

interface StoredFile {
    buffer: Uint8Array;
    filename: string;
    mimeType: string;
    createdAt: number;
}

// In-memory cache for temporary download streams (local node process)
const downloadStore = new Map<string, StoredFile>();

// Clean up expired files (older than 10 minutes)
function cleanExpired() {
    const now = Date.now();
    for (const [id, item] of downloadStore.entries()) {
        if (now - item.createdAt > 10 * 60 * 1000) {
            downloadStore.delete(id);
        }
    }
}

// POST /api/download: Store the file in memory and return download token
export async function POST(req: NextRequest) {
    try {
        cleanExpired();

        const formData = await req.formData();
        const file = formData.get('file') as Blob | null;
        const filename = (formData.get('filename') as string) || 'downloaded_file.pdf';
        const mimeType = (formData.get('mimeType') as string) || file?.type || 'application/pdf';

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }

        const arrayBuffer = await file.arrayBuffer();
        const buffer = new Uint8Array(arrayBuffer);
        const id = Math.random().toString(36).substring(2) + Date.now().toString(36);

        downloadStore.set(id, {
            buffer,
            filename,
            mimeType,
            createdAt: Date.now(),
        });

        return NextResponse.json({
            id,
            filename,
            downloadUrl: `/api/download?id=${id}&filename=${encodeURIComponent(filename)}`
        });
    } catch (error) {
        console.error('Error storing download:', error);
        return NextResponse.json({ error: 'Failed to prepare download' }, { status: 500 });
    }
}

// GET /api/download?id=...&filename=...: Serve file with strict Content-Disposition headers
export async function GET(req: NextRequest) {
    try {
        cleanExpired();

        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');
        const filenameParam = searchParams.get('filename');

        if (!id || !downloadStore.has(id)) {
            return new NextResponse('File not found or expired. Please process the file again.', { status: 404 });
        }

        const item = downloadStore.get(id)!;
        const filename = filenameParam || item.filename;

        // Clean ASCII filename fallback + RFC 5987 UTF-8 encoding
        const safeAsciiFilename = filename.replace(/[^\w\.\-\s]/g, '_');
        const utf8Filename = encodeURIComponent(filename).replace(/['()]/g, escape).replace(/\*/g, '%2A');

        return new NextResponse(Buffer.from(item.buffer), {
            status: 200,
            headers: {
                'Content-Type': item.mimeType || 'application/octet-stream',
                'Content-Disposition': `attachment; filename="${safeAsciiFilename}"; filename*=UTF-8''${utf8Filename}`,
                'Content-Length': item.buffer.length.toString(),
                'Cache-Control': 'no-cache, no-store, must-revalidate',
            },
        });
    } catch (error) {
        console.error('Error serving download:', error);
        return new NextResponse('Internal server error', { status: 500 });
    }
}
