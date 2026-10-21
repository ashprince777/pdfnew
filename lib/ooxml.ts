import JSZip from 'jszip';

/**
 * Removes [Content_Types].xml overrides that point at parts missing from the package.
 * pptxgenjs declares one slide master per slide (slideMaster2.xml, slideMaster3.xml, ...)
 * but only writes the first; PowerPoint 2007 then reports "unreadable content".
 */
export async function removeDanglingContentTypes(zip: JSZip): Promise<void> {
    const types = await zip.file('[Content_Types].xml')?.async('text');
    if (!types) return;
    const cleaned = types.replace(/<Override\b[^>]*PartName="\/([^"]+)"[^>]*\/>/g, (override, part: string) =>
        zip.file(part) ? override : ''
    );
    if (cleaned !== types) zip.file('[Content_Types].xml', cleaned);
}
