import CompressSizeLanding, { compressSizeMetadata } from '@/components/CompressSizeLanding';

export const metadata = compressSizeMetadata(500);

export default function Page() {
    return <CompressSizeLanding kb={500} />;
}
