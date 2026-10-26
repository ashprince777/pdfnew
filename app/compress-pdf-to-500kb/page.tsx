import CompressSizeLanding, { compressSizeMetadata } from '@/components/CompressSizeLanding';

export const generateMetadata = () => compressSizeMetadata(500);

export default function Page() {
    return <CompressSizeLanding kb={500} />;
}
