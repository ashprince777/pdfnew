import JpgPdfSizeLanding, { jpgPdfSizeMetadata } from '@/components/JpgPdfSizeLanding';

export const generateMetadata = () => jpgPdfSizeMetadata(200);

export default function Page() {
    return <JpgPdfSizeLanding kb={200} />;
}
