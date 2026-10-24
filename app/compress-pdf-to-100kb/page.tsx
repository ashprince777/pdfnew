import CompressSizeLanding, { compressSizeMetadata } from '@/components/CompressSizeLanding';

export const metadata = compressSizeMetadata(100);

export default function Page() {
    return <CompressSizeLanding kb={100} />;
}
