import { ImageResponse } from 'next/og';

export const alt = 'MyOnlinePDF: free, private PDF tools in your browser';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpengraphImage() {
    return new ImageResponse(
        (
            <div
                style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    padding: '80px',
                    background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)',
                    color: '#f8fafc',
                    fontFamily: 'sans-serif',
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
                    <div
                        style={{
                            width: 96,
                            height: 96,
                            borderRadius: 24,
                            background: '#e11d48',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 44,
                            fontWeight: 800,
                        }}
                    >
                        PDF
                    </div>
                    <div style={{ fontSize: 64, fontWeight: 800 }}>MyOnlinePDF</div>
                </div>
                <div style={{ fontSize: 40, marginTop: 40, color: '#cbd5e1' }}>Merge, split, compress, convert, sign &amp; protect PDFs.</div>
                <div style={{ fontSize: 32, marginTop: 24, color: '#34d399' }}>100% in your browser. Files never leave your device.</div>
            </div>
        ),
        size
    );
}
