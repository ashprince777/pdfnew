import JpgPdfSizeLanding, { jpgPdfSizeMetadata } from '@/components/JpgPdfSizeLanding';

export const generateMetadata = () => jpgPdfSizeMetadata(300);

export default function Page() {
    return <JpgPdfSizeLanding kb={300} />;
}
