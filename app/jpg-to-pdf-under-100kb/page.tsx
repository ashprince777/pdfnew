import JpgPdfSizeLanding, { jpgPdfSizeMetadata } from '@/components/JpgPdfSizeLanding';

export const generateMetadata = () => jpgPdfSizeMetadata(100);

export default function Page() {
    return <JpgPdfSizeLanding kb={100} />;
}
