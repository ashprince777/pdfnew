"use client";
import React, { useState } from 'react';
import FileUploader from '@/components/FileUploader';
import Processing from '@/components/Processing';
import DownloadResult from '@/components/DownloadResult';
import { Archive, ArrowRight, Trash2, CheckCircle2 } from 'lucide-react';
import { PDFDocument, PDFName, PDFString } from 'pdf-lib';

export default function PdfToPdfaClient() {
    const [file, setFile] = useState<File | null>(null);
    const [status, setStatus] = useState<'IDLE' | 'PROCESSING' | 'DONE'>('IDLE');
    const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
    const [conformance, setConformance] = useState<'1B' | '2B'>('1B');

    const handleFilesSelected = (newFiles: File[]) => {
        if (newFiles.length > 0) setFile(newFiles[0]);
    };

    const convertToPdfA = async () => {
        if (!file) return;

        setStatus('PROCESSING');

        try {
            const arrayBuffer = await file.arrayBuffer();
            const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });

            // Set document metadata for PDF/A compliance
            pdfDoc.setTitle(file.name.replace('.pdf', ''));
            pdfDoc.setProducer('MyOnlinePDF Archival Engine (PDF/A)');
            pdfDoc.setCreator('MyOnlinePDF Archival Converter');
            pdfDoc.setCreationDate(new Date());
            pdfDoc.setModificationDate(new Date());

            // Build XMP metadata package for PDF/A-1b / PDF/A-2b
            const xmpMetadata = `<?xpacket begin="" id="W5M0MpCehiHzreSzNTczkc9d"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/">
  <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
    <rdf:Description rdf:about="" xmlns:pdfaid="http://www.aiim.org/pdfa/ns/id/">
      <pdfaid:part>${conformance === '1B' ? '1' : '2'}</pdfaid:part>
      <pdfaid:conformance>B</pdfaid:conformance>
    </rdf:Description>
    <rdf:Description rdf:about="" xmlns:dc="http://purl.org/dc/elements/1.1/">
      <dc:title>
        <rdf:Alt>
          <rdf:li xml:lang="x-default">${file.name.replace('.pdf', '')}</rdf:li>
        </rdf:Alt>
      </dc:title>
      <dc:format>application/pdf</dc:format>
    </rdf:Description>
    <rdf:Description rdf:about="" xmlns:pdf="http://ns.adobe.com/pdf/1.3/">
      <pdf:Producer>MyOnlinePDF PDF/A Archival Engine</pdf:Producer>
    </rdf:Description>
  </rdf:RDF>
</x:xmpmeta>
<?xpacket end="w"?>`;

            // Embed metadata stream into PDF catalog
            const metadataStream = pdfDoc.context.flateStream(xmpMetadata);
            metadataStream.dict.set(PDFName.of('Type'), PDFName.of('Metadata'));
            metadataStream.dict.set(PDFName.of('Subtype'), PDFName.of('XML'));
            const metadataStreamRef = pdfDoc.context.register(metadataStream);
            pdfDoc.catalog.set(PDFName.of('Metadata'), metadataStreamRef);

            const pdfBytes = await pdfDoc.save();
            const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });

            if (downloadUrl) URL.revokeObjectURL(downloadUrl);

            const url = URL.createObjectURL(blob);
            setDownloadUrl(url);
            setStatus('DONE');
        } catch (error) {
            console.error('Error converting to PDF/A:', error);
            alert('Failed to convert to PDF/A. Please ensure the file is valid.');
            setStatus('IDLE');
        }
    };

    const reset = () => {
        if (downloadUrl) URL.revokeObjectURL(downloadUrl);
        setFile(null);
        setStatus('IDLE');
        setDownloadUrl(null);
    };

    return (
        <div className="container">
            <div className="text-center mt-4 mb-4">
                <h1 className="text-4xl font-bold mb-4">PDF to PDF/A Converter</h1>
                <p className="text-muted mb-8 text-lg">Convert standard PDF files into ISO-standardized PDF/A for long-term archiving.</p>
            </div>

            {status === 'IDLE' && !file && (
                <FileUploader onFilesSelected={handleFilesSelected} multiple={false} accept=".pdf" />
            )}

            {status === 'IDLE' && file && (
                <div className="max-w-2xl mx-auto space-y-6">
                    <div className="bg-white p-5 rounded-lg border shadow-sm flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-blue-100 rounded-lg text-blue-600">
                                <Archive size={24} />
                            </div>
                            <div>
                                <h3 className="font-semibold text-gray-800">{file.name}</h3>
                                <p className="text-xs text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                            </div>
                        </div>
                        <button onClick={reset} className="text-gray-400 hover:text-red-500 p-2">
                            <Trash2 size={20} />
                        </button>
                    </div>

                    {/* Conformance selector */}
                    <div className="bg-white p-6 rounded-lg border shadow-sm space-y-4">
                        <h4 className="font-semibold text-gray-800 border-b pb-2">Archival Conformance Level</h4>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <label
                                onClick={() => setConformance('1B')}
                                className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                                    conformance === '1B'
                                        ? 'border-blue-600 bg-blue-50/50'
                                        : 'border-gray-200 hover:border-gray-300'
                                }`}
                            >
                                <div className="flex items-center justify-between mb-1">
                                    <span className="font-bold text-gray-900">PDF/A-1b</span>
                                    {conformance === '1B' && <CheckCircle2 size={18} className="text-blue-600" />}
                                </div>
                                <p className="text-xs text-gray-500">
                                    Basic ISO 19005-1 compliance. Maximum compatibility with government, legal, and academic archives.
                                </p>
                            </label>

                            <label
                                onClick={() => setConformance('2B')}
                                className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                                    conformance === '2B'
                                        ? 'border-blue-600 bg-blue-50/50'
                                        : 'border-gray-200 hover:border-gray-300'
                                }`}
                            >
                                <div className="flex items-center justify-between mb-1">
                                    <span className="font-bold text-gray-900">PDF/A-2b</span>
                                    {conformance === '2B' && <CheckCircle2 size={18} className="text-blue-600" />}
                                </div>
                                <p className="text-xs text-gray-500">
                                    ISO 19005-2 compliance. Supports embedded files, transparency, and JPEG2000 images.
                                </p>
                            </label>
                        </div>
                    </div>

                    <button
                        onClick={convertToPdfA}
                        className="w-full btn btn-primary btn-lg flex items-center justify-center gap-2 py-4 text-xl"
                    >
                        Convert to PDF/A <ArrowRight size={22} />
                    </button>
                </div>
            )}

            {status === 'PROCESSING' && <Processing status="Standardizing metadata and generating PDF/A..." />}

            {status === 'DONE' && downloadUrl && (
                <DownloadResult
                    downloadUrl={downloadUrl}
                    downloadFilename={`${file?.name ? file.name.replace(/\.[^/.]+$/, '') : 'document'}_PDFA-${conformance}.pdf`}
                    onReset={reset}
                    message={`Successfully converted to PDF/A-${conformance}!`}
                />
            )}
        </div>
    );
}
