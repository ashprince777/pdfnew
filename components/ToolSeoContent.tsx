import React from 'react';
import Accordion from './Accordion';
import { CURRENCY_SYMBOL, PREMIUM_PRICES_INR, TRIAL_DAYS } from '@/lib/plans';

interface ToolSeoContentProps {
    toolName: string;
    actionName: string; // e.g., "Merge", "Split"
    actionDescription: string; // e.g., "combine multiple PDFs", "extract pages"
    benefits: string[];
    faqItems: { question: string; answer: string }[];
    /** AI tools send document text to the AI model and need an account, so the privacy and pricing copy differs. */
    ai?: boolean;
    /** Tools that are part of Premium (the copy must not promise "free"). */
    premium?: boolean;
}

const fmt = (n: number) => `${CURRENCY_SYMBOL}${n.toLocaleString('en-IN')}`;

export default function ToolSeoContent({
    toolName,
    actionName,
    actionDescription,
    benefits,
    faqItems,
    ai = false,
    premium = false,
}: ToolSeoContentProps) {
    return (
        <div className="prose max-w-4xl mx-auto py-12 px-4 md:px-0">
            <h2 className="text-3xl font-bold mb-6">{premium ? `${toolName} Online, Private by Design` : `The Best Free Online ${toolName} Tool`}</h2>
            <p className="text-lg text-gray-700 mb-6">
                Need to {actionDescription}? With PDFAdore you can do it in a few clicks, right in your web browser. It works just as well for business,
                school and personal documents.
            </p>

            <h2 className="text-2xl font-semibold mb-4 text-gray-800">Why Use PDFAdore?</h2>
            <div className="grid md:grid-cols-2 gap-6 mb-10">
                <div className="bg-gray-50 p-6 rounded-lg">
                    <h3 className="text-xl font-bold mb-2">Secure & Private</h3>
                    {ai ? (
                        <p>Your PDF file <strong>stays on your device</strong>. Only the text of the pages you choose is sent to the AI model to write the answer, and we never store it.</p>
                    ) : (
                        <p>
                            Your file is processed <strong>on your own device, inside your browser</strong>. It is never uploaded to our servers, so nobody else can see it.
                        </p>
                    )}
                </div>
                <div className="bg-gray-50 p-6 rounded-lg">
                    <h3 className="text-xl font-bold mb-2">Fast & Easy</h3>
                    <p>A simple, step-by-step interface lets you {actionDescription.toLowerCase()} in seconds, with no learning curve.</p>
                </div>
                <div className="bg-gray-50 p-6 rounded-lg">
                    <h3 className="text-xl font-bold mb-2">No Installation</h3>
                    <p>Works in any modern browser on Windows, Mac, Linux, Android and iPhone. Nothing to download or install.</p>
                </div>
                <div className="bg-gray-50 p-6 rounded-lg">
                    <h3 className="text-xl font-bold mb-2">{ai ? 'Free to Try' : premium ? 'Included with Premium' : 'Completely Free'}</h3>
                    {ai ? (
                        <p>Every free account includes 3 AI credits a month. Premium includes 200 AI credits a month, plus all Premium PDF features.</p>
                    ) : premium ? (
                        <p>
                            {toolName} is part of PDFAdore Premium. New subscribers get {TRIAL_DAYS} days free, then {fmt(PREMIUM_PRICES_INR.monthly)} a month or{' '}
                            {fmt(PREMIUM_PRICES_INR.yearly)} a year. Cancel anytime.
                        </p>
                    ) : (
                        <p>Use {toolName} for free, with no watermarks and no sign-up. Premium raises the file size and batch limits.</p>
                    )}
                </div>
            </div>

            <h2 className="text-2xl font-semibold mb-4 text-gray-800">When to {actionName} PDFs</h2>
            <ul className="list-disc pl-6 mb-8 text-gray-700 space-y-2">
                {benefits.map((benefit, index) => (
                    <li key={index}>{benefit}</li>
                ))}
            </ul>

            <h2 className="text-2xl font-semibold mb-6 text-gray-800">Frequently Asked Questions</h2>
            <Accordion items={faqItems} />
        </div>
    );
}
