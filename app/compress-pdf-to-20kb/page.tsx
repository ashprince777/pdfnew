import CompressSizeLanding, { compressSizeMetadata } from '@/components/CompressSizeLanding';

export const metadata = compressSizeMetadata(20);

export default function Page() {
    return <CompressSizeLanding kb={20} />;
}
