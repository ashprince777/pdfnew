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

/** Words shown in the tool and page; English unless an exam page sets its own (e.g. Malayalam). */
export interface ExamText {
    requirements: string;
    whatUploading: string;
    youWillGet: string;
    nameLabel: string;
    namePlaceholder: string;
    dateLabel: string;
    /** "Resize photo", "Resize signature". */
    resize: (label: string) => string;
    done: (size: string, dims: string) => string;
    tooSmall: (size: string, minKb: number) => string;
    tooLarge: (limit: string, size: string, dims: string) => string;
    item: string;
    officialRequirement: string;
    source: (label: string) => string;
    checked: (date: string) => string;
    howTo: string;
    moreTools: string;
    faq: string;
    moreToolLinks: [compressImage: string, image20: string, jpgPdf100: string, pdf200: string];
}

export const ENGLISH_TEXT: ExamText = {
    requirements: 'requirements',
    whatUploading: 'What are you uploading?',
    youWillGet: 'You will get:',
    nameLabel: 'Your name (printed on the photo)',
    namePlaceholder: 'Name as in your application',
    dateLabel: 'Date the photo was taken',
    resize: (label) => `Resize ${label.toLowerCase()}`,
    done: (size, dims) => `Done! ${size}, ${dims}: ready for the form.`,
    tooSmall: (size, minKb) => `Your file is ${size}, below the ${minKb} KB minimum. Scan or photograph the signature larger and sharper, then try again.`,
    tooLarge: (limit, size, dims) => `This picture could not go under ${limit} at ${dims}. The smallest version is ${size}.`,
    item: 'Item',
    officialRequirement: 'Official requirement',
    source: (label) => `Source: ${label}`,
    checked: (date) => `checked on ${date}. Rules can change, so confirm them in your notification before you apply.`,
    howTo: 'How to use this tool',
    moreTools: 'More tools for application forms',
    faq: 'Frequently asked questions',
    moreToolLinks: ['Compress image to any size in KB', 'Resize image to 20 KB', 'JPG to PDF under 100 KB', 'Compress PDF to 200 KB'],
};

export interface ExamSpec {
    name: string;
    path: string;
    title: string;
    subtitle: string;
    presets: ExamPreset[];
    source: { label: string; url: string; checked: string };
    /** Page language (wording comes from EXAM_TEXT); English when omitted. Only plain data here: the spec is passed to the browser. */
    lang?: 'en' | 'ml';
    /** The same page in another language (for hreflang links and a language switch). */
    alternate?: { path: string; lang: 'en' | 'ml'; label: string };
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

/** Malayalam wording for the Kerala PSC page (sizes and units stay in digits and English letters, as on the form). */
const MALAYALAM_TEXT: ExamText = {
    requirements: 'നിബന്ധനകൾ',
    whatUploading: 'എന്താണ് അപ്‌ലോഡ് ചെയ്യുന്നത്?',
    youWillGet: 'ലഭിക്കുന്നത്:',
    nameLabel: 'നിങ്ങളുടെ പേര് (ഫോട്ടോയിൽ പ്രിന്റ് ചെയ്യും)',
    namePlaceholder: 'അപേക്ഷയിലുള്ള അതേ പേര്',
    dateLabel: 'ഫോട്ടോ എടുത്ത തീയതി',
    resize: (label) => `${label} റീസൈസ് ചെയ്യുക`,
    done: (size, dims) => `തയ്യാർ! ${size}, ${dims}: ഫോമിൽ അപ്‌ലോഡ് ചെയ്യാം.`,
    tooSmall: (size, minKb) => `ഫയൽ ${size} മാത്രം, കുറഞ്ഞത് ${minKb} KB വേണം. കൂടുതൽ വ്യക്തമായി സ്കാൻ ചെയ്ത് വീണ്ടും ശ്രമിക്കുക.`,
    tooLarge: (limit, size, dims) => `${dims} വലുപ്പത്തിൽ ${limit}-ൽ താഴെ ആക്കാൻ കഴിഞ്ഞില്ല. ഏറ്റവും ചെറിയ ഫയൽ ${size} ആണ്.`,
    item: 'ഇനം',
    officialRequirement: 'ഔദ്യോഗിക നിബന്ധന',
    source: (label) => `ആധാരം: ${label}`,
    checked: (date) => `പരിശോധിച്ചത് ${date}. നിബന്ധനകൾ മാറാം; അപേക്ഷിക്കുന്നതിന് മുമ്പ് നിങ്ങളുടെ വിജ്ഞാപനത്തിൽ ഉറപ്പാക്കുക.`,
    howTo: 'എങ്ങനെ ഉപയോഗിക്കാം',
    moreTools: 'അപേക്ഷാ ഫോമുകൾക്കുള്ള മറ്റ് ടൂളുകൾ',
    faq: 'പതിവ് ചോദ്യങ്ങൾ',
    moreToolLinks: ['ഏത് KB വലുപ്പത്തിലേക്കും ചിത്രം ചെറുതാക്കാം', 'ചിത്രം 20 KB ആക്കാം', 'JPG-യെ 100 KB-യിൽ താഴെ PDF ആക്കാം', 'PDF 200 KB ആക്കാം'],
};

export const KERALA_PSC_ML: ExamSpec = {
    ...KERALA_PSC,
    name: 'കേരള PSC',
    path: '/kerala-psc-photo-resize-malayalam',
    title: 'കേരള PSC ഫോട്ടോയും ഒപ്പും റീസൈസ് ചെയ്യാം',
    subtitle: 'കേരള PSC വൺ ടൈം രജിസ്ട്രേഷനു (തുളസി) വേണ്ട കൃത്യമായ വലുപ്പത്തിൽ ഫോട്ടോയും ഒപ്പും തയ്യാറാക്കാം. നിങ്ങളുടെ ഫയലുകൾ എവിടേക്കും അപ്‌ലോഡ് ചെയ്യുന്നില്ല.',
    presets: [
        { ...KERALA_PSC.presets[0], label: 'ഫോട്ടോ', summary: '150 × 200 പിക്സൽ, JPG, 30 KB-യിൽ താഴെ; ഫോട്ടോയുടെ താഴെ നിങ്ങളുടെ പേരും ഫോട്ടോ എടുത്ത തീയതിയും.' },
        { ...KERALA_PSC.presets[1], label: 'ഒപ്പ്', summary: '150 × 100 പിക്സൽ, JPG, 30 KB-യിൽ താഴെ.' },
    ],
    source: { ...KERALA_PSC.source, label: 'കേരള PSC പൊതു വ്യവസ്ഥകൾ (General Conditions), ഖണ്ഡിക 7' },
    lang: 'ml',
    alternate: { path: KERALA_PSC.path, lang: 'en', label: 'Read this page in English' },
};

/** Wording for each page language. */
export const EXAM_TEXT: Record<'en' | 'ml', ExamText> = { en: ENGLISH_TEXT, ml: MALAYALAM_TEXT };

KERALA_PSC.alternate = { path: KERALA_PSC_ML.path, lang: 'ml', label: 'ഈ പേജ് മലയാളത്തിൽ വായിക്കാം' };
