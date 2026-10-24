import CompressSizeLanding, { compressSizeMetadata } from '@/components/CompressSizeLanding';

export const metadata = compressSizeMetadata(1024);

export default function Page() {
    return <CompressSizeLanding kb={1024} />;
}
