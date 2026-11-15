/**
 * Photo and signature upload rules for recruitment forms, each taken from the official document
 * named in `source`. Re-check the source before changing a number; do not copy from other websites.
 */

export interface ExamPreset {
    id: string;
    label: string;
    maxKb: number;
    minKb?: number;
    width: number;
    height: number;
    /** 'cover' fills the frame (photos); 'contain' keeps the whole picture on white (signatures). */
    fit: 'cover' | 'contain';
    /** The form requires the candidate's name and the photo date printed at the bottom. */
    caption?: boolean;
    /** One line shown under the choice, describing what the tool will produce. */
    summary: string;
}

export interface ExamSpec {
    name: string;
    path: string;
    title: string;
    subtitle: string;
    presets: ExamPreset[];
    source: { label: string; url: string; checked: string };
}

export const KERALA_PSC: ExamSpec = {
    name: 'Kerala PSC',
    path: '/kerala-psc-photo-signature-resize',
    title: 'Kerala PSC Photo & Signature Resize',
    subtitle: 'Make your photo and signature the exact size for Kerala PSC One Time Registration (Thulasi), without uploading them anywhere.',
    presets: [
        { id: 'photo', label: 'Photo', maxKb: 30, width: 150, height: 200, fit: 'cover', caption: true, summary: '150 × 200 pixels, JPG, under 30 KB, with your name and the photo date printed at the bottom.' },
        { id: 'signature', label: 'Signature', maxKb: 30, width: 150, height: 100, fit: 'contain', summary: '150 × 100 pixels, JPG, under 30 KB.' },
    ],
    source: { label: 'Kerala PSC General Conditions, paragraph 7', url: 'https://www.keralapsc.gov.in/general-conditions', checked: '15 November 2026' },
};

export const SSC: ExamSpec = {
    name: 'SSC',
    path: '/ssc-signature-resize',
    title: 'SSC Signature Resize (10 to 20 KB)',
    subtitle: 'Make your scanned signature a 10 to 20 KB JPG in the 6 cm × 2 cm shape SSC asks for, without uploading it anywhere.',
    presets: [
        // SSC gives the size in centimetres only; 600 x 200 pixels is the same 3:1 shape as 6 cm x 2 cm.
        { id: 'signature', label: 'Signature', maxKb: 20, minKb: 10, width: 600, height: 200, fit: 'contain', summary: 'JPG between 10 and 20 KB, 600 × 200 pixels (the 3:1 shape of 6 cm × 2 cm).' },
    ],
    source: { label: 'SSC Combined Graduate Level Examination 2026 notice, paragraph 9.6', url: 'https://ssc.gov.in', checked: '15 November 2026' },
};
