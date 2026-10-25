/** Popular size limits for online forms; each has its own landing page (app/compress-pdf-to-*). */
export const SIZE_PRESETS_KB = [20, 50, 100, 150, 200, 300, 400, 500, 1024, 2048];
export const sizeLabel = (kb: number) => (kb >= 1024 ? `${kb / 1024} MB` : `${kb} KB`);
export const sizeSlug = (kb: number) => (kb >= 1024 ? `${kb / 1024}mb` : `${kb}kb`);
