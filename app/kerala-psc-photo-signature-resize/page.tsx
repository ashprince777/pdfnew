import ExamPhotoLanding from '@/components/ExamPhotoLanding';
import { KERALA_PSC, KERALA_PSC_ML } from '@/lib/examPhotos';
import { examLanguageMetadata } from '@/lib/seoOverrides';

export const generateMetadata = () => examLanguageMetadata(KERALA_PSC.path, { en: KERALA_PSC.path, ml: KERALA_PSC_ML.path });

const rules: [string, string][] = [
    ['Photo size', '150 pixels wide and 200 pixels high, JPG format, file size not more than 30 KB.'],
    ['Name and date', 'Your name and the date the photo was taken must be clearly printed at the bottom of the photo.'],
    ['How recent', 'For a new registration: taken after you turned 18 and within the last six months. An uploaded photo stays valid for 10 years from the date it was taken.'],
    ['Appearance', 'Colour or black and white. Face and shoulders clearly visible, face in the centre, eyes open, on a white or light background.'],
    ['Not accepted', 'Photos with a cap or goggles (a cap or veil worn for religious custom is allowed), photos showing only part of the face, and unclear photos.'],
    ['Signature size', '150 pixels wide and 100 pixels high, JPG format, file size not more than 30 KB.'],
    ['Signature quality', 'Clear and complete. Applications with a blank, unclear or incomplete signature, or someone else’s signature, are rejected. Blind candidates upload a thumb impression instead.'],
];

const faqItems = [
    {
        question: 'What is the photo size for Kerala PSC One Time Registration?',
        answer: 'The photo must be 150 pixels wide and 200 pixels high, in JPG format, and not more than 30 KB, with your name and the date the photo was taken printed at the bottom.',
    },
    {
        question: 'What is the signature size for Kerala PSC?',
        answer: 'The signature must be 150 pixels wide and 100 pixels high, in JPG format, and not more than 30 KB. It must be clear and complete.',
    },
    {
        question: 'How do I add my name and date to the Kerala PSC photo?',
        answer: 'Choose Photo on this page, type your name and the date the photo was taken, and click Resize photo. The tool prints both in black on a white strip at the bottom of the photo and keeps the file at 150 × 200 pixels under 30 KB.',
    },
    {
        question: 'Is my photo uploaded to PDFAdore?',
        answer: 'No. The photo and signature are resized inside your browser, on your own phone or computer. They are never uploaded to us.',
    },
];

export default function KeralaPscPhotoPage() {
    return (
        <ExamPhotoLanding
            exam={KERALA_PSC}
            heading="Kerala PSC photo and signature size for One Time Registration"
            intro="Kerala PSC rejects profiles whose photo or signature does not match its rules, and the Thulasi portal will not accept a file that is the wrong size. These are the official requirements, and the tool above applies them for you."
            rules={rules}
            steps={[
                'Select your picture (JPG, PNG or WebP), then choose Photo or Signature.',
                'For a photo, type your name and the date the photo was taken.',
                'Click Resize. The photo is trimmed evenly to the 150 × 200 shape; a signature is fitted whole into 150 × 100.',
                'Download the JPG and upload it in your Thulasi profile.',
            ]}
            notes={['Use a photo where your face and shoulders fill most of the frame, because the name and date strip takes a little space at the bottom.']}
            faqItems={faqItems}
        />
    );
}
