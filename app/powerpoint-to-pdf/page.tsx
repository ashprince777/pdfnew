import ConversionPlaceholder from '@/components/ConversionPlaceholder';

export default function PowerpointToPdfPage() {
    return (
        <ConversionPlaceholder
            title="PowerPoint to PDF"
            description="Make PPT and PPTX slideshows easy to view by converting them to PDF."
            accept=".ppt,.pptx"
        />
    );
}
