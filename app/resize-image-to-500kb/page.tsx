import ImageSizeLanding, { imageSizeMetadata } from '@/components/ImageSizeLanding';

export const generateMetadata = () => imageSizeMetadata(500);

export default function Page() {
    return <ImageSizeLanding kb={500} />;
}
