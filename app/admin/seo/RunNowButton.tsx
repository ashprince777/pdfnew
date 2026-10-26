'use client';
import { useFormStatus } from 'react-dom';

/** Submit button for "Run now" that shows progress while the bot works. */
export default function RunNowButton() {
    const { pending } = useFormStatus();
    return (
        <button type="submit" className="btn btn-primary" disabled={pending} aria-live="polite">
            {pending ? 'Running… (up to 2 minutes)' : 'Run now'}
        </button>
    );
}
