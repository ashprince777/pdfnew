import Link from 'next/link';
import CompressImageClient from '@/app/compress-image/CompressImageClient';
import BreadcrumbSchema from '@/components/BreadcrumbSchema';
import FaqSchema from '@/components/FaqSchema';
import JsonLd from '@/components/JsonLd';
import type { ExamSpec } from '@/lib/examPhotos';
import { toolSchema } from '@/lib/seo';

interface ExamPhotoLandingProps {
    exam: ExamSpec;
    heading: string;
    intro: string;
    /** Official requirements as [item, rule] rows. */
    rules: [string, string][];
    steps: string[];
    notes?: string[];
    faqItems: { question: string; answer: string }[];
}

/** An exam page: the image tool preset to that form's official rules, the rules themselves and their source. */
export default function ExamPhotoLanding({ exam, heading, intro, rules, steps, notes = [], faqItems }: ExamPhotoLandingProps) {
    const link = { color: 'var(--primary)', fontWeight: 600 } as const;
    return (
        <>
            <JsonLd data={toolSchema(exam.path, { name: exam.title })} />
            <BreadcrumbSchema
                items={[
                    { name: 'Home', item: '/' },
                    { name: 'Compress Image', item: '/compress-image' },
                    { name: exam.title, item: exam.path },
                ]}
            />
            <FaqSchema items={faqItems} />

            <CompressImageClient exam={exam} />

            <div className="prose max-w-4xl mx-auto py-12 px-4 md:px-0" style={{ display: 'grid', gap: 18 }}>
                <h2 className="text-3xl font-bold">{heading}</h2>
                <p className="text-lg text-gray-700">{intro}</p>

                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr>
                                <th style={{ textAlign: 'left', padding: '8px 10px', borderBottom: '2px solid var(--border-color)' }}>Item</th>
                                <th style={{ textAlign: 'left', padding: '8px 10px', borderBottom: '2px solid var(--border-color)' }}>Official requirement</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rules.map(([item, rule]) => (
                                <tr key={item}>
                                    <td style={{ padding: '8px 10px', borderBottom: '1px solid var(--border-color)', fontWeight: 600, verticalAlign: 'top' }}>{item}</td>
                                    <td style={{ padding: '8px 10px', borderBottom: '1px solid var(--border-color)' }}>{rule}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <p className="text-gray-700" style={{ fontSize: 'var(--text-sm)' }}>
                    Source: {exam.source.label} (
                    <a href={exam.source.url} target="_blank" rel="noopener noreferrer" style={link}>
                        {exam.source.url.replace('https://', '')}
                    </a>
                    ), checked on {exam.source.checked}. Rules can change, so confirm them in your notification before you apply.
                </p>

                {notes.map((note) => (
                    <p key={note} className="text-gray-700">{note}</p>
                ))}

                <h2 className="text-2xl font-semibold text-gray-800">How to use this tool</h2>
                <ol className="list-decimal pl-6 text-gray-700" style={{ display: 'grid', gap: 6 }}>
                    {steps.map((step) => (
                        <li key={step}>{step}</li>
                    ))}
                </ol>

                <h2 className="text-2xl font-semibold text-gray-800">More tools for application forms</h2>
                <p className="text-gray-700">
                    <Link href="/compress-image" style={link}>Compress image to any size in KB</Link>
                    {' · '}
                    <Link href="/resize-image-to-20kb" style={link}>Resize image to 20 KB</Link>
                    {' · '}
                    <Link href="/jpg-to-pdf-under-100kb" style={link}>JPG to PDF under 100 KB</Link>
                    {' · '}
                    <Link href="/compress-pdf-to-200kb" style={link}>Compress PDF to 200 KB</Link>
                </p>

                <h2 className="text-2xl font-semibold text-gray-800">Frequently asked questions</h2>
                {faqItems.map((item) => (
                    <div key={item.question}>
                        <h3 className="text-lg font-semibold">{item.question}</h3>
                        <p className="text-gray-700">{item.answer}</p>
                    </div>
                ))}
            </div>
        </>
    );
}
