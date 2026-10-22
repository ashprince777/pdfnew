import type { Metadata } from 'next';
import { Suspense } from 'react';
import AccountClient from './AccountClient';

export const metadata: Metadata = {
    title: 'Your account',
    robots: { index: false },
};

export default function AccountPage() {
    return (
        <Suspense>
            <AccountClient />
        </Suspense>
    );
}
