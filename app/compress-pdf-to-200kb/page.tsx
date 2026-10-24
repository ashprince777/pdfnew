import CompressSizeLanding, { compressSizeMetadata } from '@/components/CompressSizeLanding';

export const metadata = compressSizeMetadata(200);

export default function Page() {
    return <CompressSizeLanding kb={200} />;
}
