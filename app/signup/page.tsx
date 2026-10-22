import type { Metadata } from 'next';
import { Suspense } from 'react';
import { SignupForm } from '@/components/auth/AuthForms';

export const metadata: Metadata = {
    title: 'Sign up',
    description: 'Create a free MyOnlinePDF account. Upgrade to Premium for bigger files, more files per task, OCR and more.',
    robots: { index: false },
};

export default function Page() {
    return (
        <Suspense>
            <SignupForm />
        </Suspense>
    );
}
