"use client";
import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import styles from './Accordion.module.css';

interface AccordionItemProps {
    question: string;
    answer: string;
}

export function AccordionItem({ question, answer }: AccordionItemProps) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className={styles.item}>
            <button
                className={styles.trigger}
                onClick={() => setIsOpen(!isOpen)}
                aria-expanded={isOpen}
            >
                <span className={styles.question}>{question}</span>
                {isOpen ? <ChevronUp className={styles.icon} /> : <ChevronDown className={styles.icon} />}
            </button>
            <div
                className={`${styles.content} ${isOpen ? styles.open : ''}`}
                aria-hidden={!isOpen}
            >
                <div className={styles.answer}>
                    {answer}
                </div>
            </div>
        </div>
    );
}

export default function Accordion({ items }: { items: AccordionItemProps[] }) {
    return (
        <div className={styles.accordion}>
            {items.map((item, index) => (
                <AccordionItem key={index} {...item} />
            ))}
        </div>
    );
}
