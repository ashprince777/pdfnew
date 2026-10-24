"use client";
import { trackEvent } from '@/lib/analytics';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowRight, Bot, Copy, Crown, Download, FileText, Send, ShieldCheck, Sparkles } from 'lucide-react';
import FileUploader from '@/components/FileUploader';
import Processing from '@/components/Processing';
import { useToast } from '@/components/ToastProvider';
import { ToolHeader, ToolWorkspace, SelectedFile, OptionsCard, ChoiceGroup, PrimaryAction, Notice, toolStyles } from '@/components/ToolUI';
import { documentText, extractPdfText, type ExtractedPdf } from '@/lib/ai/extract';
import type { AiTask, ChatTurn, SummaryLength } from '@/lib/ai/prompts';
import { baseName, getErrorMessage, parsePageRanges } from '@/lib/pdf';

const CONSENT_KEY = 'ai_consent_v1';
const RESET_MARKER = '\u001eRESET\u001e';
export const AI_LANGUAGES = [
    'English', 'Hindi', 'Bengali', 'Marathi', 'Tamil', 'Telugu', 'Gujarati', 'Kannada', 'Malayalam', 'Punjabi', 'Urdu', 'Odia',
    'Spanish', 'French', 'German', 'Portuguese', 'Italian', 'Arabic', 'Chinese (Simplified)', 'Japanese', 'Korean', 'Russian',
];

interface Credits {
    enabled: boolean;
    signedIn?: boolean;
    plan?: 'free' | 'premium';
    used?: number;
    limit?: number;
    /** Longest document text (characters) for this task in one request. */
    maxChars?: number;
}

const COPY: Record<AiTask, { title: string; subtitle: string; action: string }> = {
    summarize: { title: 'Summarize PDF with AI', subtitle: 'Get the key points, dates and action items of any PDF in seconds.', action: 'Summarize' },
    chat: { title: 'Chat with PDF', subtitle: 'Ask questions about your document and get answers with page references.', action: 'Ask' },
    translate: { title: 'Translate PDF with AI', subtitle: 'Translate the text of your PDF into Hindi, Tamil, English and 20+ other languages.', action: 'Translate' },
};

function readConsent(): boolean {
    try {
        return localStorage.getItem(CONSENT_KEY) === '1';
    } catch {
        return false;
    }
}

/** Streams POST /api/ai, calling onText with the full answer so far. */
async function runAi(payload: Record<string, unknown>, onText: (text: string) => void): Promise<{ text: string; used: number | null }> {
    const res = await fetch('/api/ai', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...payload, consent: true }) });
    if (!res.ok || !res.body) {
        const data = (await res.json().catch(() => ({}))) as { error?: string; code?: string };
        const error = new Error(data.error || 'The AI request failed. Please try again.') as Error & { code?: string };
        error.code = data.code;
        throw error;
    }
    const used = Number(res.headers.get('X-AI-Credits-Used'));
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let text = '';
    for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        text += decoder.decode(value, { stream: true });
        const reset = text.lastIndexOf(RESET_MARKER);
        if (reset >= 0) text = text.slice(reset + RESET_MARKER.length);
        onText(text);
    }
    return { text, used: Number.isFinite(used) ? used : null };
}

async function downloadDocx(text: string, filename: string) {
    const { Document, Packer, Paragraph } = await import('docx');
    const doc = new Document({ sections: [{ children: text.split('\n').map((line) => new Paragraph({ text: line })) }] });
    const url = URL.createObjectURL(await Packer.toBlob(doc));
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function AnswerBox({ text, filename, busy }: { text: string; filename: string; busy: boolean }) {
    const { showToast } = useToast();
    return (
        <OptionsCard title="Result">
            <div data-testid="ai-output" aria-live="polite" style={{ whiteSpace: 'pre-wrap', lineHeight: 1.65, maxHeight: '60vh', overflowY: 'auto' }}>
                {text || (busy ? 'Thinking...' : '')}
            </div>
            {!busy && text && (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 14 }}>
                    <button type="button" className="btn btn-outline" style={{ padding: '8px 12px', fontSize: 14 }} onClick={() => navigator.clipboard.writeText(text).then(() => showToast('Copied to clipboard.', 'success'))}>
                        <Copy size={15} aria-hidden="true" /> Copy
                    </button>
                    <button type="button" className="btn btn-outline" style={{ padding: '8px 12px', fontSize: 14 }} onClick={() => downloadDocx(text, `${filename}.docx`)}>
                        <Download size={15} aria-hidden="true" /> Word (.docx)
                    </button>
                    <a className="btn btn-outline" style={{ padding: '8px 12px', fontSize: 14 }} href={`data:text/plain;charset=utf-8,${encodeURIComponent(text)}`} download={`${filename}.txt`}>
                        <FileText size={15} aria-hidden="true" /> Text (.txt)
                    </a>
                </div>
            )}
        </OptionsCard>
    );
}

