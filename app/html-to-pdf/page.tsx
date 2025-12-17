import ConversionPlaceholder from '@/components/ConversionPlaceholder';

export default function HtmlToPdfPage() {
    return (
        <ConversionPlaceholder
            title="HTML to PDF"
            description="Convert webpages to PDF documents."
            accept=".html,.htm"
        />
    );
}
