import CompressSizeLanding, { compressSizeMetadata } from '@/components/CompressSizeLanding';

export const generateMetadata = () => compressSizeMetadata(100);

export default function Page() {
    return <CompressSizeLanding kb={100} />;
}
