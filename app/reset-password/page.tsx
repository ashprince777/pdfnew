import type { Metadata } from 'next';
import { Suspense } from 'react';
import { ResetPasswordForm } from '@/components/auth/AuthForms';

export const metadata: Metadata = {
    title: 'Choose a new password',
    description: 'Set a new password for your PDFAdore account.',
    robots: { index: false },
};

export default function Page() {
    return (
        <Suspense>
            <ResetPasswordForm />
        </Suspense>
    );
}
