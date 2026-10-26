import styles from './Admin.module.css';

/** One number on the admin dashboards, with a label and an optional note below it. */
export default function Tile({ label, value, note }: { label: string; value: string | number; note?: string }) {
    return (
        <div className={styles.tile}>
            <p className={styles.tileLabel}>{label}</p>
            <p className={styles.tileValue}>{value}</p>
            {note && <p className={styles.tileNote}>{note}</p>}
        </div>
    );
}
