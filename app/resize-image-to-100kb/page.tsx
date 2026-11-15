import ImageSizeLanding, { imageSizeMetadata } from '@/components/ImageSizeLanding';

export const generateMetadata = () => imageSizeMetadata(100);

export default function Page() {
    return <ImageSizeLanding kb={100} />;
}
