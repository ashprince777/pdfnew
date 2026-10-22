import type { Metadata } from 'next';
import { Suspense } from 'react';
import { ForgotPasswordForm } from '@/components/auth/AuthForms';

export const metadata: Metadata = {
    title: 'Forgot password',
    description: 'Reset your MyOnlinePDF password.',
    robots: { index: false },
};

export default function Page() {
    return (
        <Suspense>
            <ForgotPasswordForm />
        </Suspense>
    );
}
