import CompressSizeLanding, { compressSizeMetadata } from '@/components/CompressSizeLanding';

export const metadata = compressSizeMetadata(400);

export default function Page() {
    return <CompressSizeLanding kb={400} />;
}
