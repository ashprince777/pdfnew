import ImageSizeLanding, { imageSizeMetadata } from '@/components/ImageSizeLanding';

export const generateMetadata = () => imageSizeMetadata(200);

export default function Page() {
    return <ImageSizeLanding kb={200} />;
}