export default function AiPdfTool({ task }: { task: AiTask }) {
    const pathname = usePathname();
    const { showToast } = useToast();
    const [credits, setCredits] = useState<Credits | null>(null);
    const [consented, setConsented] = useState(false);
    const [consentChecked, setConsentChecked] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [extracted, setExtracted] = useState<ExtractedPdf | null>(null);
    const [extracting, setExtracting] = useState('');
    const [range, setRange] = useState('');
    const [language, setLanguage] = useState(task === 'translate' ? 'Hindi' : '');
    const [length, setLength] = useState<SummaryLength>('detailed');
    const [answer, setAnswer] = useState('');
    const [busy, setBusy] = useState(false);
    const [noCredits, setNoCredits] = useState('');
    const [chat, setChat] = useState<ChatTurn[]>([]);
    const [question, setQuestion] = useState('');
    const chatEnd = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setConsented(readConsent());
        fetch(`/api/ai/credits?task=${task}`, { cache: 'no-store' })
            .then((res) => res.json())
            .then((data: Credits) => setCredits(data))
            .catch(() => setCredits({ enabled: false }));
    }, [task]);

    useEffect(() => {
        chatEnd.current?.scrollIntoView({ block: 'nearest' });
    }, [chat, answer]);

    const remaining = credits?.limit !== undefined ? Math.max(0, credits.limit - (credits.used ?? 0)) : null;

    const handleFilesSelected = async (files: File[]) => {
        const selected = files[0];
        if (!selected) return;
        setFile(selected);
        setExtracted(null);
        setAnswer('');
        setChat([]);
        try {
            const result = await extractPdfText(selected, (page, total) => setExtracting(`Reading page ${page} of ${total}...`));
            setExtracted(result);
        } catch (error) {
            showToast(getErrorMessage(error, 'Could not read this PDF.'), 'error');
            setFile(null);
        } finally {
            setExtracting('');
        }
    };

    const selectedPages = (): number[] | null => {
        if (!extracted) return null;
        if (!range.trim()) return Array.from({ length: extracted.numPages }, (_, i) => i + 1);
        const { pages, invalid } = parsePageRanges(range, extracted.numPages);
        if (invalid.length || !pages.length) {
            showToast(`Invalid pages: "${invalid.join('", "') || range}". This PDF has ${extracted.numPages} pages.`, 'error');
            return null;
        }
        return Array.from(new Set(pages)).sort((a, b) => a - b);
    };

    const text = extracted ? documentText(extracted, Array.from({ length: extracted.numPages }, (_, i) => i + 1)) : '';
    const hasText = extracted ? extracted.pages.some(Boolean) : false;

    const submit = async () => {
        const pages = selectedPages();
        if (!extracted || !pages) return;
        const docText = documentText(extracted, pages);
        if (!docText) return showToast('The selected pages have no readable text.', 'error');
        const maxChars = credits?.maxChars ?? Infinity;
        if (docText.length > maxChars) {
            return showToast(
                `The selected pages are too long for one request (${docText.length.toLocaleString('en-IN')} characters, the limit is ${maxChars.toLocaleString('en-IN')}). Enter fewer pages in "Pages".`,
                'error'
            );
        }
        const ask = question.trim();
        if (task === 'chat' && !ask) return;
        setBusy(true);
        setNoCredits('');
        setAnswer('');
        const history = chat;
        if (task === 'chat') {
            setChat([...history, { role: 'user', content: ask }]);
            setQuestion('');
        }
        try {
            const { text: result, used } = await runAi({ task, text: docText, language, length, history, question: ask }, setAnswer);
            if (task === 'chat') {
                setChat([...history, { role: 'user', content: ask }, { role: 'assistant', content: result }]);
                setAnswer('');
            }
            if (used !== null) setCredits((c) => (c ? { ...c, used } : c));
            trackEvent('ai_used', { task });
        } catch (error) {
            const err = error as Error & { code?: string };
            if (err.code === 'NO_CREDITS') setNoCredits(err.message);
            else showToast(err.message, 'error');
            if (task === 'chat') {
                setChat(history);
                setQuestion(ask);
            }
        } finally {
            setBusy(false);
        }
    };

    const acceptConsent = () => {
        try {
            localStorage.setItem(CONSENT_KEY, '1');
        } catch {
            // Private mode: ask again next visit.
        }
        setConsented(true);
    };

    const copy = COPY[task];
    const header = <ToolHeader title={copy.title} subtitle={copy.subtitle} />;

    if (!credits) return <div className="container">{header}<Processing status="Loading..." /></div>;

    if (!credits.enabled) {
        return (
            <div className="container">
                {header}
                <ToolWorkspace>
                    <Notice>AI features are coming soon. In the meantime, every other PDF tool is free to use.</Notice>
                </ToolWorkspace>
            </div>
        );
    }

    if (!credits.signedIn) {
        return (
            <div className="container">
                {header}
                <ToolWorkspace>
                    <OptionsCard>
                        <div style={{ display: 'grid', gap: 14, justifyItems: 'center', textAlign: 'center' }}>
                            <Sparkles size={32} style={{ color: 'var(--primary)' }} aria-hidden="true" />
                            <p>Create a free account to use AI tools. Free accounts get 3 AI credits every month.</p>
                            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
                                <Link href={`/signup?next=${encodeURIComponent(pathname)}`} className="btn btn-primary">Sign up free</Link>
                                <Link href={`/login?next=${encodeURIComponent(pathname)}`} className="btn btn-outline">Log in</Link>
                            </div>
                        </div>
                    </OptionsCard>
                </ToolWorkspace>
            </div>
        );
    }

    if (!consented) {
        return (
            <div className="container">
                {header}
                <ToolWorkspace>
                    <OptionsCard title="Before you use AI tools">
                        <div style={{ display: 'grid', gap: 12 }} data-testid="ai-consent">
                            <p style={{ display: 'flex', gap: 10 }}>
                                <ShieldCheck size={22} style={{ color: 'var(--primary)', flexShrink: 0 }} aria-hidden="true" />
                                <span>
                                    Our other tools never upload your files. AI tools are different: to answer, the <strong>text</strong> of the pages you choose is sent to{' '}
                                    <strong>Groq</strong>, the AI service that runs the model writing the answer. The PDF file itself, its images and its metadata stay on your device.
                                </span>
                            </p>
                            <ul style={{ paddingLeft: 22, display: 'grid', gap: 6, fontSize: 'var(--text-sm)' }}>
                                <li>We do not store your document text or the AI&apos;s answers on our servers.</li>
                                <li>Groq processes the text to produce the answer, under its API terms and <a href="https://groq.com/privacy-policy" target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'underline' }}>privacy policy</a>.</li>
                                <li>Don&apos;t use AI tools for documents you are not allowed to share with a third-party service.</li>
                            </ul>
                            <p className={toolStyles.hint}>
                                Details are in our <Link href="/privacy#ai" style={{ textDecoration: 'underline' }}>privacy policy</Link>.
                            </p>
                            <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                <input type="checkbox" checked={consentChecked} onChange={(e) => setConsentChecked(e.target.checked)} />
                                I understand that the text of my document is sent to the Groq AI service.
                            </label>
                            <div>
                                <button type="button" className="btn btn-primary" disabled={!consentChecked} onClick={acceptConsent}>
                                    Continue
                                </button>
                            </div>
                        </div>
                    </OptionsCard>
                </ToolWorkspace>
            </div>
        );
    }

    return (
        <div className="container">
            {header}
            <ToolWorkspace wide={task === 'chat'}>
                <p className={toolStyles.hint} style={{ textAlign: 'center', display: 'flex', gap: 6, justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap' }} data-testid="ai-credits">
                    <Sparkles size={15} aria-hidden="true" /> {remaining} of {credits.limit} AI credits left this month
                    {credits.plan === 'free' && (
                        <Link href="/pricing" style={{ color: 'var(--primary)', fontWeight: 600, display: 'inline-flex', gap: 4, alignItems: 'center' }}>
                            <Crown size={14} /> Get 200 with Premium
                        </Link>
                    )}
                </p>

                {!file && <FileUploader onFilesSelected={handleFilesSelected} accept=".pdf" />}
                {extracting && <Processing status={extracting} />}

                {file && extracted && (
                    <>
                        <SelectedFile file={file} onRemove={() => (setFile(null), setExtracted(null), setAnswer(''), setChat([]))} icon={Bot} detail={`${extracted.numPages} page${extracted.numPages === 1 ? '' : 's'} · ${text.length.toLocaleString('en-IN')} characters of text`} />

                        {!hasText ? (
                            <Notice tone="warning">
                                This PDF has no selectable text (it is probably a scan). Use <Link href="/edit-pdf">Edit PDF</Link> with OCR to recognise the text first.
                            </Notice>
                        ) : (
                            <>
                                <OptionsCard title="Options">
                                    <div style={{ display: 'grid', gap: 14 }}>
                                        {extracted.numPages > 1 && (
                                            <div className={toolStyles.field}>
                                                <label className={toolStyles.label} htmlFor="ai-pages">Pages (leave empty for all)</label>
                                                <input id="ai-pages" className={toolStyles.input} value={range} placeholder={`e.g. 1-${Math.min(3, extracted.numPages)}`} onChange={(e) => setRange(e.target.value)} />
                                            </div>
                                        )}
                                        {task !== 'chat' && (
                                            <div className={toolStyles.field}>
                                                <label className={toolStyles.label} htmlFor="ai-language">{task === 'translate' ? 'Translate into' : 'Language of the summary'}</label>
                                                <select id="ai-language" className={toolStyles.input} value={language} onChange={(e) => setLanguage(e.target.value)}>
                                                    {task === 'summarize' && <option value="">Same as the document</option>}
                                                    {AI_LANGUAGES.map((l) => (
                                                        <option key={l} value={l}>{l}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        )}
                                        {task === 'summarize' && (
                                            <div>
                                                <p className={toolStyles.label}>Length</p>
                                                <ChoiceGroup
                                                    label="Summary length"
                                                    value={length}
                                                    onChange={setLength}
                                                    options={[
                                                        { value: 'detailed', title: 'Detailed', text: 'Overview, key points, dates' },
                                                        { value: 'short', title: 'Short', text: 'A paragraph and 5 points' },
                                                    ]}
                                                />
                                            </div>
                                        )}
                                    </div>
                                </OptionsCard>

                                {noCredits && (
                                    <div role="alert" style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderRadius: 'var(--radius-sm)', background: 'var(--primary-subtle)' }}>
                                        <span>{noCredits}</span>
                                        {credits.plan === 'free' && (
                                            <Link href="/pricing" className="btn btn-primary" style={{ padding: '8px 16px', fontSize: 14 }}>
                                                <Crown size={16} /> Upgrade
                                            </Link>
                                        )}
                                    </div>
                                )}

                                {task === 'chat' ? (
                                    <OptionsCard title="Chat">
                                        <div style={{ display: 'grid', gap: 12, maxHeight: '55vh', overflowY: 'auto' }} aria-live="polite">
                                            {chat.length === 0 && !busy && <p className={toolStyles.hint}>Ask anything about the document, for example &quot;What is the total amount?&quot; or &quot;List the deadlines&quot;. Each question uses 1 credit.</p>}
                                            {chat.map((turn, i) => (
                                                <div key={i} data-testid={`chat-${turn.role}`} style={{ justifySelf: turn.role === 'user' ? 'end' : 'start', maxWidth: '85%', whiteSpace: 'pre-wrap', padding: '10px 14px', borderRadius: 14, background: turn.role === 'user' ? 'var(--brand-gradient)' : 'var(--section-alt)', color: turn.role === 'user' ? '#fff' : 'inherit' }}>
                                                    {turn.content}
                                                </div>
                                            ))}
                                            {busy && (
                                                <div data-testid="chat-assistant" style={{ justifySelf: 'start', maxWidth: '85%', whiteSpace: 'pre-wrap', padding: '10px 14px', borderRadius: 14, background: 'var(--section-alt)' }}>
                                                    {answer || 'Thinking...'}
                                                </div>
                                            )}
                                            <div ref={chatEnd} />
                                        </div>
                                        <form
                                            style={{ display: 'flex', gap: 8, marginTop: 14 }}
                                            onSubmit={(e) => {
                                                e.preventDefault();
                                                void submit();
                                            }}
                                        >
                                            <input id="ai-question" aria-label="Your question" className={toolStyles.input} value={question} maxLength={2000} placeholder="Ask a question about the document" onChange={(e) => setQuestion(e.target.value)} disabled={busy} />
                                            <button type="submit" className="btn btn-primary" disabled={busy || !question.trim()} aria-label="Send question">
                                                <Send size={18} />
                                            </button>
                                        </form>
                                        {chat.length > 0 && !busy && (
                                            <button type="button" className="btn btn-outline" style={{ marginTop: 10, padding: '6px 12px', fontSize: 14 }} onClick={() => setChat([])}>
                                                New chat
                                            </button>
                                        )}
                                    </OptionsCard>
                                ) : (
                                    <>
                                        <PrimaryAction onClick={submit} disabled={busy}>
                                            {busy ? 'Working...' : copy.action} {!busy && <ArrowRight size={22} />}
                                        </PrimaryAction>
                                        {(busy || answer) && <AnswerBox text={answer} busy={busy} filename={`${baseName(file.name)}_${task === 'translate' ? `${language.toLowerCase().replace(/\W+/g, '-')}` : 'summary'}`} />}
                                    </>
                                )}
                            </>
                        )}
                    </>
                )}

                <p className={toolStyles.hint} style={{ textAlign: 'center' }}>
                    AI can make mistakes. Check important facts against the document.
                </p>
            </ToolWorkspace>
        </div>
    );
}
