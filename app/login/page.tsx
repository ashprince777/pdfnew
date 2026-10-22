import type { Metadata } from 'next';
import { Suspense } from 'react';
import { LoginForm } from '@/components/auth/AuthForms';

export const metadata: Metadata = {
    title: 'Log in',
    description: 'Log in to your PDFAdore account.',
    robots: { index: false },
};

export default function Page() {
    return (
        <Suspense>
            <LoginForm />
        </Suspense>
    );
}
