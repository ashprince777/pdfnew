/**
 * Blog articles. Each targets real search demand in India (see docs or the OpenSEO project) and
 * links to the tool that solves the problem. Content is plain data so pages render on the server.
 */

export type Block =
    | { type: 'p'; text: string }
    | { type: 'h2'; text: string }
    | { type: 'ul' | 'ol'; items: string[] }
    | { type: 'table'; head: string[]; rows: string[][] }
    | { type: 'tip'; text: string }
    | { type: 'cta'; text: string; href: string; label: string };

export interface Article {
    slug: string;
    title: string;
    description: string;
    /** ISO date */
    published: string;
    readMinutes: number;
    /** Main tool the article leads to. */
    tool: { href: string; label: string };
    blocks: Block[];
    faq: { question: string; answer: string }[];
}

export const ARTICLES: Article[] = [
    {
        slug: 'aadhaar-pan-itr-pdf-password',
        title: 'Aadhaar, PAN, ITR & Bank Statement PDF Passwords: What to Type and How to Remove Them',
        description:
            'The password formats for e-Aadhaar, e-PAN, ITR-V, AIS and Form 26AS PDFs, why bank statements differ, and how to remove the password so you can print or upload the file.',
        published: '2026-10-25',
        readMinutes: 5,
        tool: { href: '/unlock-pdf', label: 'Remove PDF password' },
        blocks: [
            { type: 'p', text: 'Most official documents you download in India come as password-protected PDFs. The password is not something you set: it follows a fixed format based on your details. Here are the formats for the most common documents, and how to save a copy without the password once you have opened it.' },
            { type: 'h2', text: 'Password formats for common Indian documents' },
            {
                type: 'table',
                head: ['Document', 'Password format', 'Example'],
                rows: [
                    ['e-Aadhaar (UIDAI)', 'First 4 letters of your name in CAPITALS + year of birth (YYYY)', 'Name Suresh Kumar, born 1990 → SURE1990'],
                    ['e-PAN', 'Date of birth as DDMMYYYY (for companies, date of incorporation)', 'Born 5 March 1992 → 05031992'],
                    ['ITR-V / ITR acknowledgement', 'PAN in small letters + date of birth DDMMYYYY', 'abcde1234f05031992'],
                    ['AIS / TIS (Income Tax portal)', 'PAN in small letters + date of birth DDMMYYYY', 'abcde1234f05031992'],
                    ['Form 26AS (TRACES)', 'Date of birth as DDMMYYYY', '05031992'],
                ],
            },
            { type: 'tip', text: 'Use your name exactly as it is printed on the document, and type the letters in CAPITALS for e-Aadhaar and in small letters for the PAN part of ITR and AIS passwords. Passwords are case-sensitive.' },
            { type: 'h2', text: 'Bank statements, credit card bills and insurance PDFs' },
            { type: 'p', text: 'There is no single standard for banks. Each bank and card issuer chooses its own format, usually a combination of part of your name, your date of birth, the last digits of your mobile number or your customer ID. The exact format is almost always written in the email that brought the statement, often in small print at the bottom. If it is not there, check the “e-statement” section of your net-banking site.' },
            { type: 'h2', text: 'How to remove the password from the PDF' },
            { type: 'p', text: 'Typing the password every time is annoying, and some upload portals and printers cannot open protected files. Once you know the password, you can save an unlocked copy in under a minute:' },
            {
                type: 'ol',
                items: [
                    'Open the PDFAdore Unlock PDF tool on your phone or computer.',
                    'Select the protected PDF.',
                    'Type the password (in the format above) and click Unlock PDF.',
                    'Download the new copy. It opens without a password and can be printed or uploaded anywhere.',
                ],
            },
            { type: 'cta', text: 'Remove the password from your PDF now. It runs in your browser, so your Aadhaar or bank statement is never uploaded.', href: '/unlock-pdf', label: 'Open PDF Password Remover' },
            { type: 'p', text: 'Only remove passwords from your own documents or files you are allowed to change. You always need the correct password: the tool does not crack or guess passwords.' },
        ],
        faq: [
            { question: 'What is the password for e-Aadhaar PDF?', answer: 'The first four letters of your name in capital letters followed by your year of birth, for example SURE1990.' },
            { question: 'What is the password for e-PAN PDF?', answer: 'Your date of birth in DDMMYYYY format, for example 05031992. For companies and firms, it is the date of incorporation.' },
            { question: 'What is the ITR-V PDF password?', answer: 'Your PAN in lowercase letters followed by your date of birth in DDMMYYYY format, for example abcde1234f05031992.' },
            { question: 'Is it safe to unlock my Aadhaar PDF online?', answer: 'With PDFAdore, the file is unlocked inside your own browser and never uploaded to a server, so your Aadhaar details stay on your device.' },
        ],
    },
    {
        slug: 'reduce-pdf-size-for-government-forms',
        title: 'How to Reduce PDF Size to 100 KB or 200 KB for Government and Exam Forms',
        description:
            'A simple guide to making documents fit the file size limits on Indian government, exam and admission portals, without losing readability.',
        published: '2026-10-25',
        readMinutes: 5,
        tool: { href: '/compress-pdf-to-200kb', label: 'Compress PDF to 200 KB' },
        blocks: [
            { type: 'p', text: 'Online application forms for government jobs, entrance exams, scholarships and admissions often reject documents that are larger than a set limit, such as 100 KB or 200 KB. A phone scan of a certificate can easily be 2 to 5 MB, so it has to be compressed first.' },
            { type: 'h2', text: 'Step 1: Check the exact limit' },
            { type: 'p', text: 'Read the official notification or the upload page. It usually states the format (PDF or JPG), the maximum size and sometimes a minimum size. Limits differ between forms, and even between documents in the same form.' },
            { type: 'h2', text: 'Step 2: Compress the PDF to the size you need' },
            {
                type: 'ol',
                items: [
                    'Open PDFAdore Compress PDF and choose “Fit to a size”, or use one of the ready pages: 50 KB, 100 KB, 200 KB, 500 KB or 1 MB.',
                    'Select your PDF and click Compress PDF.',
                    'PDFAdore tries gentle compression first and only goes stronger if it must, so you get the best quality that still fits.',
                    'Download the file and check it opens and is readable before uploading.',
                ],
            },
            { type: 'cta', text: 'Reduce your PDF to 200 KB now. Free, no sign-up, and your document never leaves your phone or computer.', href: '/compress-pdf-to-200kb', label: 'Compress PDF to 200 KB' },
            { type: 'h2', text: 'If the PDF still will not fit' },
            {
                type: 'ul',
                items: [
                    'Remove pages the form does not need with Remove Pages.',
                    'Split a long document into parts with Split PDF and upload each part, if the form allows several files.',
                    'Rescan at a lower resolution: 150 to 200 DPI in black and white is enough for most certificates.',
                    'If you only have photos, use Scan to PDF with the “Document” look, which makes pages much smaller than colour photos.',
                ],
            },
            { type: 'h2', text: 'Tips for documents that get rejected' },
            {
                type: 'ul',
                items: [
                    'Make sure the file name has no special characters; some portals reject names with spaces or brackets.',
                    'Do not upload password-protected PDFs. Remove the password first with Unlock PDF.',
                    'If a minimum size is mentioned (for example at least 20 KB), avoid compressing far below it.',
                ],
            },
        ],
        faq: [
            { question: 'How can I reduce PDF size to 200 KB?', answer: 'Open PDFAdore Compress PDF to 200 KB, select your file and click Compress PDF. The result is under 200 KB whenever the document allows it.' },
            { question: 'Will compressing my certificate make it unreadable?', answer: 'Usually not. PDFAdore keeps as much quality as the limit allows. Very small limits for long documents may turn pages into images, which stay readable.' },
            { question: 'Can I do this on my phone?', answer: 'Yes. PDFAdore works in the browser on Android and iPhone, with no app to install.' },
        ],
    },
    {
        slug: 'how-to-remove-password-from-pdf',
        title: 'How to Remove a Password from a PDF (Phone and Computer)',
        description: 'Save a copy of a protected PDF without its password in four steps, on Android, iPhone, Windows or Mac, with a free PDF password remover.',
        published: '2026-10-25',
        readMinutes: 4,
        tool: { href: '/unlock-pdf', label: 'Unlock PDF' },
        blocks: [
            { type: 'p', text: 'Password-protected PDFs are secure, but they are a pain to share, print or upload to forms. If you know the password, you can create an unlocked copy that opens without asking for it.' },
            { type: 'h2', text: 'Remove a PDF password in 4 steps' },
            {
                type: 'ol',
                items: [
                    'Open PDFAdore PDF Password Remover (Unlock PDF) in any browser.',
                    'Select the protected PDF from your phone or computer.',
                    'Enter the password and click Unlock PDF.',
                    'Download the unlocked copy. The original file is not changed.',
                ],
            },
            { type: 'cta', text: 'Unlock your PDF for free. The file is processed on your device and never uploaded.', href: '/unlock-pdf', label: 'Open PDF Password Remover' },
            { type: 'h2', text: 'PDFs with printing or copying restrictions' },
            { type: 'p', text: 'Some PDFs open without a password but block printing, copying or editing. These “owner password” restrictions can be removed without knowing a password: just select the file in Unlock PDF and leave the password box empty.' },
            { type: 'h2', text: 'Do not know the password?' },
            { type: 'p', text: 'PDFAdore does not crack or guess passwords. For official documents the password usually follows a known format; see our guide to Aadhaar, PAN, ITR and bank statement PDF passwords. For anything else, ask the person or organisation that sent the file.' },
            { type: 'h2', text: 'Want to add a password instead?' },
            { type: 'p', text: 'Use Protect PDF to lock a document with strong AES-256 encryption before sending it by email or WhatsApp.' },
        ],
        faq: [
            { question: 'Can I remove a PDF password without knowing it?', answer: 'Only printing and copying restrictions can be removed without a password. To open a file that asks for a password, you need the correct password.' },
            { question: 'Is the online PDF password remover safe?', answer: 'PDFAdore unlocks the PDF in your own browser. The file is never uploaded, so nobody else can see it.' },
        ],
    },
    {
        slug: 'photo-to-pdf-on-phone',
        title: 'How to Convert Photos to PDF on Your Phone (Android and iPhone)',
        description: 'Turn photos of documents, notes or receipts into one clean PDF on your phone, for free and without installing an app.',
        published: '2026-10-25',
        readMinutes: 4,
        tool: { href: '/scan-to-pdf', label: 'Scan to PDF' },
        blocks: [
            { type: 'p', text: 'You do not need a scanner or a special app to make a PDF from photos. Your phone browser can do it in a minute, and the result looks like a proper scanned document.' },
            { type: 'h2', text: 'Option 1: Scan new pages with your camera' },
            {
                type: 'ol',
                items: [
                    'Open PDFAdore Scan to PDF on your phone and tap Open camera.',
                    'Hold the page flat, fill the frame and tap Capture page for each page.',
                    'Tap Done, keep the “Document” look for crisp black and white pages, and choose A4.',
                    'Tap Create PDF and download it.',
                ],
            },
            { type: 'cta', text: 'Scan documents into a PDF with your phone camera. Photos never leave your phone.', href: '/scan-to-pdf', label: 'Open Scan to PDF' },
            { type: 'h2', text: 'Option 2: Convert photos you already took' },
            {
                type: 'ol',
                items: [
                    'Open PDFAdore JPG to PDF.',
                    'Select the photos from your gallery (you can pick many at once).',
                    'Drag them into the right order and choose the page size.',
                    'Tap Convert to PDF and download the file.',
                ],
            },
            { type: 'h2', text: 'Tips for clear, small PDFs' },
            {
                type: 'ul',
                items: [
                    'Take photos in daylight and avoid shadows from your hand or phone.',
                    'Use the Document look for text pages; it makes files much smaller than colour photos.',
                    'If a form needs a small file, run the PDF through Compress PDF to 200 KB afterwards.',
                ],
            },
        ],
        faq: [
            { question: 'How do I convert a photo to PDF on Android?', answer: 'Open PDFAdore JPG to PDF in Chrome, select the photos, put them in order and tap Convert to PDF.' },
            { question: 'Do I need to install an app?', answer: 'No. Everything works in the phone browser, and the photos stay on your phone.' },
        ],
    },
    {
        slug: 'how-to-merge-pdf-files',
        title: 'How to Merge PDF Files into One (Free, No Upload)',
        description: 'Combine several PDFs into one document in the order you want, on phone or computer, without uploading your files.',
        published: '2026-10-25',
        readMinutes: 3,
        tool: { href: '/merge-pdf', label: 'Merge PDF' },
        blocks: [
            { type: 'p', text: 'Application forms, office paperwork and assignments often need several documents as one PDF. Merging them takes less than a minute.' },
            { type: 'h2', text: 'Merge PDFs in 4 steps' },
            {
                type: 'ol',
                items: [
                    'Open PDFAdore Merge PDF.',
                    'Select all the PDFs you want to combine (or add them one by one).',
                    'Drag the files, or use the arrows, to put them in the right order.',
                    'Click Merge PDF and download the combined file.',
                ],
            },
            { type: 'cta', text: 'Combine your PDFs now. Free, and the files are merged on your own device.', href: '/merge-pdf', label: 'Open Merge PDF' },
            { type: 'h2', text: 'Common questions while merging' },
            {
                type: 'ul',
                items: [
                    'A file shows “Password-protected”: remove the password first with Unlock PDF, then merge.',
                    'You want only some pages of a file: use Split PDF or Remove Pages first, then merge.',
                    'The merged file is too big for a form: compress it with Compress PDF to 200 KB.',
                    'You have photos, not PDFs: convert them with JPG to PDF first.',
                ],
            },
        ],
        faq: [
            { question: 'How many PDFs can I merge?', answer: 'Up to 10 files at a time for free, and up to 200 with Premium.' },
            { question: 'Are bookmarks and links kept?', answer: 'Page content, links and form fields are kept. Each file keeps its own pages in the order you choose.' },
        ],
    },
    {
        slug: 'how-to-split-pdf-pages',
        title: 'How to Split PDF Pages or Extract Specific Pages',
        description: 'Extract the pages you need from a PDF, split it into several files, or save every page separately, for free.',
        published: '2026-10-25',
        readMinutes: 3,
        tool: { href: '/split-pdf', label: 'Split PDF' },
        blocks: [
            { type: 'p', text: 'Sometimes you only need one page from a long PDF, such as a single mark sheet from a set, or you need to break a document into parts to fit an upload limit.' },
            { type: 'h2', text: 'Three ways to split a PDF' },
            {
                type: 'ul',
                items: [
                    'Every page: saves each page as its own PDF (downloaded together as a ZIP).',
                    'Extract pages: makes one new PDF with only the pages you list, for example 1-3, 5.',
                    'Split by ranges: makes one PDF per range, for example 1-4, 5-8, 9-12.',
                ],
            },
            {
                type: 'ol',
                items: ['Open PDFAdore Split PDF and select your file.', 'Choose one of the three modes and type the pages if needed.', 'Click Split PDF and download the result.'],
            },
            { type: 'cta', text: 'Split your PDF now. Free, private and works on mobile.', href: '/split-pdf', label: 'Open Split PDF' },
            { type: 'tip', text: 'To delete a few pages and keep the rest in one file, Remove Pages is quicker: tap the pages to remove and save.' },
        ],
        faq: [
            { question: 'How do I extract one page from a PDF?', answer: 'In Split PDF choose “Extract pages”, type the page number (for example 3) and click Split PDF.' },
            { question: 'Can I split a password-protected PDF?', answer: 'Remove the password first with Unlock PDF, then split the unlocked copy.' },
        ],
    },
    {
        slug: 'how-to-convert-pdf-to-word',
        title: 'How to Convert PDF to Word and Keep the Formatting',
        description: 'Turn a PDF into an editable Word document with its text, tables and layout, and what to do with scanned PDFs.',
        published: '2026-10-25',
        readMinutes: 4,
        tool: { href: '/pdf-to-word', label: 'PDF to Word' },
        blocks: [
            { type: 'p', text: 'Need to change a resume, an agreement or a report that you only have as a PDF? Converting it to Word (DOCX) lets you edit it in Microsoft Word, Google Docs or WPS Office.' },
            {
                type: 'ol',
                items: [
                    'Open PDFAdore PDF to Word.',
                    'Select your PDF.',
                    'Click Convert to Word and download the DOCX file.',
                    'Open it in Word or Google Docs and edit as normal.',
                ],
            },
            { type: 'cta', text: 'Convert your PDF to an editable Word file. Free, and the PDF never leaves your device.', href: '/pdf-to-word', label: 'Open PDF to Word' },
            { type: 'h2', text: 'Scanned PDFs and photos' },
            { type: 'p', text: 'A scanned PDF is a picture of text, so there are no words to convert. To edit a few lines of a scan, use Edit PDF, which recognises the text on scanned pages (OCR) and lets you change it directly.' },
            { type: 'h2', text: 'Only need small changes?' },
            { type: 'p', text: 'If you just want to fix a name, date or number, you do not need Word at all. Edit PDF lets you click on existing text and change it, and the original text is really removed from the file.' },
        ],
        faq: [
            { question: 'Is the formatting kept when converting PDF to Word?', answer: 'Text, paragraphs, tables and images are kept as closely as possible. Complex designs may need small touch-ups in Word.' },
            { question: 'Can I convert PDF to Word on my phone?', answer: 'Yes. PDFAdore works in the phone browser and the DOCX opens in the Word or Google Docs app.' },
        ],
    },
    {
        slug: 'translate-pdf-to-hindi',
        title: 'How to Translate a PDF to Hindi or English with AI',
        description: 'Translate the text of a PDF into Hindi, English, Tamil, Malayalam and other languages, and download the translation as Word.',
        published: '2026-10-25',
        readMinutes: 3,
        tool: { href: '/translate-pdf', label: 'Translate PDF' },
        blocks: [
            { type: 'p', text: 'Circulars, agreements, research papers and manuals are not always in the language you read best. PDFAdore Translate PDF uses AI to translate the text of your document into more than 20 languages, including Hindi, Bengali, Tamil, Telugu, Malayalam and English.' },
            {
                type: 'ol',
                items: [
                    'Create a free account (it includes 3 AI credits every month).',
                    'Open Translate PDF and select your PDF.',
                    'Choose the language, and the pages to translate if the document is long.',
                    'Click Translate, then copy the result or download it as a Word file.',
                ],
            },
            { type: 'cta', text: 'Translate your PDF into Hindi, English or 20+ other languages.', href: '/translate-pdf', label: 'Open Translate PDF' },
            { type: 'h2', text: 'Good to know' },
            {
                type: 'ul',
                items: [
                    'Only the text of the pages you choose is sent to the AI service; the PDF file itself stays on your device.',
                    'Translate a few pages at a time for long documents.',
                    'Scanned PDFs need OCR first: open them in Edit PDF to recognise the text.',
                    'AI translations are very good for understanding a document, but have important legal documents checked by a professional translator.',
                ],
            },
            { type: 'tip', text: 'Just need the main points? Summarize PDF gives you the key points, dates and amounts in the language you choose.' },
        ],
        faq: [
            { question: 'Can I translate a PDF from English to Hindi for free?', answer: 'Yes. Every free account includes 3 AI credits a month, and each translation uses one credit.' },
            { question: 'Does the translation keep the original layout?', answer: 'The translation keeps the page order, paragraphs and lists, and can be downloaded as a Word document. Images and the exact page design are not recreated.' },
        ],
    },
];

export const getArticle = (slug: string) => ARTICLES.find((a) => a.slug === slug);
