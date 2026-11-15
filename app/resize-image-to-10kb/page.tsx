import ImageSizeLanding, { imageSizeMetadata } from '@/components/ImageSizeLanding';

export const generateMetadata = () => imageSizeMetadata(10);

export default function Page() {
    return <ImageSizeLanding kb={10} />;
}
