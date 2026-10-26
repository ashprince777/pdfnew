import CompressSizeLanding, { compressSizeMetadata } from '@/components/CompressSizeLanding';

export const generateMetadata = () => compressSizeMetadata(200);

export default function Page() {
    return <CompressSizeLanding kb={200} />;
}
