import React from 'react';
import styles from './Skeleton.module.css';

interface SkeletonProps {
    width?: string;
    height?: string;
    className?: string;
}

export default function Skeleton({ width = '100%', height = '20px', className }: SkeletonProps) {
    return (
        <div
            className={`${styles.skeleton} ${className || ''}`}
            style={{ width, height }}
        />
    );
}
