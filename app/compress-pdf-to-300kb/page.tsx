import CompressSizeLanding, { compressSizeMetadata } from '@/components/CompressSizeLanding';

export const metadata = compressSizeMetadata(300);

export default function Page() {
    return <CompressSizeLanding kb={300} />;
}
