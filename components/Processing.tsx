import styles from './Processing.module.css';

export default function Processing({ status = 'Processing...' }: { status?: string }) {
    return (
        <div className={styles.container}>
            <div className={styles.spinner}></div>
            <p className={styles.status}>{status}</p>
            <p className={styles.subtext}>Please wait while we process your file.</p>
        </div>
    );
}
