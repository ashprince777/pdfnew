/** Popular size limits for online forms; each has its own landing page (app/compress-pdf-to-*). */
export const SIZE_PRESETS_KB = [50, 100, 200, 500, 1024];
export const sizeLabel = (kb: number) => (kb >= 1024 ? `${kb / 1024} MB` : `${kb} KB`);
export const sizeSlug = (kb: number) => (kb >= 1024 ? `${kb / 1024}mb` : `${kb}kb`);
