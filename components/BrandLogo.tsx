import { SITE } from '@/lib/site';
import styles from './BrandLogo.module.css';

/**
 * The pdfadore logo. Both the light- and dark-background artwork are rendered and CSS
 * shows the one that matches the current theme, so there is no flash when the theme loads.
 */
export default function BrandLogo({ height = 34, iconOnly = false, onDark = false }: { height?: number; iconOnly?: boolean; onDark?: boolean }) {
    if (iconOnly) {
        // eslint-disable-next-line @next/next/no-img-element -- static SVG, no optimisation needed
        return <img src="/brand/pdfadore-icon.svg" alt={SITE.name} width={height} height={height} className={styles.logo} />;
    }
    const width = Math.round((height * 1173) / 400);
    return (
        <span className={styles.wrap} style={{ height }}>
            {/* eslint-disable-next-line @next/next/no-img-element -- static SVG */}
            <img src="/brand/pdfadore-logo.svg" alt={SITE.name} width={width} height={height} className={`${styles.logo} ${onDark ? styles.hidden : styles.light}`} />
            {/* eslint-disable-next-line @next/next/no-img-element -- static SVG */}
            <img src="/brand/pdfadore-logo-dark.svg" alt="" aria-hidden="true" width={width} height={height} className={`${styles.logo} ${onDark ? '' : styles.dark}`} />
        </span>
    );
}
