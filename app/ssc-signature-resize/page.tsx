import ExamPhotoLanding from '@/components/ExamPhotoLanding';
import { SSC } from '@/lib/examPhotos';
import { seoMetadata } from '@/lib/seoOverrides';

export const generateMetadata = () => seoMetadata(SSC.path);

const rules: [string, string][] = [
    ['Signature file', 'Scanned signature in JPEG/JPG format, 10 to 20 KB.'],
    ['Signature size', 'About 6.0 cm wide and 2.0 cm high. (The annexure of the same notice says about 4.0 cm × 2.0 cm, so follow what the application form shows.)'],
    ['Signature quality', 'Applications with blurred or miniature signatures are rejected.'],
    ['Photo', 'Not uploaded. The application module captures your photo live with your camera while you fill in the form, so you do not need an existing photograph.'],
    ['Live photo rules', 'Clear, full frontal view, without cap, mask or spectacles. Do not take a picture of an existing photograph: such applications are rejected.'],
];

const faqItems = [
    {
        question: 'What is the signature size for SSC forms?',
        answer: 'The SSC CGL 2026 notice asks for a scanned signature in JPEG/JPG format between 10 and 20 KB, about 6.0 cm wide and 2.0 cm high.',
    },
    {
        question: 'Do I need to upload a photo for SSC?',
        answer: 'No. In the SSC CGL 2026 notice, the application module captures your photo live through your webcam or phone camera. Only the signature is uploaded as a file.',
    },
    {
        question: 'Why does this tool make the signature 600 × 200 pixels?',
        answer: 'SSC gives the signature size in centimetres, not pixels. 600 × 200 pixels has the same 3:1 shape as 6 cm × 2 cm and stays sharp within the 10 to 20 KB limit.',
    },
    {
        question: 'Is my signature uploaded to PDFAdore?',
        answer: 'No. The signature is resized inside your browser and never leaves your phone or computer.',
    },
];

export default function SscSignaturePage() {
    return (
        <ExamPhotoLanding
            exam={SSC}
            heading="SSC signature size, and why there is no photo upload"
            intro="SSC application forms accept the signature only as a small JPG, and many are rejected for blurred or tiny signatures. These are the requirements from the official SSC CGL 2026 notice. Other SSC exams can differ, so check the notice for your exam."
            rules={rules}
            steps={[
                'Sign in black or blue ink on plain white paper and take a clear, close photo or scan of it.',
                'Select that picture above (JPG, PNG or WebP).',
                'Click Resize signature. The whole signature is fitted on white, in a 3:1 shape, between 10 and 20 KB.',
                'Download the JPG and upload it in the SSC application form.',
            ]}
            notes={['Crop away the empty paper around your signature before you select the picture, so the signature fills the frame and does not look miniature.']}
            faqItems={faqItems}
        />
    );
}
