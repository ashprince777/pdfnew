/** Popular size limits for online forms; each has its own landing page (app/compress-pdf-to-*). */
export const SIZE_PRESETS_KB = [20, 50, 100, 150, 200, 300, 400, 500, 1024, 2048];
export const sizeLabel = (kb: number) => (kb >= 1024 ? `${kb / 1024} MB` : `${kb} KB`);
export const sizeSlug = (kb: number) => (kb >= 1024 ? `${kb / 1024}mb` : `${kb}kb`);

/** Photo and signature limits on online forms; each has a landing page (app/resize-image-to-*). */
export const IMAGE_SIZE_PRESETS_KB = [10, 20, 50, 100, 200, 500];
/** Size limits with their own JPG to PDF landing page (app/jpg-to-pdf-under-*). */
export const JPG_PDF_SIZE_PRESETS_KB = [100, 200, 300, 500];
