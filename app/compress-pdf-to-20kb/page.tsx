import CompressSizeLanding, { compressSizeMetadata } from '@/components/CompressSizeLanding';

export const generateMetadata = () => compressSizeMetadata(20);

export default function Page() {
    return <CompressSizeLanding kb={20} />;
}
