import ImageSizeLanding, { imageSizeMetadata } from '@/components/ImageSizeLanding';

export const generateMetadata = () => imageSizeMetadata(20);

export default function Page() {
    return <ImageSizeLanding kb={20} />;
}
