import React from 'react';
import Accordion from './Accordion';

interface ToolSeoContentProps {
    toolName: string;
    actionName: string; // e.g., "Merge", "Split"
    actionDescription: string; // e.g., "combine multiple PDFs", "extract pages"
    benefits: string[];
    faqItems: { question: string; answer: string }[];
}

export default function ToolSeoContent({
    toolName,
    actionName,
    actionDescription,
    benefits,
    faqItems
}: ToolSeoContentProps) {
    return (
        <div className="prose max-w-4xl mx-auto py-12 px-4 md:px-0">
            <h2 className="text-3xl font-bold mb-6">The Best Free Online {toolName} Tool</h2>
            <p className="text-lg text-gray-700 mb-6">
                Need to {actionDescription}? MyOnlinePDF best-in-class {toolName} tool allows you to {actionDescription.toLowerCase()} quickly, safely, and for free.
                Whether for business, school, or personal use, our platform handles your documents with precision.
            </p>

            <h2 className="text-2xl font-semibold mb-4 text-gray-800">Why Use MyOnlinePDF?</h2>
            <div className="grid md:grid-cols-2 gap-6 mb-10">
                <div className="bg-gray-50 p-6 rounded-lg">
                    <h3 className="text-xl font-bold mb-2">Secure & Private</h3>
                    <p>We process your files <strong>locally in your browser</strong> (for supported tools). Your data never leaves your device, ensuring maximum privacy.</p>
                </div>
                <div className="bg-gray-50 p-6 rounded-lg">
                    <h3 className="text-xl font-bold mb-2">Fast & Easy</h3>
                    <p>With an intuitive interface and powerful processing engine, you can {actionDescription.toLowerCase()} in seconds.</p>
                </div>
                <div className="bg-gray-50 p-6 rounded-lg">
                    <h3 className="text-xl font-bold mb-2">No Installation</h3>
                    <p>Works in the cloud (or browser). No software to download, no app to install. Compatible with Windows, Mac, Linux, and Mobile.</p>
                </div>
                <div className="bg-gray-50 p-6 rounded-lg">
                    <h3 className="text-xl font-bold mb-2">Completely Free</h3>
                    <p>Enjoy full access to our {toolName} tool without hidden fees, watermarks, or sign-up requirements.</p>
                </div>
            </div>

            <h2 className="text-2xl font-semibold mb-4 text-gray-800">When to {actionName} PDFs</h2>
            <ul className="list-disc pl-6 mb-8 text-gray-700 space-y-2">
                {benefits.map((benefit, index) => (
                    <li key={index}>{benefit}</li>
                ))}
            </ul>

            <h2 className="text-2xl font-semibold mb-6 text-gray-800">Frequently Asked Questions</h2>
            <h2 className="text-2xl font-semibold mb-6 text-gray-800">Frequently Asked Questions</h2>
            <Accordion items={faqItems} />
        </div>
    );
}
