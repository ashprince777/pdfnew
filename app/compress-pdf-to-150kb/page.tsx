import CompressSizeLanding, { compressSizeMetadata } from '@/components/CompressSizeLanding';

export const metadata = compressSizeMetadata(150);

export default function Page() {
    return <CompressSizeLanding kb={150} />;
}
