import CompressSizeLanding, { compressSizeMetadata } from '@/components/CompressSizeLanding';

export const generateMetadata = () => compressSizeMetadata(150);

export default function Page() {
    return <CompressSizeLanding kb={150} />;
}
