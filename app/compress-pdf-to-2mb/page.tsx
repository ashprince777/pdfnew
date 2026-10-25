import CompressSizeLanding, { compressSizeMetadata } from '@/components/CompressSizeLanding';

export const metadata = compressSizeMetadata(2048);

export default function Page() {
    return <CompressSizeLanding kb={2048} />;
}
