import CompressSizeLanding, { compressSizeMetadata } from '@/components/CompressSizeLanding';

export const generateMetadata = () => compressSizeMetadata(1024);

export default function Page() {
    return <CompressSizeLanding kb={1024} />;
}
