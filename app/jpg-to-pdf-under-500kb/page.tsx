import JpgPdfSizeLanding, { jpgPdfSizeMetadata } from '@/components/JpgPdfSizeLanding';

export const generateMetadata = () => jpgPdfSizeMetadata(500);

export default function Page() {
    return <JpgPdfSizeLanding kb={500} />;
}
