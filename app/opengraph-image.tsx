import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { ImageResponse } from 'next/og';

export const alt = 'PDFAdore: free, private PDF tools in your browser';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function OpengraphImage() {
    const logo = await readFile(path.join(process.cwd(), 'public', 'brand', 'pdfadore-logo.png'));
    const logoSrc = `data:image/png;base64,${logo.toString('base64')}`;
    return new ImageResponse(
        (
            <div
                style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    padding: '72px 80px',
                    background: 'linear-gradient(135deg, #f5f3ff 0%, #ffffff 55%, #ffe4e6 100%)',
                    color: '#1e1b2e',
                    fontFamily: 'sans-serif',
                }}
            >
                {/* eslint-disable-next-line @next/next/no-img-element -- rendered by next/og, not the browser */}
                <img src={logoSrc} width={600} height={205} alt="" />
                <div style={{ fontSize: 46, fontWeight: 700, marginTop: 44, lineHeight: 1.2 }}>
                    Merge, split, compress, convert, sign &amp; protect PDFs.
                </div>
                <div style={{ display: 'flex', fontSize: 32, marginTop: 28, color: '#6b6880' }}>
                    Free online PDF tools. Your files never leave your device.
                </div>
                <div style={{ display: 'flex', marginTop: 40, height: 10, width: 260, borderRadius: 999, background: 'linear-gradient(90deg, #6d28d9, #f43f5e)' }} />
            </div>
        ),
        size
    );
}
