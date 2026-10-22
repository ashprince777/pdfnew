"use client";
import { useState } from 'react';
import { toolStyles } from '@/components/ToolUI';

/** Opens the visitor's email app with the message filled in (no server or third party involved). */
export default function ContactForm({ supportEmail }: { supportEmail: string }) {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [topic, setTopic] = useState('General question');
    const [message, setMessage] = useState('');

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        const subject = `[${topic}] Message from ${name || email}`;
        const body = `${message}\n\n--\n${name}\n${email}`;
        window.location.href = `mailto:${supportEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    };

    return (
        <form onSubmit={submit} style={{ display: 'grid', gap: 14 }}>
            <div className={toolStyles.field}>
                <label className={toolStyles.label} htmlFor="contact-name">Name</label>
                <input id="contact-name" className={toolStyles.input} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
            </div>
            <div className={toolStyles.field}>
                <label className={toolStyles.label} htmlFor="contact-email">Your email</label>
                <input id="contact-email" type="email" required className={toolStyles.input} value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
            </div>
            <div className={toolStyles.field}>
                <label className={toolStyles.label} htmlFor="contact-topic">Topic</label>
                <select id="contact-topic" className={toolStyles.input} value={topic} onChange={(e) => setTopic(e.target.value)}>
                    <option>General question</option>
                    <option>Billing or refund</option>
                    <option>Bug report</option>
                    <option>Feature request</option>
                </select>
            </div>
            <div className={toolStyles.field}>
                <label className={toolStyles.label} htmlFor="contact-message">Message</label>
                <textarea id="contact-message" required rows={6} className={toolStyles.input} value={message} onChange={(e) => setMessage(e.target.value)} />
            </div>
            <button type="submit" className="btn btn-primary">Send message</button>
            <p className={toolStyles.hint} style={{ textAlign: 'center' }}>This opens your email app with your message ready to send.</p>
        </form>
    );
}
