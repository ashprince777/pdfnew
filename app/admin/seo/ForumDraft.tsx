'use client';
import { useState } from 'react';

/** A drafted forum answer the owner can edit before copying it to post by hand. */
export default function ForumDraft({ draft, label }: { draft: string; label: string }) {
    const [text, setText] = useState(draft);
    const [copied, setCopied] = useState(false);
    const copy = async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };
    return (
        <div style={{ display: 'grid', gap: 6 }}>
            <textarea aria-label={label} value={text} onChange={(e) => setText(e.target.value)} rows={Math.min(14, Math.max(5, Math.ceil(text.length / 90)))} style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid var(--border-color)', background: 'var(--card-bg)', color: 'var(--text-color)', font: 'inherit', fontSize: 'var(--text-sm)', lineHeight: 1.5 }} />
            <button type="button" className="btn btn-outline" onClick={copy} style={{ justifySelf: 'start', padding: '4px 12px', fontSize: 'var(--text-sm)' }}>
                {copied ? 'Copied' : 'Copy answer'}
            </button>
        </div>
    );
}
