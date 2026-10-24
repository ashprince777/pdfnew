import CompressSizeLanding, { compressSizeMetadata } from '@/components/CompressSizeLanding';

export const metadata = compressSizeMetadata(50);

export default function Page() {
    return <CompressSizeLanding kb={50} />;
}
