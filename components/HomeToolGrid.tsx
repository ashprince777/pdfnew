"use client";
import React, { useState } from 'react';
import ToolCard from '@/components/ToolCard';
import QuickAccessBar from '@/components/QuickAccessBar';
import { ALL_TOOLS, CATEGORIES, ToolCategory } from '@/lib/tools';
import styles from '@/app/page.module.css';

export default function HomeToolGrid() {
    const [activeCategory, setActiveCategory] = useState<ToolCategory>('all');

    const filteredTools = ALL_TOOLS.filter((tool) => {
        return activeCategory === 'all' || tool.category === activeCategory;
    });

    return (
        <section className={styles.toolsSection}>
            <div className="container">
                {/* Recently Used / Popular Tools Bar */}
                <QuickAccessBar />

                {/* Category Filter Tabs */}
                <div className={styles.filterTabs}>
                    {CATEGORIES.map((cat) => {
                        const isActive = activeCategory === cat.id;
                        return (
                            <button
                                key={cat.id}
                                onClick={() => setActiveCategory(cat.id)}
                                className={`${styles.tabButton} ${isActive ? styles.activeTab : ''}`}
                            >
                                {cat.id !== 'all' && (
                                    <span
                                        style={{
                                            width: '8px',
                                            height: '8px',
                                            borderRadius: '50%',
                                            backgroundColor: isActive ? '#ffffff' : cat.color,
                                            display: 'inline-block',
                                        }}
                                    />
                                )}
                                <span>{cat.label}</span>
                            </button>
                        );
                    })}
                </div>

                {/* Tool Cards Grid */}
                <div className={styles.grid}>
                    {filteredTools.map((tool) => (
                        <ToolCard key={tool.href} {...tool} />
                    ))}
                </div>
            </div>
        </section>
    );
}
