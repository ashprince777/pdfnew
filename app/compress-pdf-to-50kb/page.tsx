import CompressSizeLanding, { compressSizeMetadata } from '@/components/CompressSizeLanding';

export const generateMetadata = () => compressSizeMetadata(50);

export default function Page() {
    return <CompressSizeLanding kb={50} />;
}
