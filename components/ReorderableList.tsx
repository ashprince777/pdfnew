"use client";
import React, { useState } from 'react';

export interface ReorderControls {
    index: number;
    isFirst: boolean;
    isLast: boolean;
    moveUp: () => void;
    moveDown: () => void;
    isDragging: boolean;
}

interface ReorderableListProps<T> {
    items: T[];
    getKey: (item: T) => string;
    onReorder: (items: T[]) => void;
    renderItem: (item: T, controls: ReorderControls) => React.ReactNode;
    className?: string;
    itemClassName?: string;
    /** Accessible name for the list, e.g. "Files to merge". */
    label: string;
}

export function moveItem<T>(items: T[], from: number, to: number): T[] {
    if (from === to || from < 0 || to < 0 || from >= items.length || to >= items.length) return items;
    const next = [...items];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    return next;
}

/**
 * A list that can be reordered by dragging (mouse) or with the move buttons each
 * item renders from `controls` (keyboard, touch and screen readers).
 */
export default function ReorderableList<T>({
    items,
    getKey,
    onReorder,
    renderItem,
    className,
    itemClassName,
    label,
}: ReorderableListProps<T>) {
    const [dragIndex, setDragIndex] = useState<number | null>(null);
    const [overIndex, setOverIndex] = useState<number | null>(null);

    return (
        <ol className={className} aria-label={label} style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {items.map((item, index) => (
                <li
                    key={getKey(item)}
                    className={itemClassName}
                    draggable
                    onDragStart={(e) => {
                        setDragIndex(index);
                        e.dataTransfer.effectAllowed = 'move';
                        e.dataTransfer.setData('text/plain', String(index));
                    }}
                    onDragOver={(e) => {
                        if (dragIndex === null) return;
                        e.preventDefault();
                        e.dataTransfer.dropEffect = 'move';
                        if (overIndex !== index) setOverIndex(index);
                    }}
                    onDrop={(e) => {
                        e.preventDefault();
                        if (dragIndex !== null) onReorder(moveItem(items, dragIndex, index));
                        setDragIndex(null);
                        setOverIndex(null);
                    }}
                    onDragEnd={() => {
                        setDragIndex(null);
                        setOverIndex(null);
                    }}
                    style={{
                        opacity: dragIndex === index ? 0.45 : 1,
                        outline: overIndex === index && dragIndex !== index ? '2px dashed var(--primary)' : undefined,
                        outlineOffset: 2,
                        borderRadius: 'var(--radius-sm)',
                    }}
                >
                    {renderItem(item, {
                        index,
                        isFirst: index === 0,
                        isLast: index === items.length - 1,
                        moveUp: () => onReorder(moveItem(items, index, index - 1)),
                        moveDown: () => onReorder(moveItem(items, index, index + 1)),
                        isDragging: dragIndex === index,
                    })}
                </li>
            ))}
        </ol>
    );
}
