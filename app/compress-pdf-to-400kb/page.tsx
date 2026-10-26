import CompressSizeLanding, { compressSizeMetadata } from '@/components/CompressSizeLanding';

export const generateMetadata = () => compressSizeMetadata(400);

export default function Page() {
    return <CompressSizeLanding kb={400} />;
}
